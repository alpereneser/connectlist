import { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  unread_count?: number;
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

interface ContactSuggestion extends FormattedUser {
  conversationId?: string;
  source: 'conversation' | 'following';
}

export function Messages() {
  const { t } = useTranslation();
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

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobileLayout(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const containerStyle: CSSProperties = isMobileLayout
    ? {
        paddingTop: 'calc(var(--safe-area-inset-top) + var(--header-height))',
        paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))',
        height: '100vh',
      }
    : {
        paddingTop: 'calc(var(--safe-area-inset-top) + var(--header-height) + 1.5rem)',
        paddingBottom: 'calc(var(--safe-area-inset-bottom) + 1.5rem)',
        height: 'calc(100vh - var(--safe-area-inset-top) - var(--header-height) - 3rem)',
        minHeight: 'calc(100vh - var(--safe-area-inset-top) - var(--header-height) - 3rem)',
      };

  const errorBannerStyle: CSSProperties = {
    top: isMobileLayout
      ? 'var(--safe-area-inset-top)'
      : 'calc(var(--safe-area-inset-top) + var(--header-height))',
  };
  const mobileBottomInset = 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))';
  const mobileListPadding = `calc(${mobileBottomInset} + 96px)`;
  const mobileMessagesPadding = `calc(${mobileBottomInset} + 132px)`;
  const mobileInputPadding = `calc(${mobileBottomInset} + 12px)`;

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
      
      // Remove duplicate conversations - keep the most recent one for each user pair
      const uniqueConversations = userConversations.filter((conversation, index, self) => {
        // Get the other participant
        const otherParticipant = conversation.participants.find((p: { user_id: string; profiles: { username: string; full_name: string; avatar: string; }; }) => p.user_id !== currentUserId);
        if (!otherParticipant) return false;
        
        // Check if this is the most recent conversation with this user
        const mostRecentIndex = self.findIndex(conv => {
          const otherUser = conv.participants.find((p: { user_id: string; profiles: { username: string; full_name: string; avatar: string; }; }) => p.user_id !== currentUserId);
          return otherUser?.user_id === otherParticipant.user_id;
        });
        
        return index === mostRecentIndex;
      });

      // Her conversation için unread count'u hesapla
      const conversationsWithUnreadCount = await Promise.all(
        uniqueConversations.map(async (conversation) => {
          try {
            const { count } = await supabase
              .from('decrypted_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversation.id)
              .eq('is_read', false)
              .neq('sender_id', currentUserId);
            
            return {
              ...conversation,
              unread_count: count || 0
            };
          } catch (error) {
            console.error('Error counting unread messages:', error);
            return {
              ...conversation,
              unread_count: 0
            };
          }
        })
      );
      
      setConversations(conversationsWithUnreadCount);
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

  const conversationContacts = useMemo(() => {
    if (!currentUserId) return [];

    const seen = new Set<string>();
    const contacts: ContactSuggestion[] = [];

    conversations.forEach(conversation => {
      const otherParticipant = conversation.participants.find((p: { user_id: string; profiles: { username: string; full_name: string; avatar: string; }; }) => p.user_id !== currentUserId);
      if (otherParticipant && !seen.has(otherParticipant.user_id) && otherParticipant.profiles) {
        seen.add(otherParticipant.user_id);
        contacts.push({
          id: otherParticipant.user_id,
          username: otherParticipant.profiles.username,
          full_name: otherParticipant.profiles.full_name,
          avatar: otherParticipant.profiles.avatar,
          conversationId: conversation.id,
          source: 'conversation'
        });
      }
    });

    return contacts;
  }, [conversations, currentUserId]);

  const suggestions = useMemo(() => {
    const map = new Map<string, ContactSuggestion>();

    conversationContacts.forEach(contact => {
      map.set(contact.id, contact);
    });

    following.forEach(user => {
      if (!map.has(user.id)) {
        map.set(user.id, { ...user, source: 'following' });
      }
    });

    return Array.from(map.values());
  }, [conversationContacts, following]);

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return suggestions;
    }

    return suggestions.filter(user =>
      user.full_name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  }, [suggestions, searchQuery]);


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

  const handleSuggestionSelect = (suggestion: ContactSuggestion) => {
    setShowFollowingSearch(false);
    setSearchQuery('');

    if (suggestion.conversationId) {
      const existingConversation = conversations.find(conversation => conversation.id === suggestion.conversationId);
      if (existingConversation) {
        if (window.innerWidth < 768) {
          navigate(`/messages/${suggestion.conversationId}`);
        } else {
          setSelectedConversation(existingConversation);
        }
        return;
      }
    }

    void handleStartConversation(suggestion.id, false);
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
            ? { ...message, conversation_id: selectedConversation.id, is_sending: false }
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
          style={errorBannerStyle}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      <div
        className={['bg-white', isMobileLayout ? 'fixed inset-0 z-40 flex flex-col' : 'fixed inset-0', 'md:static md:inset-auto'].join(' ')}
        style={containerStyle}
      >
         <div className="flex-1 h-full max-w-7xl mx-auto w-full md:px-6 lg:px-8">
           <div className="h-full flex flex-col md:flex-row overflow-hidden md:rounded-lg md:shadow-sm md:border md:border-gray-200">
            <div className="h-full flex flex-col md:flex-row w-full overflow-hidden">
              {/* Conversations List */}
              <div className={`w-full md:w-80 lg:w-96 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'} overflow-hidden border-r border-gray-200 bg-white`}>
                <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
                  <div className="flex items-center justify-between p-4 md:p-6">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('common.messages.title')}</h1>
                    <button 
                      onClick={() => setShowFollowingSearch(true)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                  <div className="relative px-4 md:px-6 pb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowFollowingSearch(true);
                      }}
                      onFocus={() => setShowFollowingSearch(true)}
                      placeholder="Ara..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white border border-transparent focus:border-orange-500 transition-all"
                    />
                    <Search className="absolute left-8 md:left-10 top-3.5 h-5 w-5 text-gray-400" />
                    
                    {/* Arama Sonuçları */}
                    {showFollowingSearch && (
                      <div className="absolute z-50 left-4 md:left-6 right-4 md:right-6 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-72 overflow-y-auto">
                        {filteredSuggestions.length > 0 ? (
                          filteredSuggestions.map((suggestion) => {
                            const conversationPreview = suggestion.conversationId
                              ? conversations.find(conv => conv.id === suggestion.conversationId)?.last_message_text
                              : null;
                            const suggestionKey = suggestion.id + '-' + (suggestion.conversationId ?? "new");

                            return (
                              <button
                                key={suggestionKey}
                                onClick={() => handleSuggestionSelect(suggestion)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl text-left"
                              >
                                <img
                                  src={suggestion.avatar}
                                  alt={suggestion.full_name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">{suggestion.full_name}</p>
                                  <p className="text-sm text-gray-500 truncate">@{suggestion.username}</p>
                                  {conversationPreview && (
                                    <p className="text-xs text-gray-400 mt-1 truncate">{conversationPreview}</p>
                                  )}
                                </div>
                                {suggestion.conversationId ? (
                                  <span className="text-xs text-orange-500 font-medium">{t('common.messages.title')}</span>
                                ) : (
                                  <span className="text-xs text-gray-400">{t('common.messages.startConversation')}</span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-6 text-center text-gray-500">
                            {t('common.noResults')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="overflow-y-auto flex-1"
                  style={isMobileLayout ? { paddingBottom: mobileListPadding, scrollPaddingBottom: mobileListPadding } : undefined}
                >
                  {isLoadingConversations ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
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
                          className={`w-full flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors ${
                            selectedConversation?.id === conversation.id ? 'bg-orange-50 border-r-4 border-orange-500' : ''
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={otherUser.avatar}
                              alt={otherUser.full_name}
                              loading="lazy"
                              decoding="async"
                              className="w-12 md:w-14 h-12 md:h-14 rounded-full object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 w-3 md:w-4 h-3 md:h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900 truncate text-sm md:text-base">{otherUser.full_name}</h3>
                              <div className="flex items-center gap-2 ml-2">
                                {conversation.last_message_at && (
                                  <span className="text-xs text-gray-500">
                                    {formatDate(conversation.last_message_at)}
                                  </span>
                                )}
                                {conversation.unread_count && conversation.unread_count > 0 && (
                                  <div className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              {conversation.last_message_text ? 
                                (conversation.last_message_text.length > 35 ? 
                                  conversation.last_message_text.substring(0, 35) + '...' : 
                                  conversation.last_message_text
                                ) : 'Henüz mesaj yok - Konuşmaya başlayın'
                              }
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="min-h-full flex flex-col items-center justify-center py-16 text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Search size={24} className="text-gray-400" />
                      </div>
                      <p className="text-lg font-medium mb-2">{t('common.messages.noConversations')}</p>
                      <p className="text-sm text-center px-4">{t('common.messages.startConversation')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full overflow-hidden bg-gray-50`}>
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedConversation(null)}
                          className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
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
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {getOtherParticipant(selectedConversation)?.full_name}
                          </h3>
                          <p className="text-sm text-green-500 font-medium">
                            {t('common.messages.online')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </button>
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 6v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => {
                            setConversationToDelete(selectedConversation.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title={t('common.messages.deleteConversation')}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div
                      className={`flex-1 ${messages.length > 0 ? 'overflow-y-auto' : 'overflow-y-hidden'} p-4 bg-gray-50`}
                      id="messages-container"
                      style={isMobileLayout ? { paddingBottom: mobileMessagesPadding, scrollPaddingBottom: mobileMessagesPadding } : undefined}
                    >
                      {isLoadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                      ) : messages.length > 0 ? (
                        <div className="space-y-3 min-h-full">
                          {messages.map((message, index) => {
                            const isOwn = message.sender_id === currentUserId;
                            const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
                            const otherUser = getOtherParticipant(selectedConversation);
                            
                            return (
                              <div
                                key={message.id}
                                className={`flex items-end gap-2 ${
                                  isOwn ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                {!isOwn && (
                                  <div className="w-8 h-8 flex-shrink-0">
                                    {showAvatar && otherUser && (
                                      <img
                                        src={otherUser.avatar}
                                        alt={otherUser.full_name}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    )}
                                  </div>
                                )}
                                <div
                                  className={`max-w-[85%] md:max-w-[70%] px-4 py-3 break-words overflow-hidden shadow-sm ${
                                    isOwn
                                      ? 'bg-orange-500 text-white rounded-2xl rounded-br-md'
                                      : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md'
                                  } ${message.is_sending ? 'opacity-70' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="break-words whitespace-pre-wrap leading-relaxed">{message.text}</p>
                                      <div className={`text-xs mt-1 flex items-center ${
                                        isOwn
                                          ? 'text-orange-100'
                                          : 'text-gray-500'
                                      }`}>
                                        <span>{formatDate(message.created_at)}</span>
                                        {isOwn && (
                                          <span className="ml-2">
                                            {message.is_sending ? (
                                              <span className="inline-block w-3 h-3 rounded-full border-2 border-orange-100 border-t-transparent animate-spin"></span>
                                            ) : message.is_read ? (
                                              <span title={t('common.messages.read')}>✓✓</span>
                                            ) : (
                                              <span title={t('common.messages.delivered')}>✓</span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isOwn && !message.is_sending && (
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
                                            alert(t('common.messages.errorDeleting'));
                                          }
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded ${
                                          isOwn
                                            ? 'text-blue-100 hover:text-white'
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search size={24} className="text-gray-400" />
                          </div>
                          <p className="text-lg font-medium mb-2">{t('common.messages.noMessagesYet')}</p>
                          <p className="text-sm text-center">{t('common.messages.startFirstMessage')}</p>
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
                    <form
                      onSubmit={handleSendMessage}
                      className="p-2 md:p-4 border-t bg-white sticky bottom-0 left-0 right-0 z-10 shadow-[0_-1px_6px_rgba(0,0,0,0.06)] safe-bottom"
                      style={isMobileLayout ? { paddingBottom: mobileInputPadding } : undefined}
                    >
                      <div className="flex items-end gap-3">
                        <button type="button" className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                          </svg>
                        </button>
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
                            placeholder={t('common.messages.typeMessage')}
                            autoFocus
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                            style={isMobileLayout ? { minHeight: '54px' } : undefined}
                          />
                          <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full text-gray-500">
                    <p>{t('common.messages.selectConversation')}</p>
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
              <h2 className="text-lg font-semibold mb-2">{t('common.messages.deleteConversation')}</h2>
              <p className="text-gray-600 text-sm mb-6">
                  {t('common.messages.deleteConfirmation')}
                </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConversationToDelete(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('common.messages.cancel')}
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
                      alert(t('common.messages.errorDeletingConversation'));
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  {t('common.messages.delete')}
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
