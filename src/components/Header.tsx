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

interface HeaderProps {
  onLogoClick?: () => void;
}

export function Header({ onLogoClick }: HeaderProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setError = useCallback((error: string | null) => {
    if (error) console.error('Profile error:', error);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const setIsMarkingAllRead = (value: boolean) => {
    if (value) console.log('Marking notifications as read...');
  };
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authMessage] = useState('');
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  // Mobile UX States
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchInputHeight, setSearchInputHeight] = useState(0);

  // Accessibility and Mobile UX States
  const [announceText, setAnnounceText] = useState<string>('');
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  // Ana sayfa kontrolü
  const isHomePage = location.pathname === '/' || location.pathname === '/index.html';

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Mobile detection with orientation change support
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Adjust search input height for mobile keyboards
      if (mobile && isSearchFocused) {
        setSearchInputHeight(window.innerHeight * 0.6);
      } else {
        setSearchInputHeight(0);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, [isSearchFocused]);

  // PWA Status detection
  const [isPWA, setIsPWA] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if app is installed as PWA
    const checkPWAStatus = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true ||
                       document.referrer.includes('android-app://');
      setIsPWA(isPWAMode);
    };

    checkPWAStatus();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Haptic Feedback Functions
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Accessibility Functions
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceText(message);
    setTimeout(() => setAnnounceText(''), 1000);
  }, []);

  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    setIsKeyboardNavigation(true);
    
    // Clear keyboard navigation flag after mouse use
    const handleMouseMove = () => {
      setIsKeyboardNavigation(false);
      document.removeEventListener('mousemove', handleMouseMove);
    };
    document.addEventListener('mousemove', handleMouseMove);

    switch (event.key) {
      case 'Escape':
        // Close dropdowns/modals
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
          announceToScreenReader('Profil menüsü kapatıldı');
        } else if (showNotifications) {
          setShowNotifications(false);
          announceToScreenReader('Bildirimler kapatıldı');
        } else if (showResults) {
          setShowResults(false);
          announceToScreenReader('Arama sonuçları kapatıldı');
        }
        break;
      case 'Enter':
      case ' ':
        // Handle Enter/Space on focused elements
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.role === 'button' || activeElement.tagName === 'BUTTON')) {
          event.preventDefault();
          activeElement.click();
        }
        break;
      case '/':
        // Focus search input with '/' key
        if (event.target !== searchInputRef.current && searchInputRef.current) {
          event.preventDefault();
          searchInputRef.current.focus();
          announceToScreenReader('Arama kutusuna odaklanıldı');
        }
        break;
    }
  }, [isDropdownOpen, showNotifications, showResults, announceToScreenReader]);

  // Keyboard navigation setup
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Bildirimleri kontrol eden fonksiyon
  const checkNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNotificationCount(0);
        return;
      }

      // Sadece okunmamış bildirimleri say
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false); // Okunmamışları filtrele
        
      if (countError) {
        console.error('Error counting unread notifications:', countError);
        setNotificationCount(0);
        return;
      }
      
      const newCount = count ?? 0;
      const oldCount = notificationCount;
      setNotificationCount(newCount);
      
      // Announce new notifications to screen reader
      if (newCount > oldCount && newCount > 0) {
        announceToScreenReader(`${newCount - oldCount} yeni bildirim alındı`);
        triggerHaptic('light');
      }
    } catch (error) {
      console.error('Error in checkNotifications:', error);
      setNotificationCount(0);
    }
  }, [notificationCount, announceToScreenReader, triggerHaptic]);
  
  // Okunmamış mesajları kontrol eden geliştirilmiş fonksiyon
  const checkUnreadMessages = useCallback(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasUnreadMessages(false);
        setPreviousUnreadCount(0);
        return;
      }

      try {
        // Önce kullanıcının herhangi bir mesajı olup olmadığını kontrol et
        const { data: allMessages, error: allMsgError } = await supabase
          .from('decrypted_messages')
          .select('id')
          .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
          .limit(1);

        if (allMsgError) {
          console.error('Error checking if user has any messages:', allMsgError);
          setHasUnreadMessages(false);
          setPreviousUnreadCount(0);
          return;
        }

        // Eğer hiç mesajı yoksa bildirim gösterme
        if (!allMessages || allMessages.length === 0) {
          setHasUnreadMessages(false);
          setPreviousUnreadCount(0);
          console.log('User has no messages at all, hiding notification badge');
          return;
        }

        // Kullanıcının katıldığı konuşmaları al
        const { data: conversations, error: convError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', session.user.id);

        if (convError) {
          console.error('Error checking conversations:', convError);
          setHasUnreadMessages(false);
          return;
        }

        if (!conversations || conversations.length === 0) {
          setHasUnreadMessages(false);
          setPreviousUnreadCount(0);
          return;
        }

        // Bu konuşmalardaki okunmamış mesajları kontrol et - decrypted_messages tablosunu kullan
        const { data: unreadMessages, error: msgError } = await supabase
          .from('decrypted_messages')
          .select('id, created_at')
          .in('conversation_id', conversations.map(c => c.conversation_id))
          .eq('is_read', false)
          .neq('sender_id', session.user.id)
          .order('created_at', { ascending: false });

        if (msgError) {
          console.error('Error checking messages:', msgError);
          setHasUnreadMessages(false);
          return;
        }

        const currentUnreadCount = unreadMessages?.length || 0;
        const hasUnread = currentUnreadCount > 0;
        
        // Yeni mesaj geldiğinde haptic feedback ve screen reader announcement
        if (currentUnreadCount > previousUnreadCount && currentUnreadCount > 0) {
          const newMessageCount = currentUnreadCount - previousUnreadCount;
          announceToScreenReader(`${newMessageCount} yeni mesaj alındı`);
          triggerHaptic('light');
        }
        
        setHasUnreadMessages(hasUnread);
        setPreviousUnreadCount(currentUnreadCount);
        
        console.log('Unread messages check:', {
          hasAnyMessages: allMessages.length > 0,
          conversationCount: conversations.length,
          unreadCount: currentUnreadCount,
          hasUnread,
          previousCount: previousUnreadCount
        });
        
      } catch (error) {
        console.error('Exception in checkUnreadMessages:', error);
        setHasUnreadMessages(false);
        setPreviousUnreadCount(0);
      }
  }, [previousUnreadCount, announceToScreenReader, triggerHaptic]);

  useEffect(() => {
    // İlk yüklemede okunmamış mesajları kontrol et
    checkUnreadMessages();

    // Realtime subscription for messages - decrypted_messages tablosunu dinle
    const messageSubscription = supabase
      .channel('messages-header')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'decrypted_messages'
      }, (payload) => {
        console.log('Message change detected in header:', payload);
        // Kısa bir gecikme ile kontrol et (veritabanı güncellemesinin tamamlanması için)
        setTimeout(() => {
        checkUnreadMessages();
        }, 500);
      })
      .subscribe();
      
    // Mesajlar okunduğunda bildirim göstergesini güncelle
    const broadcastSubscription = supabase
      .channel('public:messages_read_header')
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        console.log('Messages read broadcast received in header:', payload);
        checkUnreadMessages();
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      broadcastSubscription.unsubscribe();
    };
  }, [checkUnreadMessages]);

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
    
    // Announce search results to screen reader
    if (value.trim()) {
      announceToScreenReader(`${value} için arama yapılıyor`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement | HTMLInputElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      triggerHaptic('light');
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
      announceToScreenReader(`${searchQuery} için arama sayfasına yönlendirildi`);
    }
  };

  const handleSignOut = async () => {
    try {
      triggerHaptic('medium');
      announceToScreenReader('Çıkış yapılıyor...');
      await supabase.auth.signOut();
      navigate('/auth/login');
      announceToScreenReader('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Error during logout:', error);
      triggerHaptic('heavy');
      announceToScreenReader('Çıkış yapılırken bir hata oluştu');
    }
  };

  return (
    <header role="banner" aria-label="Ana navigasyon" className={`${isPWA ? 'pwa-header' : ''}`}>
      {/* Screen Reader Announcements */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announceText}
      </div>

      {/* PWA Install Banner - Mobile Only */}
      {isInstallable && isMobile && !isPWA && (
        <div className="bg-orange-500 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>Uygulamayı telefonunuza yükleyin</span>
          <button
            onClick={async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                  setIsInstallable(false);
                }
                setDeferredPrompt(null);
              }
            }}
            className="bg-white bg-opacity-20 px-3 py-1 rounded text-xs font-medium"
          >
            Yükle
          </button>
        </div>
      )}

      {/* Header content container - Mobile optimized */}
      <div className={`bg-white shadow-md fixed-top-safe z-50 safe-x ${isMobile ? 'mobile-header' : ''}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className={`flex items-center justify-between ${isMobile ? 'h-14' : 'h-16'}`} role="navigation" aria-label="Ana menü">
            {/* Left section: Logo and optional back button */}
            {/* Mobil görünümde geri butonu (ana sayfa hariç) */}
            <div className="md:hidden flex items-center">
              {!isHomePage && (
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    navigate(-1);
                    announceToScreenReader('Önceki sayfaya gidiliyor');
                  }} 
                  className="p-2 mr-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full active:scale-95"
                  aria-label="Önceki sayfaya git"
                  title="Geri"
                  tabIndex={0}
                >
                  <CaretLeft className="h-5 w-5" weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Logo - Mobile optimized */}
            <Link 
              to="/" 
              className={`flex items-center ${isMobile ? 'flex-1 justify-center' : 'md:flex-none'} cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded`}
              aria-label="ConnectList ana sayfaya git"
              tabIndex={0}
            > 
              <img 
                src="https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/connectlist-beta-logo.png?t=1" 
                alt="ConnectList logosu" 
                className={`${isMobile ? 'w-[130px] h-[15px]' : 'w-[145px] h-[17px] md:w-[193px] md:h-[22px]'}`}
                role="img"
                onClick={(e) => {
                  e.preventDefault();
                  triggerHaptic('light');
                  
                  if (onLogoClick) {
                    onLogoClick();
                    announceToScreenReader('Ana sayfa yenilendi, tüm listeler gösteriliyor');
                  } else {
                    navigate('/', { 
                      replace: true,
                      state: { 
                        refresh: true,
                        sortDirection: 'desc',
                        category: 'all'
                      }
                    });
                    announceToScreenReader('Ana sayfaya yönlendirildi');
                  }
                }}
              />
            </Link>

            {/* Mobile Right Section */}
            <div className="md:hidden flex items-center">
              {/* Mobile Search Icon */}
              <Link 
                to="/search" 
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full active:scale-95"
                aria-label="Arama sayfasına git"
                title="Ara"
                tabIndex={0}
                onClick={() => {
                  triggerHaptic('light');
                  announceToScreenReader('Arama sayfasına yönlendirildi');
                }}
              >
                <MagnifyingGlass className="h-6 w-6" aria-hidden="true" />
              </Link>
            </div>

            {/* Desktop Search Bar - Hidden on mobile */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block" role="search" aria-label="Arama bölümü">
              <div className="relative">
                <form onSubmit={handleSearchSubmit} role="search">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlass className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                    onFocus={() => {
                      setFocusedElement('search');
                      setIsSearchFocused(true);
                      announceToScreenReader('Arama kutusuna odaklanıldı. Aramak için yazın veya / tuşuna basın');
                    }}
                    onBlur={(e) => {
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      const searchContainer = e.currentTarget.closest('.relative');
                      
                      if (relatedTarget && searchContainer?.contains(relatedTarget)) {
                        return;
                      }
                      
                      if (showResults && searchQuery.trim()) {
                        setTimeout(() => {
                          if (searchInputRef.current) {
                            searchInputRef.current.focus();
                          }
                        }, 50);
                        return;
                      }
                      
                      setTimeout(() => {
                        setFocusedElement(null);
                        setShowResults(false);
                        setIsSearchFocused(false);
                      }, 150);
                    }}
                    placeholder={t('common.searchPlaceholder')}
                    className="search-input block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[13px]"
                    aria-label="Arama kutusu"
                    aria-describedby="search-help"
                    aria-expanded={showResults}
                    aria-autocomplete="list"
                    role="combobox"
                    tabIndex={0}
                  />
                  <div id="search-help" className="sr-only">
                    Arama yapmak için yazın ve Enter'a basın. Sonuçlar otomatik olarak görünecektir.
                  </div>
                </form>
                <SearchResults
                  isOpen={showResults}
                  onClose={() => {
                    setShowResults(false);
                    setIsSearchFocused(false);
                    announceToScreenReader('Arama sonuçları kapatıldı');
                  }}
                  searchQuery={debouncedSearch}
                />
              </div>
            </div>

            {/* Desktop Right Section - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthChecked && (profile ? (
                <>
                  {/* Messages */}
                  <Link
                    to="/messages"
                    className="relative p-2 text-gray-600 hover:text-gray-900 hidden md:flex focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
                    aria-label={hasUnreadMessages ? "Mesajlar - okunmamış mesaj var" : "Mesajlar"}
                    title="Mesajlar"
                    tabIndex={0}
                    onClick={() => {
                      triggerHaptic('light');
                      announceToScreenReader('Mesajlar sayfasına yönlendirildi');
                    }}
                  >
                    <ChatCircle className="h-6 w-6" aria-hidden="true" />
                    {hasUnreadMessages && (
                      <span 
                        className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" 
                        aria-label="Okunmamış mesaj göstergesi"
                        role="status"
                      />
                    )}
                  </Link>

                  {/* Notifications - Desktop */}
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setShowNotifications(!showNotifications);
                        announceToScreenReader(
                          showNotifications 
                            ? 'Bildirimler kapatıldı' 
                            : `Bildirimler açıldı. ${notificationCount} okunmamış bildirim`
                        );
                      }}
                      className="relative p-2 text-gray-600 hover:text-orange-500 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                      aria-label={`Bildirimler ${showNotifications ? 'kapat' : 'aç'}. ${notificationCount} okunmamış bildirim`}
                      aria-expanded={showNotifications}
                      aria-haspopup="true"
                      title="Bildirimler"
                      tabIndex={0}
                    >
                      <div className="relative">
                        <Bell className="h-6 w-6" aria-hidden="true" />
                        {notificationCount > 0 && (
                          <span 
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold"
                            aria-label={`${notificationCount} okunmamış bildirim`}
                            role="status"
                          >
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </span>
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
                        checkNotifications();
                      }}
                    />
                  </div>

                  {/* Profile Dropdown - Desktop */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setIsDropdownOpen(!isDropdownOpen);
                        announceToScreenReader(
                          isDropdownOpen 
                            ? 'Profil menüsü kapatıldı' 
                            : 'Profil menüsü açıldı'
                        );
                      }}
                      className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg p-1"
                      disabled={isLoading}
                      aria-label={`Profil menüsü ${isDropdownOpen ? 'kapat' : 'aç'}. ${profile?.full_name || 'Kullanıcı'}`}
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="true"
                      tabIndex={0}
                    >
                      <div className="relative">
                        <img
                          src={profile?.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=1` : "https://api.dicebear.com/7.x/avataaars/svg"}
                          alt={`${profile?.full_name || 'Kullanıcı'} profil fotoğrafı`}
                          className={`h-10 w-10 rounded-full object-cover border-2 border-orange-100 ${isLoading ? 'opacity-50' : ''}`}
                          role="img"
                        />
                        {profile && !isLoading && (
                          <span 
                            className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" 
                            aria-label="Çevrimiçi durumu"
                            role="status"
                          />
                        )}
                      </div>
                      <div className="flex flex-col" aria-hidden="true">
                        <span className="text-sm font-medium text-gray-800">
                          {isLoading ? t('common.profile.loading') : profile?.full_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          @{isLoading ? '...' : profile?.username}
                        </span>
                      </div>
                      <CaretDown 
                        className={`ml-1 h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                        weight="bold" 
                        aria-hidden="true" 
                      />
                    </button>

                    {isDropdownOpen && (
                      <div 
                        ref={dropdownRef} 
                        className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="profile-menu-button"
                      >
                        <Link
                          to={`/profile/${profile?.username}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                          role="menuitem"
                          tabIndex={0}
                          onClick={() => {
                            triggerHaptic('light');
                            setIsDropdownOpen(false);
                            announceToScreenReader('Profilime yönlendirildi');
                          }}
                        >
                          {t('common.profile.myProfile')}
                        </Link>
                        <Link
                          to="/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                          role="menuitem"
                          tabIndex={0}
                          onClick={() => {
                            triggerHaptic('light');
                            setIsDropdownOpen(false);
                            announceToScreenReader('Ayarlar sayfasına yönlendirildi');
                          }}
                        >
                          {t('common.profile.settings')}
                        </Link>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleSignOut();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                          role="menuitem"
                          tabIndex={0}
                        >
                          {t('common.profile.signOut')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Giriş yapmamış kullanıcılar için giriş/kayıt butonları */
                <div className="flex items-center space-x-3" role="group" aria-label="Kimlik doğrulama">
                  <Link
                    to="/auth/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
                    aria-label="Giriş yap"
                    tabIndex={0}
                    onClick={() => {
                      triggerHaptic('light');
                      announceToScreenReader('Giriş sayfasına yönlendirildi');
                    }}
                  >
                    {t('common.auth.login')}
                  </Link>
                  <Link
                    to="/auth/register"
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    aria-label="Kayıt ol"
                    tabIndex={0}
                    onClick={() => {
                      triggerHaptic('light');
                      announceToScreenReader('Kayıt sayfasına yönlendirildi');
                    }}
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

      {/* Mobile Search Overlay - When search is focused */}
      {isMobile && isSearchFocused && (
        <div 
          className="fixed inset-0 z-60 bg-black bg-opacity-50"
          style={{ height: searchInputHeight }}
        />
      )}
    </header>
  );
}