import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomMenu } from '../components/BottomMenu';
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
      id: string;
      username: string;
      full_name: string;
      avatar: string;
      is_online?: boolean;
      last_seen?: string;
    };
  }[];
}

interface Message {
  id: string;
  conversation_id: string;
  text: string;
  created_at: string;
  sender_id: string;
  receiver_id?: string;
  is_read: boolean;
  is_sending?: boolean;
  has_error?: boolean;
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read';
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
  const [isMutualFollower, setIsMutualFollower] = useState(false);

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [retryingMessages, setRetryingMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }
      setCurrentUserId(session.user.id);
      
      // Kullanıcıyı online olarak işaretle
      await supabase
        .from('profiles')
        .update({ 
          last_seen: new Date().toISOString(),
          is_online: true 
        })
        .eq('id', session.user.id);
      
      // Sayfa kapatıldığında offline yap
      const handleBeforeUnload = async () => {
        await supabase
          .from('profiles')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('id', session.user.id);
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Her 30 saniyede bir last_seen güncelle
      const heartbeat = setInterval(async () => {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', session.user.id);
      }, 30000);
      
      setIsInitialized(true);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        clearInterval(heartbeat);
      };
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
        .from('messages')
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

    // Yazma durumu aboneliği
    supabase
      .channel(`typing:${selectedConversation.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload;
        if (userId !== currentUserId) {
          setOtherUserTyping(isTyping);
        }
      })
      .subscribe();

    // Basitleştirilmiş realtime subscription
    const messagesChannel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
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
        table: 'messages',
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
        table: 'messages',
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
  



  
  // Instagram benzeri yazma durumu yönetimi
  const handleTyping = useCallback(() => {
    if (!selectedConversation || !currentUserId) return;
    
    // Yazma durumunu güncelle
    if (!isTyping) {
      setIsTyping(true);
      
      // Diğer kullanıcıya yazma durumunu bildir
      supabase
        .channel(`typing:${selectedConversation.id}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            userId: currentUserId, 
            isTyping: true,
            conversationId: selectedConversation.id
          }
        });
    }
    
    // Yazma durumunu sıfırlamak için zamanlayıcıyı temizle ve yeniden başlat
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // 2 saniye sonra yazma durumunu sıfırla
    const timeout = setTimeout(() => {
      setIsTyping(false);
      
      // Diğer kullanıcıya yazma durumunun bittiğini bildir
      supabase
        .channel(`typing:${selectedConversation.id}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            userId: currentUserId, 
            isTyping: false,
            conversationId: selectedConversation.id
          }
        });
    }, 2000);
    
    setTypingTimeout(timeout);
  }, [selectedConversation, currentUserId, isTyping, typingTimeout]);

  // Mesaj yeniden gönderme fonksiyonu
  const retryMessage = useCallback(async (message: Message) => {
    if (!selectedConversation || retryingMessages.has(message.id)) return;
    
    setRetryingMessages(prev => new Set([...prev, message.id]));
    
    // Mesajı yeniden gönderme durumuna getir
    setMessages(prev => prev.map(msg => 
      msg.id === message.id 
        ? { ...msg, is_sending: true, has_error: false, delivery_status: 'sending' }
        : msg
    ));
    
    try {
      const newMessage = await sendMessage(selectedConversation.id, message.text);
      
      if (newMessage) {
        // Eski mesajı kaldır, yeni mesajı ekle
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { 
                ...newMessage, 
                delivery_status: 'sent'
              }
            : msg
        ));
        
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, delivery_status: 'delivered' }
              : msg
          ));
        }, 1000);
      }
    } catch (error) {
      console.error('Mesaj yeniden gönderilirken hata:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, is_sending: false, has_error: true }
          : msg
      ));
    } finally {
      setRetryingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(message.id);
        return newSet;
      });
    }
  }, [selectedConversation, retryingMessages]);

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

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newMessage.trim() || !currentUserId) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    setNewMessage('');
    
    // Optimistic update - Instagram benzeri anında görünüm
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: selectedConversation.id,
      text: messageText,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      receiver_id: getOtherParticipant(selectedConversation)?.id || '',
      is_read: false,
      is_sending: true,
      delivery_status: 'sending'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();
    
    // Yazma durumunu sıfırla
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setIsTyping(false);
    }
    
    try {
      // Mesaj gönder
      const message = await sendMessage(selectedConversation.id, messageText);
      
      if (message) {
        // Başarılı gönderim - durumu güncelle
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { 
                ...message, 
                is_sending: false, 
                delivery_status: 'sent',
                has_error: false 
              }
            : msg
        ));
        
        // Kısa süre sonra 'delivered' durumuna geç
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, delivery_status: 'delivered' }
              : msg
          ));
        }, 1000);
        
        scrollToBottom();
      } else {
        throw new Error('Mesaj gönderilemedi');
      }
      
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      
      // Hata durumunda retry seçeneği sun
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { 
              ...msg, 
              is_sending: false, 
              has_error: true,
              delivery_status: 'sending'
            }
          : msg
      ));
    }
  }, [selectedConversation, newMessage, currentUserId, typingTimeout]);

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
      {/* Mobilde Header'ı gizle, sadece desktop'ta göster */}
      <div className="hidden md:block">
        <Header />
      </div>
      {error && (
        <div className="fixed top-0 md:top-[95px] left-0 right-0 bg-red-50 p-4 flex items-center justify-center gap-2 text-red-600 z-50">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      <div className="h-screen md:h-[calc(100vh-10px)] bg-gray-100 pt-0 pb-0 md:pt-[10px] md:pb-8">
        <div className="h-full max-w-7xl mx-auto md:px-4">
          <div className="bg-white h-full md:rounded-lg md:shadow-sm overflow-hidden">
            <div className="h-full grid md:grid-cols-12 md:divide-x">
              {/* Conversations List */}
              <div className={`col-span-12 md:col-span-4 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'} overflow-hidden`}>
                <div className="sticky top-0 bg-white z-10 border-b">
                  {/* Mobil için Instagram tarzı header */}
                  <div className="flex items-center justify-between p-4 md:p-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl md:text-xl font-bold">Mesajlar</h2>
                    </div>
                    <button 
                      onClick={() => setShowFollowingSearch(true)}
                      className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                  </div>
                  <div className="relative mx-4 mb-4">
                    <input
                      type="text"
                      disabled={!isMutualFollower}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowFollowingSearch(true);
                      }}
                      onFocus={() => setShowFollowingSearch(true)}
                      placeholder={isMutualFollower ? "Takip ettikleriniz arasında arayın..." : "Mesajlaşmak için karşılıklı takipleşmeniz gerekiyor"}
                      className="w-full pl-10 pr-3 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
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
                          onClick={() => setSelectedConversation(conversation)}
                          className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                            selectedConversation?.id === conversation.id ? 'bg-gray-50' : ''
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={otherUser.avatar}
                              alt={otherUser.full_name}
                              loading="lazy"
                              decoding="async"
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            {otherUser.is_online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-base font-semibold truncate">{otherUser.full_name}</h3>
                              {conversation.last_message_at && (
                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                  {formatDate(conversation.last_message_at)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message_text || 'Henüz mesaj yok'}
                            </p>
                          </div>
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
                    {/* Instagram tarzı Chat Header */}
                    <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => setSelectedConversation(null)}
                          className="md:hidden p-1 text-gray-600 hover:text-gray-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </button>
                        <div className="relative">
                          <img
                            src={getOtherParticipant(selectedConversation)?.avatar}
                            alt={getOtherParticipant(selectedConversation)?.full_name}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {getOtherParticipant(selectedConversation)?.is_online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">
                            {getOtherParticipant(selectedConversation)?.full_name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {otherUserTyping ? (
                              <span className="text-green-500">yazıyor...</span>
                            ) : getOtherParticipant(selectedConversation)?.is_online ? (
                              <span className="text-green-500">aktif</span>
                            ) : getOtherParticipant(selectedConversation)?.last_seen ? (
                              <span>
                                {(() => {
                                  const lastSeen = new Date(getOtherParticipant(selectedConversation)?.last_seen!);
                                  const now = new Date();
                                  const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
                                  
                                  if (diffInMinutes < 1) return 'az önce aktifti';
                                  if (diffInMinutes < 60) return `${diffInMinutes} dakika önce aktifti`;
                                  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} saat önce aktifti`;
                                  return `${Math.floor(diffInMinutes / 1440)} gün önce aktifti`;
                                })()}
                              </span>
                            ) : (
                              `@${getOtherParticipant(selectedConversation)?.username}`
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </button>
                        <button 
                          className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className={`flex-1 ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-y-hidden'} p-4 bg-gray-50 pb-20 md:pb-4`} id="messages-container">
                      {isLoadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                        </div>
                      ) : messages.length > 0 ? (
                        <div className="space-y-4 min-h-full">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex group ${
                                message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 relative ${
                                  message.sender_id === currentUserId
                                    ? message.has_error 
                                      ? 'bg-red-500 text-white rounded-br-none shadow-sm'
                                      : 'bg-orange-500 text-white rounded-br-none shadow-sm'
                                    : 'bg-gray-100 shadow-sm'
                                } ${message.is_sending ? 'opacity-70' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p>{message.text}</p>
                                    <div className={`text-xs mt-1 flex items-center ${
                                      message.sender_id === currentUserId
                                        ? message.has_error ? 'text-red-100' : 'text-orange-100'
                                        : 'text-gray-500'
                                    }`}>
                                      <span>{formatDate(message.created_at)}</span>
                                      {message.sender_id === currentUserId && (
                                        <span className="ml-2 flex items-center space-x-1">
                                          {message.is_sending ? (
                                            <span className="inline-block w-3 h-3 rounded-full border-2 border-orange-100 border-t-transparent animate-spin"></span>
                                          ) : message.has_error ? (
                                            <button
                                              onClick={() => retryMessage(message)}
                                              className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30 transition-colors"
                                              disabled={retryingMessages.has(message.id)}
                                            >
                                              {retryingMessages.has(message.id) ? '...' : 'Tekrar'}
                                            </button>
                                          ) : (
                                            <span title={message.delivery_status === 'delivered' && message.is_read ? 'Okundu' : message.delivery_status === 'delivered' ? 'İletildi' : 'Gönderildi'}>
                                              {message.delivery_status === 'delivered' && message.is_read ? (
                                                <span className="text-blue-200">✓✓</span>
                                              ) : message.delivery_status === 'delivered' ? (
                                                <span className="text-white">✓✓</span>
                                              ) : message.delivery_status === 'sent' ? (
                                                <span className="text-white">✓</span>
                                              ) : null}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {message.sender_id === currentUserId && !message.is_sending && !message.has_error && (
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
                                {message.has_error && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">!</span>
                                  </div>
                                )}
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
                      {otherUserTyping && (
                        <div className="flex justify-start mb-4">
                          <div className="bg-gray-200 rounded-lg px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-xs text-gray-500">yazıyor...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instagram tarzı Message Input */}
                    <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t bg-white sticky bottom-0 md:bottom-0 left-0 right-0 z-10 mb-0 md:mb-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
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
                            placeholder="Mesaj..."
                            className="w-full px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 border-none text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className={`p-2.5 rounded-full transition-colors ${
                            newMessage.trim() 
                              ? 'bg-orange-500 text-white hover:bg-orange-600' 
                              : 'text-gray-400'
                          }`}
                        >
                          <Send size={18} />
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
      {/* Mobilde BottomMenu'yu sadece conversation listesinde göster */}
      <div className={`${selectedConversation ? 'hidden' : 'block'} md:block`}>
        <BottomMenu />
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
