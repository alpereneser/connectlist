import { Routes, Route, Navigate, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from './lib/supabase-browser';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAndroidBackButtonHandler } from './hooks/useAndroidBackButtonHandler';
import { Header } from './components/Header';
import { SubHeader } from './components/SubHeader';
import { BottomMenu } from './components/BottomMenu';

import { LoadingSpinner } from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { InstallPrompt } from './components/InstallPrompt';
import { CommentModal } from './components/CommentModal';
import { ListPreview } from './components/ListPreview';
import { getLists } from './lib/api';

// Lazy load all route components for better performance
const Login = lazy(() => import('./pages/auth/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(module => ({ default: module.Register })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail').then(module => ({ default: module.VerifyEmail })));
const EmailConfirmed = lazy(() => import('./pages/auth/EmailConfirmed').then(module => ({ default: module.EmailConfirmed })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(module => ({ default: module.ResetPassword })));
const MobileSearch = lazy(() => import('./pages/MobileSearch'));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Search = lazy(() => import('./pages/Search').then(module => ({ default: module.Search })));
const RoadMap = lazy(() => import('./pages/RoadMap').then(module => ({ default: module.RoadMap })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Notifications = lazy(() => import('./pages/Notifications').then(module => ({ default: module.Notifications })));
const SelectCategory = lazy(() => import('./pages/SelectCategory').then(module => ({ default: module.SelectCategory })));
const CreateList = lazy(() => import('./pages/CreateList').then(module => ({ default: module.CreateList })));
const ListDetails = lazy(() => import('./pages/ListDetails').then(module => ({ default: module.ListDetails })));
const Messages = lazy(() => import('./pages/Messages'));
const MessageDetail = lazy(() => import('./pages/MessageDetail'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
const MovieDetails = lazy(() => import('./pages/details/MovieDetails').then(module => ({ default: module.MovieDetails })));
const SeriesDetails = lazy(() => import('./pages/details/SeriesDetails').then(module => ({ default: module.SeriesDetails })));
const BookDetails = lazy(() => import('./pages/details/BookDetails').then(module => ({ default: module.BookDetails })));
const GameDetails = lazy(() => import('./pages/details/GameDetails').then(module => ({ default: module.GameDetails })));
const PersonDetails = lazy(() => import('./pages/details/PersonDetails').then(module => ({ default: module.PersonDetails })));
const PlaceDetails = lazy(() => import('./pages/details/PlaceDetails').then(module => ({ default: module.PlaceDetails })));

// MobileListView removed - using standard list view for all devices

// Sayfa yüklendiğinde en üste kaydırma fonksiyonu
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function Dashboard({ activeCategory, setActiveCategory, lists, setLists, isLoading, setIsLoading, page, setPage, hasMore, setHasMore, isLoadingMore, setIsLoadingMore }: {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  lists: any[];
  setLists: (lists: any[] | ((prev: any[]) => any[])) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  hasMore: boolean;
  setHasMore: (hasMore: boolean) => void;
  isLoadingMore: boolean;
  setIsLoadingMore: (loading: boolean) => void;
}) {
  const navigationType = useNavigationType();
  const location = useLocation();
  const listContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [lastViewedListId, setLastViewedListId] = useLocalStorage<string | null>('lastViewedListId', null);
  const [isMobile, setIsMobile] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Ekran boyutunu kontrol et
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // İlk yüklemede kategoriyi 'all' yap
  useEffect(() => {
    if (!location.state) {
      setActiveCategory('all');
    }
  }, []);
  
  useEffect(() => {
    if (location.state) {
      // Kategori değişikliği varsa
      if (location.state.category !== undefined) {
        setIsLoading(true);
        setActiveCategory(location.state.category); 
      }
      
      // Sıralama yönü gönderildiyse uygula
      if (location.state.sortDirection === 'asc' || location.state.sortDirection === 'desc') {
        setSortDirection(location.state.sortDirection);
      }

      // Yenileme isteği varsa
      if (location.state.refresh) {
        setIsLoading(true);
        setLists([]);
        setPage(0);
        setHasMore(true);
        scrollToTop();
        // State'i temizle
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [location.state]);

  useEffect(() => {
    setLists([]);
    setPage(0);
    setHasMore(true);
    const saved = sessionStorage.getItem('scroll:returnTo');
    const shouldRestore = navigationType === 'POP' && !!saved;
    if (!shouldRestore) { scrollToTop(); }
    fetchLists().then(() => {
      if (shouldRestore && saved) {
        try { const { path, y } = JSON.parse(saved); if (path === window.location.pathname) { window.scrollTo({ top: y, behavior: 'auto' }); } } catch (e) {}
        sessionStorage.removeItem('scroll:returnTo');
        return;
      } 
      // Eğer son görüntülenen liste varsa, ona kaydır
      if (lastViewedListId && !isMobile) {
        setTimeout(() => {
          const listElement = document.getElementById(`list-${lastViewedListId}`);
          if (listElement) {
            listElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setLastViewedListId(null); // Kaydırma yapıldıktan sonra temizle
          }
        }, 500); // Listelerin yüklenmesi için kısa bir gecikme
      }
    });
    
    return () => {
      // Cleanup function
    };
  }, [activeCategory, isMobile, sortDirection]);
  
  // Supabase realtime aboneliği ile yeni listeleri gerçek zamanlı olarak izle
  useEffect(() => {
    // Listeleri gerçek zamanlı olarak izleyen abonelik
    const subscription = supabase
      .channel('public:lists')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lists',
        filter: 'is_public=eq.true'
      }, async (payload) => {
        console.log('Yeni liste eklendi:', payload);
        
        // Yeni eklenen listeyi kontrol et
        const newList = payload.new;
        
        // Kategori filtresi varsa ve yeni listenin kategorisi farklıysa, gösterme
        if (activeCategory !== 'all' && newList.category !== activeCategory) {
          return;
        }
        
        // Kullanıcı profilini al
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, full_name, avatar')
          .eq('id', newList.user_id)
          .single();
          
        // Liste öğelerini al
        const { data: items } = await supabase
          .from('list_items')
          .select('*')
          .eq('list_id', newList.id)
          .order('position');
          
        // Yeni listeyi mevcut listelerin başına/sonuna ekle
        const listWithProfile = {
          ...newList,
          profiles: profileData,
          items: items || []
        };
        
        // Sıralama yönüne göre ekleme yap
        setLists(prevLists => sortDirection === 'desc' ? [listWithProfile, ...prevLists] : [...prevLists, listWithProfile]);
      })
      .subscribe();
      
    return () => {
      // Sayfa değiştiğinde aboneliği iptal et
      subscription.unsubscribe();
    };
  }, [activeCategory, sortDirection]);

  const fetchLists = async () => {
    if (isLoadingMore) return;

    const isInitialLoad = page === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await getLists(
        activeCategory === 'all' ? undefined : activeCategory,
        page,
        10,
        sortDirection
      );

      if (data && data.length > 0) {
        const currentScrollHeight = listContainerRef.current?.scrollHeight || 0;
        const currentScrollTop = listContainerRef.current?.scrollTop || 0;
        
        setLists(prevLists => isInitialLoad ? data : [...prevLists, ...data]);
        setPage(prevPage => prevPage + 1);
        setHasMore(data.length === 10);
        
        // Mobilde yeni içerik yüklendiğinde scroll pozisyonunu koru
        if (isMobile && !isInitialLoad && listContainerRef.current) {
          requestAnimationFrame(() => {
            const newScrollHeight = listContainerRef.current?.scrollHeight || 0;
            const heightDifference = newScrollHeight - currentScrollHeight;
            if (listContainerRef.current) {
              listContainerRef.current.scrollTop = currentScrollTop + heightDifference;
            }
          });
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
      setHasMore(false);
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  };

  // Scroll event handler for infinite loading
  const handleScroll = () => {
    if (isLoadingMore || !hasMore) return;

    if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight) {
      return;
    }
    fetchLists();
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore, page, activeCategory]);

  // Tüm cihazlar için standart liste görünümü
  return (
    <div ref={listContainerRef} className="min-h-screen bg-gray-100"> 
      <div className="max-w-7xl mx-auto px-2 md:px-4 sm:px-6 lg:px-8 pt-2 md:pt-[10px] pb-4 md:pb-8"> 
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 md:py-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mb-3"></div>
            <LoadingQuote />
          </div>
        ) : (
          <div className="flex flex-col space-y-3 md:space-y-6">
            {lists.map((list) => (
              <div key={list.id} id={`list-${list.id}`}>
                <ListPreview list={list} items={list.items} onListClick={() => setLastViewedListId(list.id)} />
              </div>
            ))}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
              </div>
            )}
            {!hasMore && lists.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                {t('listPreview.noMoreLists')}
              </div>
            )}
            {!hasMore && lists.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-600 text-base mb-3">
                  {activeCategory === 'all'
                    ? t('listPreview.noLists')
                    : t('listPreview.noCategoryLists', { category: t(`common.categories.${activeCategory}`) })}
                </p>
                <a
                  href="/select-category"
                  className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {t('common.createList')}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  // Dashboard state'leri
  const [lists, setLists] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false); 
  
  // Android geri tuşu için genelleyici
  useAndroidBackButtonHandler();

  // Oturum durumunu kontrol et
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setIsAuthChecked(true);
  };

  useEffect(() => {
    checkAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'User logged in' : 'User logged out');
      
      // E-posta doğrulama sonrası oturum yönetimi
      if (event === 'SIGNED_IN' && session) {
        // Eğer kullanıcı e-posta doğrulama linkinden geliyorsa
        const urlParams = new URLSearchParams(window.location.search);
        const isEmailConfirmation = urlParams.get('type') === 'email_change' || 
                                   urlParams.get('type') === 'signup' ||
                                   window.location.hash.includes('type=email_change') ||
                                   window.location.hash.includes('type=signup');
        
        if (isEmailConfirmation) {
          // Mevcut oturumu kapat ve login sayfasına yönlendir
          supabase.auth.signOut().then(() => {
            setIsAuthenticated(false);
            navigate('/auth/login', { replace: true });
          });
          return;
        }
      }
      
      setIsAuthenticated(!!session);
      setIsAuthChecked(true);
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  // Wait until authentication status is checked
  if (!isAuthChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        {/* You can replace this with a more sophisticated loading spinner component */}
        <p className="text-lg text-gray-700">Loading application...</p>
      </div>
    );
  }

  const isAuthPage = location.pathname.startsWith('/auth');
  const isMobileSearchPage = location.pathname.startsWith('/mobile-search');
  const isSearchPage = location.pathname.startsWith('/search');
  const isNotificationsPage = location.pathname.startsWith('/notifications');
  const isMessagesPage = location.pathname === '/messages';
  const isMessageDetailPage = location.pathname.startsWith('/messages/') && location.pathname !== '/messages';
  const isCreateListPage = location.pathname.startsWith('/create-list');
  const isMobile = window.innerWidth < 768;
  const isHomePage = location.pathname === '/';

  const getMainPaddingTop = () => {
    if (isAuthPage || isMobileSearchPage || (isSearchPage && isMobile) || isMessageDetailPage || isMessagesPage) {
      return 'pt-0'; // No padding for auth, mobile search, message pages
    }

    if (isCreateListPage) {
      return 'pt-0'; // No padding for CreateList page since it has its own Header
    }

    if (isMobile) {
      // Mobile: Header (56) + SubHeader (60) = 116px
      return 'pt-[116px]';
    } else {
      // Desktop: Header (64) + SubHeader (64) = 128px
      return 'pt-32';
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header: Auth sayfalarında gizle */}
        {!isAuthPage && !isMobileSearchPage && !isMessageDetailPage && (
          <Header 
            onLogoClick={() => {
              // Always force ALL + desc ordering on logo click
              setIsLoading(true);
              navigate('/', {
                replace: true,
                state: {
                  category: 'all',
                  sortDirection: 'desc',
                  refresh: true,
                },
              });
              // Local state fallback to keep UI responsive
              setActiveCategory('all');
              setLists([]);
              setPage(0);
              setHasMore(true);
              scrollToTop();
            }}
          />
        )}
        
        {/* SubHeader: Auth, MobileSearch, CreateList ve mobil Search sayfalarında gizle */}
        {!isAuthPage && !isMobileSearchPage && !isMessageDetailPage && !isMessagesPage && !isNotificationsPage && !isCreateListPage && !(isSearchPage && isMobile) && isHomePage && (
          <SubHeader 
            activeCategory={activeCategory}
            onCategoryChange={(category) => {
              setIsLoading(true);
              setActiveCategory(category);
              setLists([]);
              setPage(0);
              setHasMore(true);
              scrollToTop();
            }}
          />
        )}
        {!isAuthPage && !isMobileSearchPage && !isMessageDetailPage && !isNotificationsPage && !isCreateListPage && !(isSearchPage && isMobile) && !isHomePage && <SubHeader />}
        
        {/* Main content area with conditional padding */}
        <main className={`flex-grow w-full ${getMainPaddingTop()}`}>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/email-confirmed" element={<EmailConfirmed />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/roadmap" element={<RoadMap />} />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated!}>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated!}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/select-category" element={<SelectCategory />} />
            <Route path="/create-list/:category" element={<CreateList />} />
            <Route
              path="/profile/:username"
              element={
                <Profile />
              }
            />
            <Route
              path="/profile"
              element={
                <Navigate to="/profile/me" replace />
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated!}>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated!}>
                  <MessageDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/movie/:id/:slug"
              element={<MovieDetails />}
            />
            <Route
              path="/series/:id/:slug"
              element={<SeriesDetails />}
            />
            <Route
              path="/book/:id/:slug"
              element={<BookDetails />}
            />
            <Route
              path="/game/:id/:slug"
              element={<GameDetails />}
            />
            <Route
              path="/person/:id/:slug"
              element={<PersonDetails />}
            />
            <Route
              path="/place/:id/:slug"
              element={<PlaceDetails />}
            />
            <Route
              path="/list-details"
              element={
                <ListDetails />
              }
            />
            <Route
              path="/list/:id"
              element={<ListDetails />}
            />
            <Route
              path="/:username/list/:slug"
              element={<ListDetails />}
            />
            <Route
              path="/:username/list/:slug/comments"
              element={<CommentsPage />}
            />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/movie/:id/:slug" element={<MovieDetails />} />
            <Route path="/series/:id" element={<SeriesDetails />} />
            <Route path="/series/:id/:slug" element={<SeriesDetails />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/book/:id/:slug" element={<BookDetails />} />
            <Route path="/game/:id" element={<GameDetails />} />
            <Route path="/game/:id/:slug" element={<GameDetails />} />
            <Route path="/person/:id" element={<PersonDetails />} />
            <Route path="/person/:id/:slug" element={<PersonDetails />} />
            <Route path="/place/:id" element={<PlaceDetails />} />
            <Route path="/place/:id/:slug" element={<PlaceDetails />} />
            <Route path="/list/:id" element={<ListDetails />} />
            <Route path="/search" element={<Search />} />
            <Route path="/mobile-search" element={<MobileSearch />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route
              path="/"
              element={
                <Dashboard 
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  lists={lists}
                  setLists={setLists}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  page={page}
                  setPage={setPage}
                  hasMore={hasMore}
                  setHasMore={setHasMore}
                  isLoadingMore={isLoadingMore}
                  setIsLoadingMore={setIsLoadingMore}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>


        {/* Mobil anasayfada BottomMenu'yu göster */}
        {!isAuthPage && !isMessageDetailPage && <BottomMenu />}
        <InstallPrompt />
      </div>
    </>
  );
}

// Basit özlü söz komponenti
function LoadingQuote() {
  const quotes = [
    'İyi fikirler paylaşınca çoğalır.',
    'Keşfetmek, ilk adımı atmaktır.',
    'Listeler fikirlerin haritasıdır.',
    'Bir öneri, yeni bir başlangıçtır.',
    'Bugün keşfedeceğin şey, yarının ilhamı olur.',
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  return (
    <p className="text-sm text-gray-600 max-w-sm">{quote}</p>
  );
}

function CommentsPage() {
  const navigate = useNavigate(); // Add useNavigate hook
  const { id } = useParams();

  return (
    <CommentModal
      isOpen={true}
      onClose={() => navigate(-1)} // Restore navigation
      listId={id || ''}
      onCommentAdded={() => {}}
      onCommentDeleted={() => {}}
      isMobile={true}
    />
  );
}

export default App;


