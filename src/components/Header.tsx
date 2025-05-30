import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MagnifyingGlass, Bell, ChatCircle, CaretDown, CaretLeft } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next'; 
import { supabaseBrowser as supabase } from '../lib/supabase-browser'; 
import { SearchResults } from './SearchResults';
import { NotificationDropdown } from './NotificationDropdown';
import { AuthPopup } from './AuthPopup';
import { markAllNotificationsAsRead } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { useClickOutside } from '../hooks/useClickOutside';

interface Profile {
  username: string;
  full_name: string;
  avatar: string;
}

export function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // error değişkeni yerine doğrudan fonksiyon içinde hata yönetimi yapıyoruz
  const setError = useCallback((error: string | null) => {
    if (error) console.error('Profile error:', error);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  // isMarkingAllRead değişkeni yerine doğrudan fonksiyon içinde durum yönetimi yapıyoruz
  const setIsMarkingAllRead = (value: boolean) => {
    // Bildirim işaretleme durumunu konsola yazdır (geliştirme amaçlı)
    if (value) console.log('Marking notifications as read...');
  };
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authMessage] = useState('');
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Ana sayfa kontrolü
  const isHomePage = location.pathname === '/' || location.pathname === '/index.html';

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Bildirimleri kontrol eden fonksiyon
  const checkNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Sadece okunmamış bildirimleri say
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false); // Okunmamışları filtrele
      
    if (countError) {
      console.error('Error counting unread notifications:', countError);
      return;
    }
    
    setNotificationCount(count ?? 0); // null ise 0 ata
  }, []);
  
  useEffect(() => {
    const checkUnreadMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasUnreadMessages(false);
        return;
      }

      try {
        // Kullanıcının katıldığı konuşmaları al
        const { data: conversations, error: convError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', session.user.id);

        if (convError) {
          console.error('Error checking conversations:', convError);
          return;
        }

        if (!conversations || conversations.length === 0) {
          setHasUnreadMessages(false);
          return;
        }

        // Bu konuşmalardaki okunmamış mesajları kontrol et
        const { data: unreadMessages, error: msgError } = await supabase
          .from('messages')
          .select('id')
          .in('conversation_id', conversations.map(c => c.conversation_id))
          .eq('is_read', false)
          .neq('sender_id', session.user.id)
          .limit(1);

        if (msgError) {
          console.error('Error checking messages:', msgError);
          return;
        }

        setHasUnreadMessages(unreadMessages && unreadMessages.length > 0);
      } catch (error) {
        console.error('Exception in checkUnreadMessages:', error);
        setHasUnreadMessages(false);
      }
    };

    checkUnreadMessages();

    // Realtime subscription for messages
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        checkUnreadMessages();
      })
      .subscribe();
      
    // Mesajlar okunduğunda bildirim göstergesini güncelle
    const broadcastSubscription = supabase
      .channel('public:messages')
      .on('broadcast', { event: 'messages_read' }, () => {
        checkUnreadMessages();
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      broadcastSubscription.unsubscribe();
    };
  }, []);

  // İlk yüklemede bildirimleri kontrol et
  useEffect(() => {
    checkNotifications();

    // Realtime subscription for notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        checkNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [checkNotifications]);

  // Profil bilgilerini getiren fonksiyon - useCallback ile performans iyileştirmesi
  const fetchProfile = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    // Hata ayıklama: Oturum durumunu konsola yazdır
    console.log('Current session:', session ? 'Logged in' : 'Not logged in', session);
    
    try {
      if (session?.user?.id) {
        console.log('Fetching profile for user:', session.user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('username, full_name, avatar')
          .eq('id', session.user.id);

        if (error) {
          console.error('Error fetching profile:', error);
          setError(error.message);
          return;
        }

        // Eğer veri varsa ve en az bir sonuç döndüyse
        if (data && data.length > 0) {
          console.log('Profile found:', data[0]);
          setProfile(data[0]);
        } else {
          console.warn('Profil bulunamadı:', session.user.id);
          setProfile(null);
        }
      } else {
        console.log('No active session, setting profile to null');
        setProfile(null);
      }
    } catch (error) {
      console.error('Exception in fetchProfile:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsAuthChecked(true);
    }
  }, [setError, setIsLoading, setProfile, setIsAuthChecked]); // Bağımlılıklar

  // İlk yüklemede profil bilgilerini getir
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // fetchProfile bağımlılığını ekle

  // Oturum durumu değişikliklerini dinle
  useEffect(() => {
    // Oturum durumu değiştiğinde çağrılacak fonksiyon
    const handleAuthChange = (event: string, session: { user: { id: string } } | null) => {
      console.log('Auth state changed:', event, session ? 'User logged in' : 'User logged out');
      fetchProfile(); // Profil bilgilerini güncelle
    };

    // Supabase auth değişikliklerini dinle
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    // Başlangıçta mevcut oturum durumunu kontrol et
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session check:', session ? 'User is logged in' : 'User is not logged in');
      if (session) {
        console.log('User ID:', session.user.id);
        fetchProfile();
      }
    };
    
    checkCurrentSession();

    // Temizleme fonksiyonu
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]); // fetchProfile bağımlılığını ekle
  
  // Her 5 saniyede bir oturum durumunu kontrol et (geçici hata ayıklama için)
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check (interval):', session ? 'Logged in' : 'Not logged in');
      if (session && !profile) {
        console.log('Session exists but profile is null, fetching profile...');
        fetchProfile();
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [profile, fetchProfile]); // fetchProfile bağımlılığını ekle

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(!!value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement | HTMLInputElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchPath = `/search?q=${encodeURIComponent(searchQuery)}`;
      if (location.pathname === '/search') {
        // Eğer zaten search sayfasındaysak, sadece URL'i güncelle
        navigate(searchPath, { replace: true });
      } else {
        // Başka bir sayfadaysak, search sayfasına yönlendir
        navigate(searchPath);
      }
      setShowResults(false);
      setSearchQuery('');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Logo tıklaması için artık doğrudan img etiketinde onClick kullanıyoruz

  return (
    <header>
      {/* Header content container - Mobil için normal akışta, masaüstü için sabit */}
      <div className="bg-white shadow-md md:fixed md:top-0 md:left-0 md:right-0 md:z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left section: Logo and optional back button */}
            {/* Mobil görünümde geri butonu (ana sayfa hariç) */}
            <div className="md:hidden">
              {!isHomePage && (
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <CaretLeft className="h-5 w-5" weight="bold" />
                </button>
              )}
            </div>

            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center md:flex-none flex-1 justify-center md:justify-start cursor-pointer"
            > 
              <img 
                src="https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/connectlist-beta-logo.png?t=1" 
                alt="Connectlist" 
                className="w-[145px] h-[17px] md:w-[193px] md:h-[22px]"
                onClick={(e) => {
                  e.preventDefault();
                  // Ana sayfaya yönlendir, sayfayı yeniden yüklemeden
                  navigate('/', { 
                    replace: true
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </Link>

            {/* Mobil görünümde arama simgesi */}
            <div className="md:hidden">
              <Link to="/search" className="relative p-2 text-gray-600 hover:text-gray-900">
                <MagnifyingGlass className="h-6 w-6" />
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <div className="relative">
                <form onSubmit={handleSearchSubmit}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlass className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                    placeholder={t('common.searchPlaceholder')}
                    className="search-input block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[13px]"
                  />
                </form>
                <SearchResults
                  isOpen={showResults}
                  onClose={() => setShowResults(false)}
                  searchQuery={debouncedSearch}
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthChecked && (profile ? (
                <>
                  {/* Messages */}
                  <Link
                    to="/messages"
                    className="relative p-2 text-gray-600 hover:text-gray-900 hidden md:flex"
                  >
                    <ChatCircle className="h-6 w-6" />
                    {hasUnreadMessages && (
                      <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
                    )}
                  </Link>

                  {/* Search Icon - Mobile Only */}
                  <Link
                    to="/search"
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 md:hidden"
                  >
                    <MagnifyingGlass className="h-6 w-6" />
                  </Link>

                  {/* Notifications - Sadece giriş yapmış kullanıcılar için */}
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 text-gray-600 hover:text-orange-500 rounded-full hover:bg-gray-100"
                    >
                      <div className="relative">
                        <Bell className="h-6 w-6" />
                        {notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold">{notificationCount > 99 ? '99+' : notificationCount}</span>
                        )}
                      </div>
                    </button>
                    <NotificationDropdown
                      isOpen={showNotifications}
                      onClose={() => setShowNotifications(false)}
                      title={t('common.notifications.title')}
                      markAllReadText={t('common.notifications.markAllRead')}
                      noNotificationsText={t('common.notifications.noNotifications')}
                      deleteAllText={t('common.notifications.deleteAll')}
                      processingText={t('common.notifications.processing')}
                      onMarkAllRead={async () => {
                        setIsMarkingAllRead(true);
                        try {
                          await markAllNotificationsAsRead();
                          await checkNotifications();
                        } catch (err) {
                          console.error('Error marking notifications as read:', err);
                        } finally {
                          setIsMarkingAllRead(false);
                        }
                      }}
                      onNotificationsRead={() => {
                        // Bildirimler okunduğunda bildirimleri güncelle
                        checkNotifications();
                      }}
                    />
                  </div>

                  {/* Profile Dropdown - Sadece giriş yapmış kullanıcılar için */}
                  <div className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-3 focus:outline-none"
                      disabled={isLoading}
                    >
                      <div className="relative">
                        <img
                          src={profile?.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=1` : "https://api.dicebear.com/7.x/avataaars/svg"}
                          alt="Profile"
                          className={`h-10 w-10 rounded-full object-cover border-2 border-orange-100 ${isLoading ? 'opacity-50' : ''}`}
                        />
                        {profile && !isLoading && (
                          <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">
                          {isLoading ? t('common.profile.loading') : profile?.full_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          @{isLoading ? '...' : profile?.username}
                        </span>
                      </div>
                      <CaretDown className="ml-1 h-4 w-4 text-gray-400" weight="bold" />
                    </button>

                    {isDropdownOpen && (
                      <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                        <Link
                          to={`/profile/${profile?.username}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {t('common.profile.myProfile')}
                        </Link>
                        <Link
                          to="/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {t('common.profile.settings')}
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {t('common.profile.signOut')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Giriş yapmamış kullanıcılar için giriş/kayıt butonları */
                <div className="flex items-center space-x-3">
                  <Link
                    to="/auth/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {t('common.auth.login')}
                  </Link>
                  <Link
                    to="/auth/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600"
                  >
                    {t('common.auth.register')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
        <AuthPopup
          isOpen={showAuthPopup}
          onClose={() => setShowAuthPopup(false)}
          message={authMessage}
        />
      </div>
    </header>
  );
}