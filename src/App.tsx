import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from './lib/supabase-browser';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAndroidBackButtonHandler } from './hooks/useAndroidBackButtonHandler';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { EmailConfirmed } from './pages/auth/EmailConfirmed';
import { ResetPassword } from './pages/auth/ResetPassword';
import MobileSearch from './pages/MobileSearch';
import { Settings } from './pages/Settings';
import { Search } from './pages/Search';
import { RoadMap } from './pages/RoadMap';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Profile } from './pages/Profile';
import { Header } from './components/Header';
import { SubHeader } from './components/SubHeader';
import { Notifications } from './pages/Notifications';
import { SelectCategory } from './pages/SelectCategory';
import { CreateList } from './pages/CreateList';
import { ListDetails } from './pages/ListDetails';
import Messages from './pages/Messages';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { Footer } from './components/Footer';
import { MovieDetails } from './pages/details/MovieDetails';
import { SeriesDetails } from './pages/details/SeriesDetails';
import { BookDetails } from './pages/details/BookDetails';
import { GameDetails } from './pages/details/GameDetails';
import { PersonDetails } from './pages/details/PersonDetails';
import { PlaceDetails } from './pages/details/PlaceDetails';
import { BottomMenu } from './components/BottomMenu';
import { InstallPrompt } from './components/InstallPrompt';
import { CommentModal } from './components/CommentModal';
import { ListPreview } from './components/ListPreview';
import { getLists } from './lib/api';

// Sayfa yüklendiğinde en üste kaydırma fonksiyonu
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function Dashboard() {
  const [lists, setLists] = useState<any[]>([]);
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [lastViewedListId, setLastViewedListId] = useLocalStorage<string | null>('lastViewedListId', null);
  
  useEffect(() => {
    if (location.state?.refresh) {
      // Eğer refresh state'i varsa, listeleri sıfırla ve yeniden yükle
      setLists([]);
      setPage(0);
      setHasMore(true);
      
      // Sayfayı en üste kaydır
      scrollToTop();
      
      // Eğer forceCategory varsa, kategoriyi zorla değiştir
      if (location.state?.forceCategory) {
        setActiveCategory(location.state.forceCategory);
      }
      
      fetchLists();
    }
    if (location.state) {
      // Kategori değişikliği varsa
      if (location.state.category) {
        setActiveCategory(location.state.category); 
        // Sıralama yönünü kontrol et
        if (location.state.sortDirection) {
          setSortDirection(location.state.sortDirection);
        }
      }
      
      // Yenileme isteği varsa
      if (location.state.refresh) {
        setLists([]);
        setPage(0);
        setHasMore(true);
        fetchLists();
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
      if (lastViewedListId) {
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
  }, [activeCategory, sortDirection]);
  
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
      // Kategori işleme mantığını düzelt
      let categoryToFetch;
      if (activeCategory === 'all') {
        categoryToFetch = undefined;
      } else {
        // Kategori adını doğrudan kullan, böylece 'people' kategorisi de düzgün çalışır
        categoryToFetch = activeCategory;
      }
      console.log(`[App.tsx] Fetching lists with category: ${categoryToFetch}, page: ${page}, sortDirection: '${sortDirection}'`);
      const fetchedLists = await getLists(categoryToFetch, page, undefined, sortDirection);
      console.log(`[App.tsx] Fetched lists count: ${fetchedLists.length}`, fetchedLists);

      if (fetchedLists.length === 0) {
        setHasMore(false);
      } else {
        // İlk sayfa yükleniyorsa, listeleri sıfırla ve yeni listeleri göster
        if (page === 0) {
          setLists(fetchedLists);
          // Sayfayı en üste kaydır
          scrollToTop();
        } else {
          // Sonraki sayfalar için listelere ekle
          setLists(prev => [...prev, ...fetchedLists]);
        }
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!listContainerRef.current || !hasMore || isLoadingMore) return;

      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        fetchLists();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, page]);

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
          <div className="space-y-6 md:mt-0 mt-[-5px]">
            {lists.map((list) => (
              <div key={list.id} id={`list-${list.id}`}>
                <ListPreview list={list} items={list.items} onListClick={() => setLastViewedListId(list.id)} />
                {/* Her 5 listeden sonra reklam göster */}
                {lists.indexOf(list) % 5 === 4 && (
                  <div className="my-4">
                    {/* Reklam alanı kaldırıldı */}
                  </div>
                )}
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
                <p className="text-gray-500 text-lg">
                  {activeCategory === 'all' ? t('listPreview.noLists') : 
                   t('listPreview.noCategoryLists', { category: t(`common.categories.${activeCategory}`) })}
                </p>
              </div>
            )}
          </div>
        )}
        {!isLoading && lists.length > 0 && (
          <div className="mt-6">
            {/* Reklam alanı kaldırıldı */}
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
  const isMobile = window.innerWidth < 768;

  const getMainPaddingTop = () => {
    if (isAuthPage || isMobileSearchPage) {
      return 'pt-0'; // No padding for auth or mobile search pages
    }

    if (isMobile) {
      return 'pt-0'; // Mobile: Header/SubHeader in normal flow, so no main content padding needed
    } else { // Desktop
      return 'pt-[139px]'; // Desktop: Fixed Header/SubHeader, so padding is needed
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {!isAuthPage && <Header />}
        {!isAuthPage && <SubHeader />}
        {/* Main content area with conditional padding */}
        <main className={`flex-grow w-full ${getMainPaddingTop()}`}>
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
            <Route path="/series/:id" element={<SeriesDetails />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/game/:id" element={<GameDetails />} />
            <Route path="/person/:id" element={<PersonDetails />} />
            <Route path="/place/:id" element={<PlaceDetails />} />
            <Route path="/list/:id" element={<ListDetails />} />
            <Route path="/search" element={<Search />} />
            <Route path="/mobile-search" element={<MobileSearch />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route
              path="/"
              element={<Dashboard />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
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