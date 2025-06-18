import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from './lib/supabase-browser';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAndroidBackButtonHandler } from './hooks/useAndroidBackButtonHandler';
import { Header } from './components/Header';
import { SubHeader } from './components/SubHeader';
import { BottomMenu } from './components/BottomMenu';
import { Footer } from './components/Footer';
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

function Dashboard({ activeCategory, setActiveCategory, lists, setLists, isLoading, setIsLoading, page, setPage, sortDirection, setSortDirection, hasMore, setHasMore, isLoadingMore, setIsLoadingMore }: {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  lists: any[];
  setLists: (lists: any[] | ((prev: any[]) => any[])) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  hasMore: boolean;
  setHasMore: (hasMore: boolean) => void;
  isLoadingMore: boolean;
  setIsLoadingMore: (loading: boolean) => void;
}) {
  const location = useLocation();
  const listContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [lastViewedListId, setLastViewedListId] = useLocalStorage<string | null>('lastViewedListId', null);
  const [isMobile, setIsMobile] = useState(false);

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
      setSortDirection('desc');
    }
  }, []);
  
  useEffect(() => {
    if (location.state) {
      // Kategori değişikliği varsa
      if (location.state.category !== undefined) {
        setActiveCategory(location.state.category); 
      }
      
      // Sıralama yönünü kontrol et
      if (location.state.sortDirection) {
        setSortDirection(location.state.sortDirection);
      }
      
      // Yenileme isteği varsa
      if (location.state.refresh) {
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
    scrollToTop();
    fetchLists().then(() => { 
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
    
    // Supabase gerçek zamanlı abonelik
    const listsChannel = supabase
      .channel('public:lists')
      .on('postgres_changes', {
        event: '*', // insert, update, delete olaylarını dinle
        schema: 'public',
        table: 'lists'
      }, (payload) => {
        console.log('Lists changed:', payload);
        // Değişiklik olduğunda listeleri yeniden getir
        setLists([]);
        setPage(0);
        setHasMore(true);
        fetchLists();
      })
      .subscribe();
    
    return () => {
      // Bileşen unmount olduğunda aboneliği temizle
      supabase.removeChannel(listsChannel);
    };
  }, [activeCategory, sortDirection, isMobile]);
  
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
          
        // Yeni listeyi mevcut listelerin başına ekle
        const listWithProfile = {
          ...newList,
          profiles: profileData,
          items: items || []
        };
        
        // Listeleri güncelle (en yeni liste en üste gelecek şekilde)
        setLists(prevLists => [listWithProfile, ...prevLists]);
      })
      .subscribe();
      
    return () => {
      // Sayfa değiştiğinde aboneliği iptal et
      subscription.unsubscribe();
    };
  }, [activeCategory]);

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
    if (!listContainerRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
    const threshold = 300;

    // Mobilde tersine scroll için scrollTop < threshold kontrolü
    if (isMobile) {
      if (scrollTop < threshold) {
        fetchLists();
      }
    } else {
      // Desktop için normal scroll
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        fetchLists();
      }
    }
    };

  useEffect(() => {
    const container = listContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isLoadingMore, hasMore, isMobile]);

  // Tüm cihazlar için standart liste görünümü
  return (
    <div ref={listContainerRef} className="min-h-screen bg-gray-100"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[10px] pb-8"> 
        {isLoading ? (
          <div className="animate-pulse space-y-4 md:mt-0 mt-[-5px]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div className="flex space-x-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="w-[200px]">
                      <div className="aspect-[2/3] bg-gray-200 rounded-lg mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col-reverse space-y-reverse space-y-6 md:mt-0 mt-[-5px]">
            {lists.map((list) => (
              <div key={list.id} id={`list-${list.id}`}>
                <ListPreview list={list} items={list.items} onListClick={() => setLastViewedListId(list.id)} />
              </div>
            ))}
            {isLoadingMore && (
              <div className="flex justify-center py-4 order-first">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
              </div>
            )}
            {!hasMore && lists.length > 0 && (
              <div className="text-center py-4 text-gray-500 order-first">
                {t('listPreview.noMoreLists')}
              </div>
            )}
            {!hasMore && lists.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500 text-lg">
                  {activeCategory === 'all' ? t('listPreview.noLists') : 
                   t('listPreview.noCategoryLists', { category: t(`common.categories.${activeCategory}`) })}
                </p>
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  // Dashboard state'leri
  const [lists, setLists] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsAuthChecked(true); // Ensure auth status is updated on change
    });
    return () => {
      authListener?.subscription.unsubscribe(); // Correctly call unsubscribe
    };
  }, []);

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
  const isMobile = window.innerWidth < 768;
  const isHomePage = location.pathname === '/';

  const getMainPaddingTop = () => {
    if (isAuthPage || isMobileSearchPage || (isSearchPage && isMobile)) {
      return 'pt-0'; // No padding for auth, mobile search, or mobile search pages
    }

    if (isMobile) {
      // Mobil'de Header + SubHeader fixed olduğu için padding gerekli
      if (isHomePage) {
        return 'pt-[116px]'; // Header (56px) + SubHeader (60px) için padding
      }
      return 'pt-14'; // Mobile: Header yüksekliği kadar padding (56px)
    } else { // Desktop
      if (isHomePage) {
        return 'pt-32'; // Desktop: Header (64px) + SubHeader (64px) için padding
      }
      return 'pt-16'; // Desktop: Header yüksekliği kadar padding (64px)
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header: Auth sayfalarında gizle */}
        {!isAuthPage && (
          <Header 
            onLogoClick={isHomePage ? () => {
              setActiveCategory('all');
              setLists([]);
              setPage(0);
              setHasMore(true);
              setSortDirection('desc');
              scrollToTop();
            } : undefined}
          />
        )}
        
        {/* SubHeader: Auth, MobileSearch ve mobil Search sayfalarında gizle */}
        {!isAuthPage && !isMobileSearchPage && !(isSearchPage && isMobile) && isHomePage && (
          <SubHeader 
            activeCategory={activeCategory}
            onCategoryChange={(category) => {
              setActiveCategory(category);
              setLists([]);
              setPage(0);
              setHasMore(true);
              scrollToTop();
            }}
          />
        )}
        {!isAuthPage && !isMobileSearchPage && !(isSearchPage && isMobile) && !isHomePage && <SubHeader />}
        
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
                  sortDirection={sortDirection}
                  setSortDirection={setSortDirection}
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
        {/* Mobil anasayfada Footer'ı da gizle */}
        {!(isMobile && isHomePage) && <Footer />}
        {/* Mobil anasayfada BottomMenu'yu göster */}
        {!isAuthPage && <BottomMenu />}
        <InstallPrompt />
      </div>
    </>
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