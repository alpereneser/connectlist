import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, MicOff, Clock, X, TrendingUp, SlidersHorizontal, Calendar, Globe, ArrowUpDown } from 'lucide-react';
import { searchTMDB, searchGames, searchBooks, searchUsers, searchLists, getDefaultPlaceImage } from '../lib/api';
import { Header } from '../components/Header';
import { SubHeader } from '../components/SubHeader';
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Mobile UX states
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [isVoiceSearchSupported, setIsVoiceSearchSupported] = useState(false);
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  
  // Touch handling
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Advanced Features
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'relevance', // relevance, date, rating, popularity
    dateRange: 'all', // all, today, week, month, year
    language: 'all' // all, tr, en
  });

  // Performance & Optimization
  const [searchCache, setSearchCache] = useState<Map<string, SearchResult[]>>(new Map());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMoreResults, setLoadingMoreResults] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Accessibility & Focus Management
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [announceMessage, setAnnounceMessage] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Sayfa yüklendiğinde en üste kaydır
    window.scrollTo(0, 0);
    
    // Load search history from localStorage
    const cachedHistory = localStorage.getItem('searchHistory');
    if (cachedHistory) {
      try {
        setSearchHistory(JSON.parse(cachedHistory));
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
    
    // Check voice search support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsVoiceSearchSupported(true);
    }
    
    // Load trending searches
    loadTrendingSearches();
  }, []);

  // Load trending searches from predefined popular searches
  const loadTrendingSearches = () => {
    const trending = [
      'Barbie', 'The Batman', 'Spider-Man', 'Marvel', 'Netflix',
      'House of Dragon', 'The Witcher', 'Stranger Things',
      'God of War', 'FIFA 23', 'Call of Duty', 'Minecraft',
      'Harry Potter', 'Lord of the Rings', 'Game of Thrones',
      'Istanbul', 'Cappadocia', 'Antalya', 'Paris', 'Tokyo'
    ];
    setTrendingSearches(trending.slice(0, 10));
  };

  // Generate search suggestions based on input
  const generateSearchSuggestions = (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Combine search history and trending for suggestions
    const allSuggestions = [...searchHistory, ...trendingSearches];
    const filtered = allSuggestions
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .filter(item => item.toLowerCase() !== query.toLowerCase())
      .slice(0, 5);
    
    // Add popular completions based on query
    const popularCompletions = getPopularCompletions(query);
    const combined = [...new Set([...filtered, ...popularCompletions])].slice(0, 8);
    
    setSearchSuggestions(combined);
    setShowSuggestions(combined.length > 0);
  };

  // Get popular completions for search query
  const getPopularCompletions = (query: string): string[] => {
    const completions: Record<string, string[]> = {
      'har': ['Harry Potter', 'Harley Quinn'],
      'spi': ['Spider-Man', 'Spirited Away'],
      'bat': ['Batman', 'The Batman'],
      'mar': ['Marvel', 'Mario'],
      'got': ['Game of Thrones', 'God of War'],
      'the': ['The Witcher', 'The Batman', 'The Last of Us'],
      'str': ['Stranger Things', 'Star Wars'],
      'min': ['Minecraft', 'Minions'],
      'cal': ['Call of Duty', 'California'],
      'ist': ['Istanbul', 'Italy'],
      'par': ['Paris', 'Paramount'],
      'tok': ['Tokyo', 'Tokyo Ghoul']
    };

    for (const [prefix, suggestions] of Object.entries(completions)) {
      if (query.toLowerCase().startsWith(prefix)) {
        return suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()));
      }
    }
    return [];
  };

  // Lazy loading image component with error handling
  const LazyImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
    fallbackSrc?: string;
  }> = ({ src, alt, className = '', fallbackSrc }) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !imageSrc) {
              setImageSrc(src);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }, [src, imageSrc]);

    const handleImageLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleImageError = () => {
      setIsLoading(false);
      setHasError(true);
      setImageErrors(prev => new Set([...prev, src]));
      
      // Try fallback image
      if (fallbackSrc && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
        setHasError(false);
      }
    };

    const getPlaceholderImage = (title: string) => {
      return `https://via.placeholder.com/400x600/f3f4f6/9ca3af?text=${encodeURIComponent(title.slice(0, 2).toUpperCase())}`;
    };

    return (
      <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
          </div>
        )}
        
        {imageSrc && (
          <img
            src={hasError ? getPlaceholderImage(alt) : imageSrc}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        )}
        
        {!imageSrc && (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-xs text-center p-2">{alt}</div>
          </div>
        )}
      </div>
    );
  };

  // Apply filters to search results
  const applyFilters = (results: SearchResult[]): SearchResult[] => {
    let filtered = [...results];
    
    // Apply language filter
    if (filters.language !== 'all') {
      // This is a simplified language filter - in real app you'd check actual content language
      // For now, we'll just pass through all results as language detection is complex
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      // This would require date information in the results
      // For now, we'll simulate filtering by keeping only newer items
      const now = new Date();
      const cutoffDates: Record<string, number> = {
        today: 1,
        week: 7,
        month: 30,
        year: 365
      };
      
      if (cutoffDates[filters.dateRange]) {
        // In a real app, you'd filter based on actual item dates
        // For demo, we'll just keep first 80% of results for non-'all' filters
        filtered = filtered.slice(0, Math.ceil(filtered.length * 0.8));
      }
    }
    
    // Apply sorting
    if (filters.sortBy === 'date') {
      // Sort by year (newest first)
      filtered.sort((a, b) => {
        const yearA = parseInt(a.year || '0');
        const yearB = parseInt(b.year || '0');
        return yearB - yearA;
      });
    } else if (filters.sortBy === 'popularity') {
      // Sort by type preference (movies > series > games > books > others)
      const typeOrder: Record<string, number> = {
        movie: 1,
        series: 2,
        game: 3,
        book: 4,
        user: 5,
        list: 6,
        person: 7
      };
      
      filtered.sort((a, b) => {
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      });
    } else if (filters.sortBy === 'rating') {
      // For demo, reverse the array (simulating rating sort)
      filtered.reverse();
    }
    // 'relevance' is default order, no sorting needed
    
    return filtered;
  };

  // Cache management functions
  const getCacheKey = (query: string, category: string, filters: any, page: number = 1) => {
    return `${query}-${category}-${JSON.stringify(filters)}-${page}`;
  };

  const getCachedResults = (query: string, category: string, filters: any, page: number = 1): SearchResult[] | null => {
    const key = getCacheKey(query, category, filters, page);
    return searchCache.get(key) || null;
  };

  const setCachedResults = (query: string, category: string, filters: any, results: SearchResult[], page: number = 1) => {
    const key = getCacheKey(query, category, filters, page);
    setSearchCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, results);
      
      // Limit cache size to 50 entries
      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey) {
          newCache.delete(firstKey);
        }
      }
      
      return newCache;
    });
  };

  // Network retry logic
  const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn();
        setNetworkError(null);
        setRetryCount(0);
        return result;
      } catch (error) {
        if (i === maxRetries - 1) {
          setNetworkError('Network hatası: Birkaç deneme sonrası başarısız oldu');
          setRetryCount(i + 1);
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Enhanced API calls with error handling and retries
  const searchWithRetry = async (searchFn: () => Promise<any>, fallbackData: any[] = []) => {
    try {
      return await retryWithBackoff(searchFn);
    } catch (error) {
      console.error('Search failed after retries:', error);
      
      // Return fallback data or empty array
      return fallbackData;
    }
  };

  // Haptic feedback
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Search history management
  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    
    try {
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    triggerHapticFeedback('light');
  };

  // Voice search
  const startVoiceSearch = () => {
    if (!isVoiceSearchSupported) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsVoiceSearchActive(true);
      triggerHapticFeedback('light');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      addToSearchHistory(transcript);
      triggerHapticFeedback('medium');
    };
    
    recognition.onerror = (event: any) => {
      console.error('Voice search error:', event.error);
      setIsVoiceSearchActive(false);
      triggerHapticFeedback('heavy');
    };
    
    recognition.onend = () => {
      setIsVoiceSearchActive(false);
    };
    
    recognition.start();
  };

  // Fetch discover content
  const fetchDiscoverContent = async () => {
    try {
      setIsLoading(true);
      
      let moviesData: any[] = [];
      let showsData: any[] = [];
      let gamesData: any[] = [];
      let booksData: any[] = [];

      // TMDB Popular Movies
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

      // TMDB Popular TV Shows
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

      // RAWG Popular Games
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

      // Google Books Popular
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

  // Pull to refresh
  const handlePullToRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    triggerHapticFeedback('medium');
    
    try {
      // Refresh discover content
      await fetchDiscoverContent();
    } catch (error) {
      console.error('Pull to refresh error:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  // Perform search effect with caching and infinite scroll
  useEffect(() => {
    const performSearch = async (isLoadMore = false) => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        setSearchError(null);
        setSearchPage(1);
        setHasMoreResults(true);
        return;
      }

      const currentPage = isLoadMore ? searchPage : 1;
      
      // Check cache first
      const cachedResults = getCachedResults(debouncedSearch, activeCategory, filters, currentPage);
      if (cachedResults && !isLoadMore) {
        setSearchResults(cachedResults);
        setHasSearched(true);
        setSearchError(null);
        return;
      }

      if (!isLoadMore) {
      setPage(1);
      setHasMore(true);
        setHasSearched(true);
      setIsSearching(true);
        setSearchResults([]);
        setSearchError(null);
        setSearchPage(1);
        setHasMoreResults(true);
      } else {
        setLoadingMoreResults(true);
      }

      try {
        let results: SearchResult[] = [];
        let listItems: SearchResult[] = [];

        // Execute searches with retry logic
        if (activeCategory === 'all' || activeCategory === 'movies' || activeCategory === 'series' || activeCategory === 'people') {
          try {
            const tmdbResults = await searchWithRetry(() => searchTMDB(debouncedSearch), []);
          results = results.concat(tmdbResults.map((item: TMDBItem) => ({
            id: item.id,
            title: item.title || item.name || '',
              image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 
                    (item.media_type === 'person' && (item as any).profile_path) ? `https://image.tmdb.org/t/p/w500${(item as any).profile_path}` : '',
            type: item.media_type === 'movie' ? 'movie' : (item.media_type === 'tv' ? 'series' : 'person'),
            year: item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4)
          })));
          } catch (error) {
            console.error('TMDB search error:', error);
        }
        }
        
        if (activeCategory === 'all' || activeCategory === 'games') {
          try {
            const gameResults = await searchWithRetry(() => searchGames(debouncedSearch), []);
          results = results.concat(gameResults.map((item: GameItem) => ({
            id: item.id,
            title: item.name,
            image: item.background_image || '',
            type: 'game',
            year: item.released?.substring(0, 4)
          })));
          } catch (error) {
            console.error('Games search error:', error);
        }
        }
        
        if (activeCategory === 'all' || activeCategory === 'books') {
          try {
            const bookResults = await searchWithRetry(() => searchBooks(debouncedSearch), []);
          results = results.concat(bookResults.map((item: BookItem) => ({
            id: item.id,
            title: item.volumeInfo.title,
            image: item.volumeInfo.imageLinks?.thumbnail || '',
            type: 'book',
            year: item.volumeInfo.publishedDate?.substring(0, 4)
          })));
          } catch (error) {
            console.error('Books search error:', error);
        }
        }
        
        if (activeCategory === 'all' || activeCategory === 'users') {
          try {
            const userResults = await searchWithRetry(() => searchUsers(debouncedSearch), []);
          results = results.concat(userResults.map((item: UserItem) => ({
            id: item.id,
            title: item.full_name,
            subtitle: `@${item.username}`,
            image: item.avatar || '',
            type: 'user'
          })));
          } catch (error) {
            console.error('Users search error:', error);
        }
        }
        
        if (activeCategory === 'all' || activeCategory === 'lists') {
          try {
            const fetchedLists = await searchWithRetry(() => searchLists(debouncedSearch), []);
          listItems = fetchedLists.map((item: ApiListItem): SearchResult => ({
            id: item.id,
            title: item.title,
            subtitle: item.description || (item.profiles?.[0]?.username ? `@${item.profiles[0].username}` : undefined),
            image: item.profiles?.[0]?.avatar || getDefaultPlaceImage(item.title),
            type: 'list',
            year: item.created_at ? new Date(item.created_at).getFullYear().toString() : undefined,
          }));
          } catch (error) {
            console.error('Lists search error:', error);
          }
        }

        const allResults = [...results, ...listItems];
        
        // Apply filters to results
        const filteredResults = applyFilters(allResults);
        
        if (isLoadMore) {
          // Append to existing results for infinite scroll
          setSearchResults(prev => [...prev, ...filteredResults]);
          setSearchPage(prev => prev + 1);
          
          // Check if we have more results (if current results < 20, probably no more)
          if (filteredResults.length < 20) {
            setHasMoreResults(false);
          }
        } else {
          setSearchResults(filteredResults);
          setSearchPage(2); // Next page for load more
          
          // Cache results
          setCachedResults(debouncedSearch, activeCategory, filters, filteredResults, 1);
          
          // Add to search history if results found
          if (filteredResults.length > 0) {
            addToSearchHistory(debouncedSearch);
          }
        }
        
        // If no results found, set error message
        if (filteredResults.length === 0 && !isLoadMore) {
          setSearchError(`"${debouncedSearch}" için sonuç bulunamadı`);
        }
        
      } catch (error) {
        console.error('Arama sırasında hata:', error);
        setSearchError('Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsSearching(false);
        setLoadingMoreResults(false);
      }
    };

    performSearch();
  }, [debouncedSearch, activeCategory, filters]);

  // Infinite scroll for search results
  const loadMoreSearchResults = useCallback(async () => {
    if (loadingMoreResults || !hasMoreResults || !hasSearched || !debouncedSearch.trim()) return;

    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        setSearchError(null);
        setSearchPage(1);
        setHasMoreResults(true);
        return;
      }

      const currentPage = searchPage;
      
      setLoadingMoreResults(true);

      try {
        let results: SearchResult[] = [];
        let listItems: SearchResult[] = [];

        // Execute searches with retry logic - with pagination if APIs support it
        if (activeCategory === 'all' || activeCategory === 'movies' || activeCategory === 'series' || activeCategory === 'people') {
          try {
            const tmdbResults = await searchWithRetry(() => searchTMDB(debouncedSearch), []);
            results = results.concat(tmdbResults.map((item: TMDBItem) => ({
              id: item.id,
              title: item.title || item.name || '',
              image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 
                    (item.media_type === 'person' && (item as any).profile_path) ? `https://image.tmdb.org/t/p/w500${(item as any).profile_path}` : '',
              type: item.media_type === 'movie' ? 'movie' : (item.media_type === 'tv' ? 'series' : 'person'),
              year: item.release_date?.substring(0, 4) || item.first_air_date?.substring(0, 4)
            })));
          } catch (error) {
            console.error('TMDB search error:', error);
          }
        }

        const allResults = [...results, ...listItems];
        const filteredResults = applyFilters(allResults);
        
        // Filter out results we already have
        const newResults = filteredResults.filter(newItem => 
          !searchResults.some(existingItem => 
            existingItem.id === newItem.id && existingItem.type === newItem.type
          )
        );
        
        if (newResults.length > 0) {
          setSearchResults(prev => [...prev, ...newResults]);
          setSearchPage(prev => prev + 1);
        } else {
          setHasMoreResults(false);
        }
        
      } catch (error) {
        console.error('Load more error:', error);
        setHasMoreResults(false);
      } finally {
        setLoadingMoreResults(false);
      }
    };

    await performSearch();
  }, [searchPage, hasMoreResults, loadingMoreResults, hasSearched, debouncedSearch, activeCategory, filters, searchResults]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const deltaY = e.touches[0].clientY - touchStart.y;
    
    // Pull to refresh only when at top and not searching
    if (!hasSearched && window.scrollY === 0 && deltaY > 0 && !isRefreshing) {
      e.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(deltaY * 0.5, 80));
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 50) {
      handlePullToRefresh();
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
    setIsSwiping(false);
  };

  // Load discover content on mount
  useEffect(() => {
    if (!hasSearched && discoverContent.length === 0) {
      fetchDiscoverContent();
    }
  }, [hasSearched, discoverContent.length]);

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

      // Discover content için infinite scroll
      if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !loadingMore && !isSearching && !hasSearched) {
        loadMoreContent();
      }
      
      // Search results için infinite scroll
      if (scrollHeight - scrollTop - clientHeight < 300 && hasMoreResults && !loadingMoreResults && !isSearching && hasSearched) {
        loadMoreSearchResults();
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadingMore, isSearching, loadMoreContent, hasMoreResults, loadingMoreResults, hasSearched, loadMoreSearchResults]);

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
      case 'user':
        navigate(`/profile/${item.subtitle?.replace('@', '')}`);
        break;
      case 'list':
        navigate(`/list/${item.id}`);
        break;
      case 'person':
        navigate(`/person/${item.id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        break;
    }
  };

  // Filter search results based on active category
  const getFilteredSearchResults = () => {
    if (activeCategory === 'all') {
      return searchResults;
    }
    
    // Handle category mapping
    const categoryMap: Record<string, string[]> = {
      'movies': ['movie'],
      'series': ['series'],
      'books': ['book'],
      'games': ['game'],
      'users': ['user'],
      'lists': ['list'],
      'people': ['person']
    };
    
    const allowedTypes = categoryMap[activeCategory] || [activeCategory];
    return searchResults.filter(item => allowedTypes.includes(item.type));
  };

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 1000);
  };

  // Keyboard navigation for suggestions
  const handleKeyboardNavigation = (e: React.KeyboardEvent) => {
    const suggestions = showSuggestions ? searchSuggestions : (showSearchHistory ? searchHistory : []);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = focusedSuggestionIndex < suggestions.length - 1 ? focusedSuggestionIndex + 1 : 0;
      setFocusedSuggestionIndex(nextIndex);
      
      if (suggestions[nextIndex]) {
        announceToScreenReader(`Öneri: ${suggestions[nextIndex]}`);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = focusedSuggestionIndex > 0 ? focusedSuggestionIndex - 1 : suggestions.length - 1;
      setFocusedSuggestionIndex(prevIndex);
      
      if (suggestions[prevIndex]) {
        announceToScreenReader(`Öneri: ${suggestions[prevIndex]}`);
      }
    } else if (e.key === 'Enter' && focusedSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedSuggestion = suggestions[focusedSuggestionIndex];
      if (selectedSuggestion) {
        setSearchQuery(selectedSuggestion);
        setShowSuggestions(false);
        setShowSearchHistory(false);
        setFocusedSuggestionIndex(-1);
        announceToScreenReader(`Seçildi: ${selectedSuggestion}`);
        triggerHapticFeedback('medium');
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowSearchHistory(false);
      setFocusedSuggestionIndex(-1);
      searchInputRef.current?.focus();
      announceToScreenReader('Öneriler kapatıldı');
    } else if (e.key === 'Tab') {
      setShowSuggestions(false);
      setShowSearchHistory(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  // Focus management for search input
  const handleSearchInputFocus = () => {
    setIsSearchInputFocused(true);
    if (searchQuery.trim()) {
      generateSearchSuggestions(searchQuery);
    } else if (searchHistory.length > 0) {
      setShowSearchHistory(true);
      announceToScreenReader(`${searchHistory.length} geçmiş arama mevcut`);
    }
  };

  const handleSearchInputBlur = () => {
    setIsSearchInputFocused(false);
    // Delay hiding suggestions to allow clicking
    setTimeout(() => {
      setShowSuggestions(false);
      setShowSearchHistory(false);
      setFocusedSuggestionIndex(-1);
    }, 200);
  };

  // Voice search accessibility
  const handleVoiceSearchWithAccessibility = () => {
    if (!isVoiceSearchSupported) {
      announceToScreenReader('Sesli arama bu cihazda desteklenmiyor');
      return;
    }
    
    announceToScreenReader('Sesli arama başlatılıyor');
    startVoiceSearch();
  };

  // Enhanced search function with accessibility
  const handleSearchWithAccessibility = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    setShowSearchHistory(false);
    setFocusedSuggestionIndex(-1);
    
    if (query.trim()) {
      announceToScreenReader(`Aranıyor: ${query}`);
    }
  };

  return (
    <>
      {/* Screen Reader Announcements */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {announceMessage}
      </div>
      
      {/* Hidden Help Text */}
      <div id="search-help" className="sr-only">
        Arama yapmak için kelime yazın. Öneriler için yukarı aşağı ok tuşlarını, seçmek için Enter tuşunu kullanın. 
        Sesli arama için mikrofon butonuna basın. Filtreler için filtre butonunu kullanın.
      </div>
      
      <Header />
      <SubHeader activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      
      <div 
        className="fixed inset-0 bg-white z-30 md:hidden animate-in slide-in-from-top duration-300 safe-all"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top) + var(--subheader-height))',
          paddingBottom: 'calc(var(--safe-area-inset-bottom) + 60px)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                
                // Clear search results when query is empty
                if (!value.trim()) {
                  setSearchResults([]);
                  setHasSearched(false);
                  setSearchError(null);
                  setShowSearchHistory(searchHistory.length > 0);
                  setShowSuggestions(false);
                  setFocusedSuggestionIndex(-1);
                } else {
                  setShowSearchHistory(false);
                  // Generate suggestions for non-empty queries
                  generateSearchSuggestions(value);
                }
              }}
              onKeyDown={handleKeyboardNavigation}
              onFocus={handleSearchInputFocus}
              onBlur={handleSearchInputBlur}
              placeholder={'Ara...'}
              className="block w-full pl-10 pr-20 h-[50px] border-0 focus:outline-none focus:ring-0 text-sm"
              aria-label="Arama kutus. Film, dizi, kitap, oyun ve kullanıcı arayabilirsiniz"
              aria-describedby="search-help"
              aria-expanded={showSuggestions || showSearchHistory}
              aria-autocomplete="list"
              aria-activedescendant={
                focusedSuggestionIndex >= 0 
                  ? `suggestion-${focusedSuggestionIndex}` 
                  : undefined
              }
              role="combobox"
              autoComplete="off"
            />
            
            {/* Action Buttons */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
              {/* Filters Button */}
              <button
                onClick={() => {
                  setShowFilters(!showFilters);
                  triggerHapticFeedback('light');
                  announceToScreenReader(showFilters ? 'Filtreler kapatıldı' : 'Filtreler açıldı');
                }}
                className={`p-2 rounded-full transition-colors ${
                  showFilters 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'text-gray-400 hover:text-orange-500 hover:bg-gray-100'
                }`}
                aria-label={showFilters ? 'Filtreleri kapat' : 'Filtreleri aç'}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
                tabIndex={0}
              >
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {/* Voice Search Button */}
              {isVoiceSearchSupported && (
                <button
                  onClick={handleVoiceSearchWithAccessibility}
                  disabled={isVoiceSearchActive}
                  className={`p-2 rounded-full transition-colors ${
                    isVoiceSearchActive 
                      ? 'bg-red-100 text-red-600' 
                      : 'text-gray-400 hover:text-orange-500 hover:bg-gray-100'
                  }`}
                  aria-label={isVoiceSearchActive ? 'Sesli aramayı durdur' : 'Sesli arama başlat'}
                  aria-pressed={isVoiceSearchActive}
                  tabIndex={0}
                >
                  {isVoiceSearchActive ? (
                    <MicOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Mic className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              )}
          </div>
        </div>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div 
          className="bg-white border-b border-gray-200 p-4 space-y-4"
          id="filters-panel"
          role="region"
          aria-label="Arama filtreleri"
        >
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="sort-label">
              <ArrowUpDown className="h-4 w-4 inline mr-2" aria-hidden="true" />
              Sıralama
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="sort-label">
              {[
                { value: 'relevance', label: 'İlgili' },
                { value: 'date', label: 'Tarih' },
                { value: 'rating', label: 'Puan' },
                { value: 'popularity', label: 'Popüler' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, sortBy: option.value }));
                    triggerHapticFeedback('light');
                    announceToScreenReader(`Sıralama: ${option.label} seçildi`);
                  }}
                  className={`p-2 text-sm rounded-lg border transition-colors ${
                    filters.sortBy === option.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  role="radio"
                  aria-checked={filters.sortBy === option.value}
                  aria-label={`Sıralama: ${option.label}`}
                  tabIndex={0}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="date-label">
              <Calendar className="h-4 w-4 inline mr-2" aria-hidden="true" />
              Tarih Aralığı
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="date-label">
              {[
                { value: 'all', label: 'Tümü' },
                { value: 'today', label: 'Bugün' },
                { value: 'week', label: 'Bu Hafta' },
                { value: 'month', label: 'Bu Ay' },
                { value: 'year', label: 'Bu Yıl' }
              ].slice(0, 4).map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, dateRange: option.value }));
                    triggerHapticFeedback('light');
                    announceToScreenReader(`Tarih aralığı: ${option.label} seçildi`);
                  }}
                  className={`p-2 text-sm rounded-lg border transition-colors ${
                    filters.dateRange === option.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  role="radio"
                  aria-checked={filters.dateRange === option.value}
                  aria-label={`Tarih aralığı: ${option.label}`}
                  tabIndex={0}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="language-label">
              <Globe className="h-4 w-4 inline mr-2" aria-hidden="true" />
              Dil
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="language-label">
              {[
                { value: 'all', label: 'Tümü' },
                { value: 'tr', label: 'Türkçe' },
                { value: 'en', label: 'İngilizce' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilters(prev => ({ ...prev, language: option.value }));
                    triggerHapticFeedback('light');
                    announceToScreenReader(`Dil: ${option.label} seçildi`);
                  }}
                  className={`p-2 text-sm rounded-lg border transition-colors ${
                    filters.language === option.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  role="radio"
                  aria-checked={filters.language === option.value}
                  aria-label={`Dil: ${option.label}`}
                  tabIndex={0}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Apply Filters Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                setShowFilters(false);
                // Re-trigger search with new filters
                if (searchQuery.trim()) {
                  // Trigger a re-search with current query and new filters
                  setHasSearched(false);
                  setTimeout(() => setHasSearched(true), 100);
                }
                triggerHapticFeedback('medium');
                announceToScreenReader('Filtreler uygulandı');
              }}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              aria-label="Seçilen filtreleri uygula ve arama yap"
              tabIndex={0}
            >
              Filtreleri Uygula
            </button>
          </div>
        </div>
      )}
      
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && !hasSearched && (
        <div 
          className="fixed top-[139px] left-0 right-0 z-40 flex justify-center"
          style={{ transform: `translateY(${isPulling ? pullDistance - 50 : 0}px)` }}
        >
          <div className="bg-white rounded-full shadow-lg p-3 border border-gray-200">
            <div className={`animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent ${
              isRefreshing ? 'animate-spin' : ''
            }`} />
          </div>
        </div>
      )}
      
      <div className="px-4 pb-4 overflow-y-auto content-height-dvh">
        {/* Voice Search Active Indicator */}
        {isVoiceSearchActive && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-search-title"
            aria-describedby="voice-search-description"
          >
            <div className="bg-white rounded-2xl p-8 mx-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-red-600 animate-pulse" aria-hidden="true" />
              </div>
              <h3 id="voice-search-title" className="text-lg font-semibold mb-2">Dinliyorum...</h3>
              <p id="voice-search-description" className="text-gray-600">Aranacak kelimeyi söyleyin</p>
            </div>
          </div>
        )}
        
        {/* Search Results */}
        {hasSearched ? (
          <div>
            {isSearching ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : (
              <>
                {/* Search Results Count */}
                {searchResults.length > 0 && (
                  <div className="mb-4 text-sm text-gray-600" role="status" aria-live="polite">
                    {getFilteredSearchResults().length} sonuç bulundu
                  </div>
                )}
                
                {/* Error State */}
                {searchError && (
                  <div className="flex flex-col items-center justify-center py-12" role="alert" aria-live="assertive">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Sonuç bulunamadı</h3>
                    <p className="text-gray-500 text-center">{searchError}</p>
                  </div>
                )}
                
                {/* Loading More Search Results */}
                {loadingMoreResults && (
                  <div className="flex justify-center py-6">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                      <span className="text-gray-600 text-sm">Daha fazla sonuç yükleniyor...</span>
                    </div>
                  </div>
                )}
                
                {/* No More Results */}
                {!hasMoreResults && searchResults.length > 10 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">Tüm sonuçlar gösterildi</p>
                  </div>
                )}
                
                {/* Network Error Fallback */}
                {networkError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-red-700 font-medium text-sm">Bağlantı Hatası</span>
                    </div>
                    <p className="text-red-600 text-sm mb-3">{networkError}</p>
                    <button
                      onClick={() => {
                        setNetworkError(null);
                        setRetryCount(0);
                        // Retry search
                        if (hasSearched && debouncedSearch.trim()) {
                          setHasSearched(false);
                          setTimeout(() => setHasSearched(true), 100);
                        }
                        triggerHapticFeedback('medium');
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      Tekrar Dene {retryCount > 0 && `(${retryCount})`}
                    </button>
                  </div>
                )}
                
                {/* Search Results Grid */}
                {getFilteredSearchResults().length > 0 && (
                  <div className="space-y-3" role="list" aria-label="Arama sonuçları">
                    {getFilteredSearchResults().map((item, index) => (
                      <div
                        key={`${item.id}-${item.type}`}
                        onClick={() => {
                          triggerHapticFeedback('light');
                          handleContentClick(item);
                          announceToScreenReader(`${item.title} seçildi`);
                        }}
                        className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        role="listitem"
                        tabIndex={0}
                        aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}, ${
                          item.type === 'movie' ? 'Film' : 
                          item.type === 'series' ? 'Dizi' : 
                          item.type === 'game' ? 'Oyun' : 
                          item.type === 'book' ? 'Kitap' :
                          item.type === 'user' ? 'Kullanıcı' :
                          item.type === 'list' ? 'Liste' : 'Kişi'
                        }${item.year ? `, ${item.year}` : ''}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            triggerHapticFeedback('light');
                            handleContentClick(item);
                            announceToScreenReader(`${item.title} seçildi`);
                          }
                        }}
                      >
                        <div className="flex">
                          <div className="w-24 h-32 flex-shrink-0">
                            <LazyImage
                              src={item.image || getDefaultPlaceImage(item.title)}
                              alt={item.title}
                              className="w-full h-full"
                              fallbackSrc={getDefaultPlaceImage(item.title)}
                            />
                          </div>
                          <div className="p-4 flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2 truncate">
                              {item.title}
                            </h3>
                            <div className="flex items-center justify-between">
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                {item.type === 'movie' ? 'Film' : 
                                 item.type === 'series' ? 'Dizi' : 
                                 item.type === 'game' ? 'Oyun' : 
                                 item.type === 'book' ? 'Kitap' :
                                 item.type === 'user' ? 'Kullanıcı' :
                                 item.type === 'list' ? 'Liste' : 'Kişi'}
                              </span>
                              {item.year && (
                                <span className="text-xs text-gray-400">
                                  {item.year}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Discover Content */
          <div className="flex flex-col items-center justify-center h-full">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : (
              <>
                {/* Trending Searches */}
                {trendingSearches.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      <h3 className="text-base font-semibold">Trend Aramalar</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.slice(0, 8).map((trend, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(trend);
                            triggerHapticFeedback('light');
                          }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                        >
                          {trend}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold mb-2">Keşfet</h2>
                  <p className="text-gray-500">Popüler içerikleri keşfet</p>
                </div>
                <div className="grid grid-cols-5 gap-3 w-full max-w-lg">
              {discoverContent.slice(0, 20).map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                      onClick={() => {
                        triggerHapticFeedback('light');
                        handleContentClick(item);
                      }}
                      className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="aspect-[2/3] w-full">
                        <LazyImage
                          src={item.image || getDefaultPlaceImage(item.title)}
                          alt={item.title}
                          className="w-full h-full"
                          fallbackSrc={getDefaultPlaceImage(item.title)}
                    />
                  </div>
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900 text-sm truncate mb-1">
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {item.type === 'movie' ? 'Film' : 
                             item.type === 'tv' ? 'Dizi' : 
                             item.type === 'game' ? 'Oyun' : 
                             item.type === 'book' ? 'Kitap' : 'İçerik'}
                          </span>
                          {item.year && (
                            <span className="text-xs text-gray-400">
                              {item.year}
                            </span>
                          )}
                        </div>
                  </div>
                </div>
              ))}
            </div>
              </>
          )}
        </div>
        )}
      </div>
    </>
  );
}

export default MobileSearch;
