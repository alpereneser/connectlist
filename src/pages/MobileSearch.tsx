import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { searchTMDB, searchGames, searchBooks, searchUsers, searchLists, getDefaultPlaceImage } from '../lib/api';
import { Header } from '../components/Header';
import { SubHeader } from '../components/SubHeader';
import { BottomMenu } from '../components/BottomMenu';
import { useDebounce } from '../hooks/useDebounce';
import { TMDB_LANGUAGE, TMDB_ACCESS_TOKEN, RAWG_API_KEY, GOOGLE_BOOKS_API_KEY } from '../lib/api';

// Cache için anahtar - Şu anda kullanılmıyor ama ileride kullanılabilir
// const DISCOVER_CACHE_KEY = 'discover_content';
// const CACHE_DURATION = 1000 * 60 * 30; // 30 dakika

export function MobileSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  // Tip tanımlamaları
  type SearchResult = {
    id: string | number;
    title: string;
    subtitle?: string;
    image: string;
    type: string;
    year?: string;
  };

  // API yanıtları için tip tanımlamaları
  type TMDBItem = {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    media_type: string;
    release_date?: string;
    first_air_date?: string;
  };

  type GameItem = {
    id: number;
    name: string;
    background_image: string | null;
    released?: string;
  };

  type BookItem = {
    id: string;
    volumeInfo: {
      title: string;
      authors?: string[];
      publishedDate?: string;
      imageLinks?: {
        thumbnail?: string;
      };
    };
  };

  type UserItem = {
    id: string;
    full_name: string;
    username: string;
    avatar: string;
  };

  // API'den gelen liste sonuçları için tip tanımlaması
  type ApiListItem = {
    id: any;
    title: any;
    description: any;
    category: any;
    created_at: any;
    likes_count: any;
    items_count: any;
    profiles: {
      username: any;
      full_name: any;
      avatar: any;
    }[];
  };

  const [isSearching, setIsSearching] = useState(false);
  const [discoverContent, setDiscoverContent] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // Sayfa yüklendiğinde en üste kaydır
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setDiscoverContent([]);
        return;
      }

      // Arama sonuçları geldiğinde en üste kaydır
      window.scrollTo(0, 0);

      // Yeni arama yapıldığında sayfa numarasını sıfırla
      setPage(1);
      setHasMore(true);

      setIsSearching(true);
      setDiscoverContent([]);

      try {
        let results: SearchResult[] = [];
        let listItems: SearchResult[] = [];

        if (activeCategory === 'all' || activeCategory === 'movies' || activeCategory === 'series') {
          const tmdbResults = await searchTMDB(debouncedSearch);
          results = results.concat(tmdbResults.map((item: TMDBItem) => ({
            id: item.id,
            title: item.title || item.name || '',
            image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
            type: item.media_type === 'movie' ? 'movie' : (item.media_type === 'tv' ? 'series' : 'person'),
            year: item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4)
          })));
        }
        if (activeCategory === 'all' || activeCategory === 'games') {
          const gameResults = await searchGames(debouncedSearch);
          results = results.concat(gameResults.map((item: GameItem) => ({
            id: item.id,
            title: item.name,
            image: item.background_image || '',
            type: 'game',
            year: item.released?.substring(0, 4)
          })));
        }
        if (activeCategory === 'all' || activeCategory === 'books') {
          const bookResults = await searchBooks(debouncedSearch);
          results = results.concat(bookResults.map((item: BookItem) => ({
            id: item.id,
            title: item.volumeInfo.title,
            image: item.volumeInfo.imageLinks?.thumbnail || '',
            type: 'book',
            year: item.volumeInfo.publishedDate?.substring(0, 4)
          })));
        }
        if (activeCategory === 'all' || activeCategory === 'users') {
          const userResults = await searchUsers(debouncedSearch);
          results = results.concat(userResults.map((item: UserItem) => ({
            id: item.id,
            title: item.full_name,
            subtitle: `@${item.username}`,
            image: item.avatar || '',
            type: 'user'
          })));
        }
        if (activeCategory === 'all' || activeCategory === 'lists') {
          const fetchedLists = await searchLists(debouncedSearch);
          listItems = fetchedLists.map((item: ApiListItem): SearchResult => ({
            id: item.id,
            title: item.title,
            subtitle: item.description || (item.profiles?.[0]?.username ? `@${item.profiles[0].username}` : undefined),
            image: item.profiles?.[0]?.avatar || getDefaultPlaceImage(item.title),
            type: 'list',
            year: item.created_at ? new Date(item.created_at).getFullYear().toString() : undefined,
          }));
        }

        setDiscoverContent([...results, ...listItems]);
      } catch (error) {
        console.error('Arama sırasında hata:', error);
      } finally {
        setIsSearching(false);
      }
    };

    // Sayfa yüklendiğinde scroll olayını dinle
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

      // Sayfanın sonuna yaklaşıldığında ve daha fazla içerik varsa yeni içerik yükle
      if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !loadingMore && !isSearching) {
        loadMoreContent();
      }
    };

    // Scroll olayını dinle
    window.addEventListener('scroll', handleScroll);

    // Component unmount olduğunda event listener'ı kaldır
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };

    performSearch();
  }, [debouncedSearch, setPage, setHasMore, setDiscoverContent, setIsSearching]);

  // Daha fazla içerik yükleme fonksiyonu - useCallback ile sarıyoruz
  const loadMoreContent = useCallback(async () => {
    if (loadingMore || !hasMore || !debouncedSearch.trim()) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    let newResults: SearchResult[] = [];

    try {
      if (activeCategory === 'all' || activeCategory === 'lists') {
        const fetchedLists = await searchLists(debouncedSearch);
        const mappedLists = fetchedLists.map((item: ApiListItem): SearchResult => ({
          id: item.id,
          title: item.title,
          subtitle: item.description || (item.profiles?.[0]?.username ? `@${item.profiles[0].username}` : undefined),
          image: item.profiles?.[0]?.avatar || getDefaultPlaceImage(item.title),
          type: 'list',
          year: item.created_at ? new Date(item.created_at).getFullYear().toString() : undefined,
        }));
        newResults = newResults.concat(mappedLists.filter(ml => !discoverContent.some(dc => dc.id === ml.id && dc.type === 'list')));
      }

      if (newResults.length > 0) {
        setDiscoverContent(prev => [...prev, ...newResults]);
        setPage(nextPage);
      } else {
        if (activeCategory === 'all' || activeCategory === 'lists') {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Daha fazla içerik yüklenirken hata:', error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [activeCategory, debouncedSearch, discoverContent, hasMore, isLoading, loadingMore, page, setDiscoverContent, setHasMore, setLoadingMore, setPage]);

  // useEffect içinde loadMoreContent'i çağırmak için bağımlılıklar
  useEffect(() => {
    // Scroll olayını dinle
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

      // Sayfanın sonuna yaklaşıldığında ve daha fazla içerik varsa yeni içerik yükle
      if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !loadingMore && !isSearching) {
        loadMoreContent();
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadingMore, isSearching, loadMoreContent]);

  useEffect(() => {
    const fetchDiscoverContent = async () => {
      setIsLoading(true);
      try {
        let moviesData = [];
        let showsData = [];
        let gamesData = [];
        let booksData = [];

        try {
          const movieResponse = await fetch(
            `https://api.themoviedb.org/3/movie/popular?language=${TMDB_LANGUAGE}&page=1`,
            {
              headers: {
                'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              mode: 'cors'
            }
          );

          if (movieResponse.ok) {
            const data = await movieResponse.json();
            moviesData = data.results.map((item: TMDBItem) => ({
              ...item,
              media_type: 'movie'
            }));
          }
        } catch (error) {
          console.error('Error fetching popular movies:', error);
        }

        try {
          const tvResponse = await fetch(
            `https://api.themoviedb.org/3/tv/popular?language=${TMDB_LANGUAGE}&page=1`,
            {
              headers: {
                'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              mode: 'cors'
            }
          );

          if (tvResponse.ok) {
            const data = await tvResponse.json();
            showsData = data.results.map((item: TMDBItem) => ({
              ...item,
              media_type: 'tv'
            }));
          }
        } catch (error) {
          console.error('Error fetching popular TV shows:', error);
        }

        try {
          const gameResponse = await fetch(
            `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&page_size=20`,
            {
              headers: {
                'Accept': 'application/json'
              },
              mode: 'cors'
            }
          );

          if (gameResponse.ok) {
            const data = await gameResponse.json();
            gamesData = data.results || [];
          }
        } catch (error) {
          console.error('Error fetching popular games:', error);
        }

        try {
          const bookResponse = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=relevance&maxResults=20&key=${GOOGLE_BOOKS_API_KEY}`,
            {
              headers: {
                'Accept': 'application/json'
              },
              mode: 'cors'
            }
          );

          if (bookResponse.ok) {
            const data = await bookResponse.json();
            booksData = data.items || [];
          }
        } catch (error) {
          console.error('Error fetching popular books:', error);
        }

        const allContent = [
          ...moviesData.filter((item: any) => item.media_type === 'movie').map((item: any) => ({
            id: item.id,
            title: item.title,
            image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
            type: 'movie',
            year: item.release_date?.split('-')[0]
          })),
          ...showsData.filter((item: any) => item.media_type === 'tv').map((item: any) => ({
            id: item.id,
            title: item.name,
            image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
            type: 'series',
            year: item.first_air_date?.split('-')[0]
          })),
          ...gamesData.map((item: any) => ({
            id: item.id,
            title: item.name,
            image: item.background_image,
            type: 'game',
            year: item.released?.split('-')[0]
          })),
          ...booksData.map((item: any) => ({
            id: item.id,
            title: item.volumeInfo.title,
            image: item.volumeInfo.imageLinks?.thumbnail,
            type: 'book',
            year: item.volumeInfo.publishedDate?.split('-')[0]
          }))
        ].filter(item => item.image);

        const shuffled = allContent.sort(() => Math.random() - 0.5);
        setDiscoverContent(shuffled);
      } catch (error) {
        console.error('Error fetching discover content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoverContent();
  }, []);

  const handleContentClick = (item: any) => {
    switch (item.type) {
      case 'movie':
        navigate(`/movie/${item.id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        break;
      case 'series':
        navigate(`/series/${item.id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        break;
      case 'book':
        navigate(`/book/${item.id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        break;
      case 'game':
        navigate(`/game/${item.id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        break;
    }
  };

  return (
    <>
      <Header />
      <SubHeader activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <div className="fixed inset-0 bg-white z-30 pt-[75px] pb-[60px] md:hidden animate-in slide-in-from-top duration-300">
        <div className="sticky top-[30px] bg-white z-10 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
              ) : (
                <Search className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={'Ara...'}
              className="block w-full pl-10 pr-3 h-[50px] border-0 focus:outline-none focus:ring-0 text-sm"
            />
          </div>
        </div>
        <div className="px-4 pb-4 overflow-y-auto flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 140px)' }}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {discoverContent.slice(0, 20).map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleContentClick(item)}
                  className="cursor-pointer"
                >
                  <div className="aspect-[2/3] relative">
                    <img
                      src={item.image || 'https://via.placeholder.com/150x225'}
                      alt={item.title || `Keşfet öğesi ${index}`}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-1">
                    <h4 className="text-xs font-medium truncate">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomMenu />
    </>
  );
}

export default MobileSearch;