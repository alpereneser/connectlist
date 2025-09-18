import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, ChatCircle, Plus, Bell, User, UserPlus } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { Film, Tv, Book, Users2, Video, Gamepad2, MapPin, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { AuthPopup } from './AuthPopup';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { DEFAULT_HOME_CATEGORY } from '../constants/categories';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface BottomMenuProps {
  hidden?: boolean;
}

export const BottomMenu: React.FC<BottomMenuProps> = ({ hidden = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: isLoadingAuth } = useAuth();
  const pathname = location.pathname;
  const { t } = useTranslation();
  const { scrollDirection, isScrolledToTop } = useScrollDirection({ threshold: 15, debounceMs: 150 });
  const { triggerHaptic } = useHapticFeedback();
  
  // State variables
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessagesBottom, setHasUnreadMessagesBottom] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  // Helper functions
  const checkUnreadNotifications = async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[BottomMenu] Error checking notifications:', error);
        setHasUnreadNotifications(false);
        return;
      }

      setHasUnreadNotifications((count ?? 0) > 0);
    } catch (error) {
      console.error('[BottomMenu] Error in checkUnreadNotifications:', error);
      setHasUnreadNotifications(false);
    }
  };

  const checkUnreadMessagesBottom = async () => {
    if (!user) {
      setHasUnreadMessagesBottom(false);
      return;
    }
    
    try {
      const { data: conversations, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError) {
        console.error('[BottomMenu] Error checking conversations:', convError);
        setHasUnreadMessagesBottom(false);
        return;
      }

      if (!conversations || conversations.length === 0) {
        setHasUnreadMessagesBottom(false);
        return;
      }

      const { data: unreadMessages, error: msgError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversations.map(c => c.conversation_id))
        .eq('is_read', false)
        .neq('sender_id', user.id);
      
      if (msgError) {
        console.error('[BottomMenu] Error checking unread messages:', msgError);
        setHasUnreadMessagesBottom(false);
        return;
      }
      
      setHasUnreadMessagesBottom(unreadMessages !== null && unreadMessages.length > 0);
    } catch (error) {
      console.error('[BottomMenu] Error in checkUnreadMessagesBottom:', error);
      setHasUnreadMessagesBottom(false);
    }
  };

  // Gerçek zamanlı bildirim ve mesaj güncellemelerini izle
  useEffect(() => {
    // Ensure user is loaded and exists before subscribing
    if (isLoadingAuth || !user) return;
 
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (_payload) => {
        // Herhangi bir değişiklik olduğunda bildirimleri kontrol et
        checkUnreadNotifications(user.id);
      })
      .subscribe();
        
    checkUnreadNotifications(user.id);
    checkUnreadMessagesBottom(); // Initial check for messages

    // Real-time subscription for messages
    const messagesChannel = supabase
      .channel(`messages:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (_payload) => {
        // Check if the new message belongs to one of the user's conversations
        // and is not sent by the user themselves.
        // This logic might need refinement based on your exact needs for notifications.
        checkUnreadMessagesBottom(); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `is_read=eq.false` }, (_payload) => {
        // Also check if a message's read status changes to unread
        checkUnreadMessagesBottom();
      })
      .subscribe();
        
    return () => {
      channel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [user, isLoadingAuth]);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const handleProfilePress = () => {
    pressTimer.current = setTimeout(() => {
      setShowLogout(true);
    }, 500); // 500ms uzun basma süresi
  };

  const handleProfileRelease = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
    setShowLogout(false);
  };

  const handleHomeClick = () => {
    if (pathname === '/') {
      // Ana sayfadaysa, içeriği yenile ve en üste kaydır
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate('/', { 
        replace: true,
    state: { 
          refresh: true,
          timestamp: new Date().getTime(),
          randomize: false,
          category: DEFAULT_HOME_CATEGORY,
          sortDirection: 'desc'
        } 
      });
    } else {
      // Başka sayfadaysa, ana sayfaya yönlendir
      navigate('/', {
        state: {
          refresh: true, // Sayfayı yenileme durumu
          randomize: false,
          category: DEFAULT_HOME_CATEGORY,
          sortDirection: 'desc'
        }
      });
    }
  };

  const profileOrLoginLink = user ? (
    <button
      onClick={() => {
        triggerHaptic('light');
        navigate('/profile/me');
      }}
      onTouchStart={handleProfilePress}
      onTouchEnd={handleProfileRelease}
      onMouseDown={handleProfilePress}
      onMouseUp={handleProfileRelease}
      onMouseLeave={handleProfileRelease}
      className={`p-2 rounded-full hover:bg-gray-100 ${
        isActive('/profile') ? 'text-orange-500' : 'text-gray-600'
      }`}
    >
      <User weight={isActive('/profile') ? 'fill' : 'regular'} size={24} />
    </button>
  ) : (
    <button
      onClick={() => {
        triggerHaptic('light');
        navigate('/auth/register');
      }}
      className={`p-2 rounded-full hover:bg-gray-100 ${isActive('/auth/register') ? 'text-orange-500' : 'text-gray-600'}`}
    >
      <UserPlus weight={isActive('/auth/register') ? 'fill' : 'regular'} size={24} />
    </button>
  );

  const handleNotificationClick = () => {
    // Giriş yapılmış mı kontrol et
    if (!user) {
      setAuthMessage('Bildirimleri görüntülemek için giriş yapmalısınız');
      setShowAuthPopup(true);
    } else {
      navigate('/notifications');
      // Bildirim sayfasına gidildiğinde bildirimleri okundu olarak işaretle
      if (hasUnreadNotifications) {
        setHasUnreadNotifications(false);
      }
    }
  };

  // Fetch initial notification status when user is loaded
  useEffect(() => {
    if (user) {
      checkUnreadNotifications(user.id);
    }
  }, [user]);

  if (hidden) {
    return null;
  }

  // Determine if menu should be hidden based on scroll direction
  const shouldHideMenu = scrollDirection === 'down' && !isScrolledToTop;

  console.log("[BottomMenu] Rendering decision - isLoadingAuth:", isLoadingAuth, "User:", user);

  return (
    <>
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden h-[74px] transition-transform duration-300 ease-in-out ${hidden ? 'hidden' : ''}`} 
        style={{ 
          paddingBottom: 'var(--safe-area-inset-bottom)',
          transform: shouldHideMenu ? 'translateY(100%)' : 'translateY(0)'
        }}
      >
        {isLoadingAuth ? (
          // Yükleniyor durumu veya boşluk
          <div className="flex justify-around items-center h-full">
            {/* Optional: Add placeholder icons or a spinner */}
          </div>
        ) : user ? (
          // Giriş yapılmış menü
          <div className="flex justify-around items-center h-full">
            <button
              onClick={() => {
                triggerHaptic('light');
                handleHomeClick();
              }}
              className={`p-2 rounded-full hover:bg-gray-100 ${
                isActive('/') ? 'text-orange-500' : 'text-gray-600'
              }`}
            >
              <House weight={isActive('/') ? 'fill' : 'regular'} size={24} />
            </button>
            
            <button
              onClick={() => {
                triggerHaptic('light');
                navigate('/messages');
              }}
              className={`p-2 rounded-full hover:bg-gray-100 ${
                isActive('/messages') ? 'text-orange-500' : 'text-gray-600'
              }`}
            >
              <div className="relative"> 
                <ChatCircle weight={isActive('/messages') ? 'fill' : 'regular'} size={24} />
                {hasUnreadMessagesBottom && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white"></span>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                triggerHaptic('medium');
                if (user) {
                  // Open iOS-style category sheet instead of navigating
                  // to SelectCategory page
                  // Sheet UI defined below in this component
                  ;
                  // Set flag to show sheet
                  // Use optional chaining to avoid TS emit issues on older builds
                  (setShowCategorySheet as any)?.(true);
                } else {
                  setAuthMessage('Liste oluşturmak için giriş yapmalısınız');
                  setShowAuthPopup(true);
                }
              }}
              className="w-12 h-12 flex items-center justify-center bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600"
            >
              <Plus size={24} weight="bold" />
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                handleNotificationClick();
              }}
              className={`p-2 rounded-full hover:bg-gray-100 ${
                isActive('/notifications') ? 'text-orange-500' : 'text-gray-600'
              }`}
            >
              <div className="relative">
                <Bell weight={isActive('/notifications') ? 'fill' : 'regular'} size={24} />
                {hasUnreadNotifications && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold">!</span>
                )}
              </div>
            </button>

            {profileOrLoginLink}
          </div>
        ) : (
          // Giriş yapılmamış menü
          <div className="flex justify-around items-center h-full">
            <button
              onClick={() => {
                triggerHaptic('light');
                navigate('/');
              }}
              className={`p-2 rounded-full hover:bg-gray-100 ${isActive('/') ? 'text-orange-500' : 'text-gray-600'}`}
            >
              <House weight={isActive('/') ? 'fill' : 'regular'} size={24} />
            </button>
            
            <button
              onClick={() => {
                triggerHaptic('light');
                if (user) {
                  navigate('/messages');
                } else {
                  setAuthMessage('Mesajları görmek için giriş yapmalısınız');
                  setShowAuthPopup(true);
                }
              }}
              className={`p-2 rounded-full hover:bg-gray-100 ${isActive('/messages') ? 'text-orange-500' : 'text-gray-600'}`}
            >
              <div className="relative"> 
                <ChatCircle weight={isActive('/messages') ? 'fill' : 'regular'} size={24} />
                {user && hasUnreadMessagesBottom && ( 
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white"></span>
                )}
              </div>
            </button>

            <button onClick={() => {
              triggerHaptic('medium');
              setAuthMessage('Liste oluşturmak için giriş yapmalısınız');
              setShowAuthPopup(true);
            }} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <Plus weight="regular" size={24} />
            </button>
            
            <button onClick={() => {
              triggerHaptic('light');
              handleNotificationClick();
            }} className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <Bell weight="regular" size={24} />
              {hasUnreadNotifications && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>
            
            {profileOrLoginLink} {/* Giriş butonu (SignIn) */}
          </div>
        )}
      </div>
      
      {/* Logout Modal */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50" onClick={() => setShowLogout(false)}>
          <div className="bg-white w-full p-4 rounded-t-2xl">
            <button
              onClick={handleLogout}
              className="w-full py-3 text-red-500 font-medium text-center"
            >
              Çıkış Yap
            </button>
            <button
              onClick={() => setShowLogout(false)}
              className="w-full py-3 text-gray-500 font-medium text-center mt-2"
            >
              İptal
            </button>
          </div>
        </div>
      )}
      
      {/* Auth Popup */}
      <AuthPopup
        isOpen={showAuthPopup}
        message={authMessage}
        onClose={() => setShowAuthPopup(false)}
      />

      {/* Category Bottom Sheet with animation */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[60]" onClick={() => { setShowCategorySheet(false); }}>
          <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" />
          <div
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out translate-y-0"
            style={{ paddingBottom: 'calc(16px + var(--safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2 mb-1" />
            <div className="text-center mb-2 px-4">
              <h3 className="text-sm font-medium text-gray-900">
                {t('listPreview.listDetails.selectCategory') as string}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {(t('listPreview.listDetails.selectCategoryDescription') as string) || 'Liste oluşturmak için bir kategori seçebilirsiniz.'}
              </p>
            </div>
            <div className="px-4 pb-2">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'movies', label: t('common.categories.movies'), Icon: Film },
                  { id: 'series', label: t('common.categories.series'), Icon: Tv },
                  { id: 'books', label: t('common.categories.books'), Icon: Book },
                  { id: 'games', label: t('common.categories.games'), Icon: Gamepad2 },
                  { id: 'people', label: t('common.categories.people'), Icon: Users2 },
                  { id: 'videos', label: t('common.categories.videos'), Icon: Video },
                  { id: 'places', label: t('common.categories.places'), Icon: MapPin },
                  { id: 'musics', label: t('common.categories.musics'), Icon: Music },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setShowCategorySheet(false);
                      navigate(`/create-list/${id}`);
                    }}
                    className="group flex flex-col items-center justify-center h-20 bg-white border border-gray-200 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] active:scale-95 hover:border-orange-300 hover:shadow-[0_2px_12px_rgba(251,146,60,0.15)] transition-all duration-200 ease-out"
                    aria-label={String(label)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center mb-1 group-hover:bg-orange-50 group-hover:ring-orange-200 transition-all duration-200">
                      <Icon size={20} className="text-gray-700 group-hover:text-orange-600 transition-colors duration-200" />
                    </div>
                    <span className="text-[11px] text-gray-900 font-medium line-clamp-1 group-hover:text-orange-700 transition-colors duration-200">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 mt-1">
              <button
                onClick={() => setShowCategorySheet(false)}
                className="w-full py-3 text-sm text-gray-600 bg-gray-100 rounded-xl active:scale-95"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
};


