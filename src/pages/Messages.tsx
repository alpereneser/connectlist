import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Header/BottomMenu global olarak App içinde render ediliyor
import { Send, Search, Trash2, AlertCircle } from 'lucide-react';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { getFollowing, startConversation, sendMessage, deleteMessage, markMessagesAsRead, checkMutualFollow } from '../lib/api';

interface LocationState {
  userId?: string;
}

interface Conversation {
  id: string;
  last_message_text: string;
  last_message_at: string;
  participants: {
    user_id: string;
    profiles: {
      username: string;
      full_name: string;
      avatar: string;
    };
  }[];
}

interface Message {
  id: string;
  conversation_id: string;
  text: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
  is_sending?: boolean; // Mesaj gönderilme durumunu izlemek için
  has_error?: boolean; // Mesaj gönderilirken hata oluştu mu?
}

// Takip edilen kullanıcı formatı (UI'da kullanmak için)
interface FormattedUser {
  id: string;
  username: string;
  full_name: string;
  avatar: string;
}

export function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<FormattedUser[]>([]);
  const [showFollowingSearch, setShowFollowingSearch] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMutualFollower, setIsMutualFollower] = useState(true); // Arama için varsayılan olarak true

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }
      setCurrentUserId(session.user.id);
      
      setIsInitialized(true);
    };

    fetchCurrentUser();
  }, [navigate, location.state]);

  useEffect(() => {
    const initializeConversation = async () => {
      const state = location.state as LocationState;
      if (state?.userId && isInitialized) {
        // Karşılıklı takipleşme kontrolü
        const isMutual = await checkMutualFollow(state.userId);
        setIsMutualFollower(isMutual);
        
        if (!isMutual) {
          return;
        }
        
        // İşlem başlıyor
        try {
          const conversationId = await startConversation(state.userId);
          const { data: conversation } = await supabase
            .from('conversations')
            .select(`
              *,
              participants:conversation_participants(
                user_id,
                profiles(username, full_name, avatar)
              )
            `)
            .eq('id', conversationId)
            .single();

          if (conversation) {
            setSelectedConversation(conversation);
          }
        } catch (error) {
          console.error('Error starting conversation:', error);
          if (error instanceof Error) {
            if (error.message.includes('must follow each other')) {
              setError('Mesajlaşmak için karşılıklı takipleşmeniz gerekiyor');
            } else {
              alert('Bir hata oluştu, lütfen tekrar deneyin');
            }
          }
        }
      }
    };

    initializeConversation();
  }, [isInitialized, location.state]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUserId) return;
      setIsLoadingConversations(true);
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user_id,
            profiles (
              username,
              full_name,
              avatar
            )
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Filter conversations to only show those where the current user is a participant
      const userConversations = data.filter(conversation => 
        conversation.participants.some((p: {user_id: string}) => p.user_id === currentUserId)
      );
      
      setConversations(userConversations);
      setIsLoadingConversations(false);
    };

    fetchConversations();

    // Realtime subscription for new conversations
    const conversationsSubscription = supabase
      .channel('conversations-channel')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('Conversation updated:', payload);
        // Güncellenen konuşmayı bul ve güncelle
        const updatedConversation = payload.new as Conversation;
        setConversations(prev => prev.map(conv => 
          conv.id === updatedConversation.id ? {...conv, ...updatedConversation} : conv
        ));
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('New conversation:', payload);
        // Yeni konuşma eklenince tüm konuşmaları yeniden yükle
        fetchConversations();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        console.log('Conversation deleted:', payload);
        // Silinen konuşmayı kaldır
        const deletedId = payload.old.id;
        setConversations(prev => prev.filter(conv => conv.id !== deletedId));
        
        // Eğer seçili konuşma silindiyse, seçimi kaldır
        if (selectedConversation?.id === deletedId) {
          setSelectedConversation(null);
          setMessages([]);
        }
      })
      .subscribe((status) => {
        console.log('Conversations subscription status:', status);
      });

    return () => {
      conversationsSubscription.unsubscribe();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]); // Konuşma seçili değilse mesajları temizle
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    let isMounted = true; // Bileşen unmount edildiğinde state güncellemesini engellemek için

    const fetchInitialMessages = async () => {
      const { data, error } = await supabase
        .from('decrypted_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error('Error fetching messages:', error);
        setIsLoadingMessages(false);
        return;
      }

      setMessages(data);
      setIsLoadingMessages(false);
      scrollToBottom();

      // Okunmamış mesajları okundu olarak işaretle
      const unreadMessageIds = data
        .filter(msg => !msg.is_read && msg.sender_id !== currentUserId)
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        try {
          await markMessagesAsRead(selectedConversation.id);
          if (isMounted) {
            setMessages(prevMessages =>
              prevMessages.map(msg =>
                unreadMessageIds.includes(msg.id)
                  ? { ...msg, is_read: true }
                  : msg
              )
            );
            
            // Header'a mesajların okunduğunu bildir
            await supabase
              .channel('public:messages_read')
              .send({
                type: 'broadcast',
                event: 'messages_read',
                payload: { conversationId: selectedConversation.id, userId: currentUserId }
              });
          }
        } catch (readError) {
          console.error('Error marking messages as read:', readError);
        }
      }
    };

    fetchInitialMessages();

    // Basitleştirilmiş realtime subscription
    const messagesChannel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'decrypted_messages',
        filter: `conversation_id=eq.${selectedConversation.id}`
      }, (payload) => {
        console.log('Yeni mesaj geldi:', payload);
        if (!isMounted) return;
        
          const newMessage = payload.new as Message;
          
        // Mesajı listeye ekle
          setMessages(prevMessages => {
          // Aynı mesajın tekrar eklenmesini önle
          const exists = prevMessages.some(msg => msg.id === newMessage.id);
          if (exists) return prevMessages;
          
          const updatedMessages = [...prevMessages, newMessage];

          // Eğer mesaj karşı taraftan geldiyse otomatik olarak okundu işaretle
          if (newMessage.sender_id !== currentUserId) {
            setTimeout(async () => {
              try {
                await markMessagesAsRead(selectedConversation.id);
                setMessages(prev => prev.map(msg => 
                  msg.id === newMessage.id ? { ...msg, is_read: true } : msg
                ));
                
                // Header'a mesajların okunduğunu bildir
                await supabase
                  .channel('public:messages_read')
                  .send({
                    type: 'broadcast',
                    event: 'messages_read',
                    payload: { conversationId: selectedConversation.id, userId: currentUserId }
                  });
              } catch (error) {
                console.error('Error marking message as read:', error);
              }
            }, 100);
          }
          
          return updatedMessages;
        });
        
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'decrypted_messages',
        filter: `conversation_id=eq.${selectedConversation.id}`
      }, (payload) => {
        if (!isMounted) return;
        
          const updatedMessage = payload.new as Message;
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
            )
          );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'decrypted_messages',
        filter: `conversation_id=eq.${selectedConversation.id}`
      }, (payload) => {
        if (!isMounted) return;
        
        const deletedMessage = payload.old as Partial<Message>;
          if (deletedMessage.id) {
            setMessages(prevMessages => 
              prevMessages.filter(msg => msg.id !== deletedMessage.id)
            );
        }
      })
      .subscribe((status) => {
        console.log(`Messages subscription status: ${status}`);
      });

    return () => {
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
      isMounted = false;
    };
  }, [selectedConversation, currentUserId]);

  // Mesajların en altına kaydırma fonksiyonu
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  // Mesajları yenileme fonksiyonu
  const refreshMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      const { data, error } = await supabase
        .from('decrypted_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Mesajlar yenilenirken hata:', error);
        return;
      }

      if (data) {
        setMessages(data);
        
        // Okunmamış mesajları okundu olarak işaretle
        const unreadMessageIds = data
          .filter(msg => !msg.is_read && msg.sender_id !== currentUserId)
          .map(msg => msg.id);

        if (unreadMessageIds.length > 0) {
          await markMessagesAsRead(selectedConversation.id);
          
          // Header'a mesajların okunduğunu bildir
          await supabase
            .channel('public:messages_read')
            .send({
              type: 'broadcast',
              event: 'messages_read',
              payload: { conversationId: selectedConversation.id, userId: currentUserId }
            });
        }
        
        // Mesajlar yüklendikten sonra aşağı kaydır
        scrollToBottom();
      }
    } catch (error) {
      console.error('Mesajlar yenilenirken hata:', error);
    }
  };
  
  // Yazma durumunu işle
  const handleTyping = () => {
    if (!selectedConversation) return;
    
    // Yazma durumunu güncelle
    if (!isTyping) {
      setIsTyping(true);
    }
    
    // Yazma durumunu sıfırlamak için zamanlayıcıyı temizle ve yeniden başlat
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // 2 saniye sonra yazma durumunu sıfırla
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!currentUserId) return;
      try {
        const followingUsers = await getFollowing(currentUserId);
        // Tip uyumluluğunu sağlamak için dönüşüm yapıyoruz
        if (Array.isArray(followingUsers)) {
          const formattedUsers = followingUsers.map((user: any) => ({
            id: user.id || '',
            username: user.username || '',
            full_name: user.full_name || '',
            avatar: user.avatar || ''
          }));
          setFollowing(formattedUsers);
        }
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };

    fetchFollowing();
  }, [currentUserId]);

  const filteredFollowing = following.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConversation = async (userId: string, closeSearch = true) => {
    try {
      const conversationId = await startConversation(userId);
      
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user_id,
            profiles(username, full_name, avatar)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        throw new Error('Konuşma bulunamadı');
      }

      setSelectedConversation(conversation);

      if (closeSearch) setShowFollowingSearch(false);
      setSearchQuery('');
      setError(null);
      
      // URL'deki state'i temizle
      navigate('/messages', { replace: true });
    } catch (error: unknown) {
      console.error('Error starting conversation:', error);
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newMessage.trim() || !currentUserId) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      // Optimistic update - geçici mesaj ekle
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: selectedConversation.id,
        text: messageText,
        created_at: new Date().toISOString(),
        sender_id: currentUserId,
        is_read: false,
        is_sending: true
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();
      
      // Yazma durumunu sıfırla
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setIsTyping(false);
      }
      
      // Mesaj gönder
      const message = await sendMessage(selectedConversation.id, messageText);
      
      if (message) {
        // Optimistic update'i gerçek mesajla değiştir
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...message, is_sending: false }
            : msg
        ));
        
        scrollToBottom();
      } else {
        // Hata durumunda geçici mesajı kaldır
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        throw new Error('Mesaj gönderilemedi');
      }
      
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      
      // Hata durumunda optimistic update'i temizle
      setMessages(prev => prev.map(msg => 
        msg.is_sending ? { ...msg, is_sending: false, has_error: true } : msg
      ));
      
      alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.user_id !== currentUserId)?.profiles;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Dün';
    } else if (days < 7) {
      return date.toLocaleDateString('tr-TR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  return (
    <>
      {error && (
        <div
          className="fixed left-0 right-0 bg-red-50 p-4 flex items-center justify-center gap-2 text-red-600 z-50"
          style={{ top: 'calc(var(--safe-area-inset-top) + var(--header-height))' }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      <div className="content-height-no-subheader md:content-height-no-subheader bg-gray-100">
        <div className="h-full max-w-7xl mx-auto md:px-4">
          <div className="bg-white h-full md:rounded-lg md:shadow-sm overflow-hidden">
            <div className="h-full grid md:grid-cols-12 md:divide-x overflow-hidden">
              {/* Conversations List */}
              <div className={`col-span-12 md:col-span-4 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'} overflow-hidden`}>
                <div className="sticky top-0 bg-white z-10 border-b shadow-sm">
                  <div className="flex items-center justify-between p-4">
                    <h2 className="text-xl font-bold">Mesajlar</h2>
                    <button 
                      onClick={() => setShowFollowingSearch(true)}
                      className="flex items-center gap-2 text-orange-500 hover:text-orange-600 text-sm font-medium"
                    >
                      <Search size={16} />
                      Yeni Mesaj
                    </button>
                  </div>
                  <div className="relative mt-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowFollowingSearch(true);
                      }}
                      onFocus={() => setShowFollowingSearch(true)}
                      placeholder="Takip ettikleriniz arasında arayın..."
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    
                    {/* Arama Sonuçları */}
                    {showFollowingSearch && searchQuery && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border max-h-64 overflow-y-auto">
                        {filteredFollowing.length > 0 ? (
                          filteredFollowing.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleStartConversation(user.id)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50"
                            >
                              <img
                                src={user.avatar}
                                alt={user.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="text-left">
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-sm text-gray-500">@{user.username}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            Sonuç bulunamadı
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {isLoadingConversations ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                    </div>
                  ) : conversations.length > 0 ? (
                    conversations.map((conversation) => {
                      const otherUser = getOtherParticipant(conversation);
                      if (!otherUser) return null;

                      return (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              navigate(`/messages/${conversation.id}`);
                            } else {
                              setSelectedConversation(conversation);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                            selectedConversation?.id === conversation.id ? 'bg-gray-50' : ''
                          }`}
                        >
                          <img
                            src={otherUser.avatar}
                            alt={otherUser.full_name}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 text-left min-w-0">
                            <h3 className="text-sm font-medium truncate">{otherUser.full_name}</h3>
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message_text ? 
                                (conversation.last_message_text.length > 30 ? 
                                  conversation.last_message_text.substring(0, 30) + '...' : 
                                  conversation.last_message_text
                                ) : 'Henüz mesaj yok'
                              }
                            </p>
                          </div>
                          {conversation.last_message_at && (
                            <span className="text-xs text-gray-400">
                              {formatDate(conversation.last_message_at)}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Henüz hiç mesajınız yok
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} col-span-12 md:col-span-8 flex-col h-full overflow-hidden`}>
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-3">
                        <img
                          src={getOtherParticipant(selectedConversation)?.avatar}
                          alt={getOtherParticipant(selectedConversation)?.full_name}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {getOtherParticipant(selectedConversation)?.full_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            @{getOtherParticipant(selectedConversation)?.username}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setConversationToDelete(selectedConversation.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-gray-600 hover:text-red-500 rounded-full hover:bg-gray-100"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {/* Messages */}
                    <div className={`flex-1 ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-y-hidden'} p-4 bg-gray-50`} id="messages-container">
                      {isLoadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                        </div>
                      ) : messages.length > 0 ? (
                        <div className="space-y-4 min-h-full">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 break-words overflow-hidden ${
                                  message.sender_id === currentUserId
                                    ? 'bg-orange-500 text-white rounded-br-none shadow-sm'
                                    : 'bg-gray-100 shadow-sm'
                                } ${message.is_sending ? 'opacity-70' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="break-words whitespace-pre-wrap">{message.text}</p>
                                    <div className={`text-xs mt-1 flex items-center ${
                                      message.sender_id === currentUserId
                                        ? 'text-orange-100'
                                        : 'text-gray-500'
                                    }`}>
                                      <span>{formatDate(message.created_at)}</span>
                                      {message.sender_id === currentUserId && (
                                        <span className="ml-2">
                                          {message.is_sending ? (
                                            <span className="inline-block w-3 h-3 rounded-full border-2 border-orange-100 border-t-transparent animate-spin"></span>
                                          ) : message.is_read ? (
                                            <span title="Okundu">✓✓</span>
                                          ) : (
                                            <span title="İletildi">✓</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {message.sender_id === currentUserId && !message.is_sending && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await deleteMessage(message.id);
                                          setMessages(messages.filter(m => m.id !== message.id));
                                          
                                          // Header'a mesajların güncellendiğini bildir
                                          await supabase
                                            .channel('public:messages_read')
                                            .send({
                                              type: 'broadcast',
                                              event: 'messages_read',
                                              payload: { conversationId: selectedConversation.id, userId: currentUserId }
                                            });
                                        } catch (error) {
                                          console.error('Error deleting message:', error);
                                          alert('Mesaj silinirken bir hata oluştu');
                                        }
                                      }}
                                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded ${
                                        message.sender_id === currentUserId
                                          ? 'text-orange-100 hover:text-white'
                                          : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Henüz mesaj yok
                        </div>
                      )}
                      {isTyping && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <form onSubmit={handleSendMessage} className="p-2 md:p-4 border-t bg-white sticky bottom-0 left-0 right-0 z-10 shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            // Yazıyor durumunu güncelle
                            handleTyping();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                          placeholder="Bir mesaj yazın..."
                          autoFocus
                          className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 border-none"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="p-2 text-orange-500 hover:text-orange-600 disabled:opacity-50 disabled:hover:text-orange-500 flex-shrink-0"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Bir sohbet seçin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-2">Konuşmayı Sil</h2>
              <p className="text-gray-600 text-sm mb-6">
                Bu konuşmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConversationToDelete(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    if (!conversationToDelete) return;
                    
                    try {
                      await supabase
                        .from('conversation_participants')
                        .delete()
                        .eq('conversation_id', conversationToDelete)
                        .eq('user_id', currentUserId);
                      
                      setSelectedConversation(null);
                      setConversations(conversations.filter(c => c.id !== conversationToDelete));
                      setShowDeleteConfirm(false);
                      setConversationToDelete(null);
                    } catch (error) {
                      console.error('Error deleting conversation:', error);
                      alert('Konuşma silinirken bir hata oluştu');
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Varsayılan dışa aktarım
export default Messages;
