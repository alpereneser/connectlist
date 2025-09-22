import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../hooks/useSearch';
import { getDefaultPlaceImage } from '../lib/api-places';

interface SearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
}

export function SearchResults({
  isOpen,
  onClose,
  searchQuery,
}: SearchResultsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: results, isLoading } = useSearch(searchQuery);
  const [activeTab, setActiveTab] = useState('all');

  // Mobile UX States
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Accessibility States
  const [announceMessage, setAnnounceMessage] = useState<string>('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const announceRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simplified touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStart) return;
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isMobile, touchStart]);

  // Screen Reader Announcements
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 1000);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      return;
    }
    
    const deltaY = touchStart.y - touchEnd.y;
    
    // Swipe down to close on mobile
    if (deltaY < -100) {
      onClose();
      announceToScreenReader('Arama sonuçları kapatıldı');
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [isMobile, touchStart, touchEnd, onClose, announceToScreenReader]);

  // Haptic Feedback
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

  // Type guard for search results
  const searchResults = results as {
    users?: any[];
    lists?: any[];
    movies?: any[];
    shows?: any[];
    people?: any[];
    games?: any[];
    books?: any[];
    places?: any[];
  } | undefined;

  // Calculate tab counts
  const tabs = useMemo(() => [
    { 
      id: 'all', 
      label: t('search.tabs.all'), 
      count: (searchResults?.users?.length || 0) + (searchResults?.lists?.length || 0) + (searchResults?.movies?.length || 0) + (searchResults?.shows?.length || 0) + (searchResults?.games?.length || 0) + (searchResults?.books?.length || 0) + (searchResults?.places?.length || 0)
    },
    { id: 'users', label: t('search.tabs.users'), count: searchResults?.users?.length || 0 },
    { id: 'lists', label: t('search.tabs.lists'), count: searchResults?.lists?.length || 0 },
    { id: 'movies', label: t('search.tabs.movies'), count: searchResults?.movies?.length || 0 },
    { id: 'series', label: t('common.categories.series'), count: searchResults?.shows?.length || 0 },
    { id: 'games', label: t('search.tabs.games'), count: searchResults?.games?.length || 0 },
    { id: 'books', label: t('search.tabs.books'), count: searchResults?.books?.length || 0 },
    { id: 'places', label: t('search.tabs.places'), count: searchResults?.places?.length || 0 },
  ], [searchResults, t]);

  // Handle tab change with accessibility
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    triggerHaptic('light');
    
    const selectedTab = tabs.find(tab => tab.id === tabId);
    if (selectedTab) {
      announceToScreenReader(`${selectedTab.label} sekmesi seçildi. ${selectedTab.count} sonuç bulundu.`);
    }
  }, [tabs, triggerHaptic, announceToScreenReader]);

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = index > 0 ? index - 1 : tabs.length - 1;
        tabRefs.current[prevIndex]?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = index < tabs.length - 1 ? index + 1 : 0;
        tabRefs.current[nextIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        tabRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastIndex = tabs.length - 1;
        tabRefs.current[lastIndex]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleTabChange(tabs[index].id);
        break;
    }
  }, [tabs, handleTabChange]);

  // Get current results based on active tab
  const getCurrentResults = useCallback(() => {
    const allResults: any[] = [];
    
    if (!searchResults) return allResults;
    
    if (activeTab === 'all') {
      if (searchResults.users) allResults.push(...searchResults.users.map((item: any) => ({ ...item, type: 'user' })));
      if (searchResults.lists) allResults.push(...searchResults.lists.map((item: any) => ({ ...item, type: 'list' })));
      if (searchResults.movies) allResults.push(...searchResults.movies.map((item: any) => ({ ...item, type: 'movie' })));
      if (searchResults.shows) allResults.push(...searchResults.shows.map((item: any) => ({ ...item, type: 'show' })));
      if (searchResults.games) allResults.push(...searchResults.games.map((item: any) => ({ ...item, type: 'game' })));
      if (searchResults.books) allResults.push(...searchResults.books.map((item: any) => ({ ...item, type: 'book' })));
      if (searchResults.places) allResults.push(...searchResults.places.map((item: any) => ({ ...item, type: 'place' })));
    } else {
      // Map tab id to the correct results key and item type
      const keyMap: Record<string, keyof typeof searchResults> = {
        series: 'shows',
        movies: 'movies',
        lists: 'lists',
        users: 'users',
        games: 'games',
        books: 'books',
        places: 'places',
      } as const;

      const typeMap: Record<string, string> = {
        series: 'show',
        movies: 'movie',
        lists: 'list',
        users: 'user',
        games: 'game',
        books: 'book',
        places: 'place',
      } as const;

      const resultKey = (keyMap[activeTab] || (activeTab as keyof typeof searchResults));
      const itemType = typeMap[activeTab] || activeTab.slice(0, -1);

      if (searchResults[resultKey]) {
        allResults.push(...(searchResults[resultKey] as any[]).map((item: any) => ({ ...item, type: itemType })));
      }
    }
    
    return allResults;
  }, [activeTab, searchResults]);

  // Handle result click with accessibility
  const handleResultClick = useCallback((result: any) => {
    triggerHaptic('medium');
    
    // Navigate based on result type
    switch (result.type) {
      case 'user':
        navigate(`/profile/${result.id}`);
        announceToScreenReader(`${result.full_name} profiline yönlendirildi`);
        break;
      case 'list':
        // Liste detayına git - doğrudan liste ID'si ile
        navigate(`/list/${result.id}`);
        announceToScreenReader(`${result.title} listesine yönlendirildi`);
        break;
      case 'movie':
        navigate(`/movie/${result.id}/${encodeURIComponent(result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        announceToScreenReader(`${result.title} film detayına yönlendirildi`);
        break;
      case 'show':
        navigate(`/series/${result.id}/${encodeURIComponent(result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        announceToScreenReader(`${result.name} dizi detayına yönlendirildi`);
        break;
      case 'person':
        navigate(`/person/${result.id}/${encodeURIComponent(result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        announceToScreenReader(`${result.name} kişi detayına yönlendirildi`);
        break;
      case 'game':
        navigate(`/game/${result.id}/${encodeURIComponent(result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        announceToScreenReader(`${result.name} oyun detayına yönlendirildi`);
        break;
      case 'book':
        navigate(`/book/${result.id}/${encodeURIComponent(result.volumeInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        announceToScreenReader(`${result.volumeInfo.title} kitap detayına yönlendirildi`);
        break;
      case 'place':
        navigate(`/place/${result.id}/${encodeURIComponent(result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
        announceToScreenReader(`${result.name} mekan detayına yönlendirildi`);
        break;
    }
    
    onClose();
  }, [navigate, triggerHaptic, announceToScreenReader, onClose]);



  // Handle close with accessibility
  const handleClose = useCallback(() => {
    onClose();
    announceToScreenReader('Arama sonuçları kapatıldı');
    triggerHaptic('light');
  }, [onClose, announceToScreenReader, triggerHaptic]);

  // Focus management - removed auto focus to allow continued typing

  // Announce results when they change
  useEffect(() => {
    if (!isLoading && searchQuery) {
      const totalResults = tabs.find(tab => tab.id === 'all')?.count || 0;
      
      if (totalResults > 0) {
        announceToScreenReader(`${searchQuery} için ${totalResults} sonuç bulundu`);
      } else {
        announceToScreenReader(`${searchQuery} için sonuç bulunamadı`);
      }
    }
  }, [isLoading, searchQuery, tabs, announceToScreenReader]);

  // Get filtered results for rendering
  const getFilteredResults = () => {
    const currentResults = getCurrentResults();
    
    return (
      <div className="space-y-2">
        {currentResults.map((item, index) => (
          <div
            key={`${item.type}-${item.id || index}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleResultClick(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleResultClick(item);
              }
            }}
          >
            <img
              src={item.type === 'user' ? (item.profile_image || '/default-avatar.png') :
                   item.type === 'list' ? '/list-icon.png' :
                   item.type === 'movie' ? (item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : '/movie-placeholder.png') :
                   item.type === 'show' ? (item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : '/show-placeholder.png') :
                   item.type === 'person' ? (item.profile_path ? `https://image.tmdb.org/t/p/w92${item.profile_path}` : '/person-placeholder.png') :
                   item.type === 'game' ? (item.background_image || '/game-placeholder.png') :
                   item.type === 'book' ? (item.volumeInfo?.imageLinks?.thumbnail || '/book-placeholder.png') :
                   item.type === 'place' ? getDefaultPlaceImage(item.types?.[0] || 'establishment') : '/default-placeholder.png'}
              alt={`${
                item.type === 'user' ? item.full_name :
                item.type === 'list' ? item.title :
                item.type === 'movie' ? item.title :
                item.type === 'show' ? item.name :
                item.type === 'person' ? item.name :
                item.type === 'game' ? item.name :
                item.type === 'book' ? item.volumeInfo?.title :
                item.type === 'place' ? item.name : 'Başlık'
              } resmi`}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = item.type === 'user' ? '/default-avatar.png' :
                            item.type === 'list' ? '/list-icon.png' :
                            item.type === 'movie' ? '/movie-placeholder.png' :
                            item.type === 'show' ? '/show-placeholder.png' :
                            item.type === 'person' ? '/person-placeholder.png' :
                            item.type === 'game' ? '/game-placeholder.png' :
                            item.type === 'book' ? '/book-placeholder.png' :
                            item.type === 'place' ? '/place-placeholder.png' : '/default-placeholder.png';
              }}
              style={{
                background: item.type === 'place' ? `url("data:image/svg+xml,${encodeURIComponent(`
                  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
                    <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/>
                    <circle cx='12' cy='10' r='3'/>
                  </svg>
                `)}") center/cover` : 'none'
              }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {item.type === 'user' ? item.full_name :
                 item.type === 'list' ? item.title :
                 item.type === 'movie' ? item.title :
                 item.type === 'show' ? item.name :
                 item.type === 'person' ? item.name :
                 item.type === 'game' ? item.name :
                 item.type === 'book' ? item.volumeInfo?.title :
                 item.type === 'place' ? item.name : 'Başlık'}
              </h4>
              <p className="text-sm text-gray-500 truncate">
                {item.type === 'user' ? `@${item.username}` :
                 item.type === 'list' ? t('search.itemCount', { count: item.items?.length || 0 }) :
                 item.type === 'movie' ? item.release_date?.split('-')[0] :
                 item.type === 'show' ? item.first_air_date?.split('-')[0] :
                 item.type === 'person' ? item.known_for_department :
                 item.type === 'game' ? item.released?.split('-')[0] :
                 item.type === 'book' ? item.volumeInfo?.authors?.join(', ') :
                 item.type === 'place' ? (item.address || item.city || item.country) : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Full Screen */}
      {isMobile ? (
        <div 
          ref={containerRef}
          className="fixed inset-0 z-50 bg-white md:hidden animate-in slide-in-from-top duration-300"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-results-title"
          aria-describedby="search-results-description"
        >


          {/* Header */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex items-center justify-between p-4">
              <h2 id="search-results-title" className="text-xl font-semibold">
                {searchQuery} için sonuçlar
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                aria-label="Arama sonuçlarını kapat"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Tabs */}
            <div className="px-4 pb-2">
              <div 
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                role="tablist"
                aria-label="Arama sonucu kategorileri"
              >
                {tabs.map((tab, tabIndex) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[tabIndex] = el; }}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`tabpanel-${tab.id}`}
                    aria-label={`${tab.label}${tab.count > 0 ? `, ${tab.count} sonuç` : ', sonuç yok'}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    id={`tab-${tab.id}`}
                    onKeyDown={(e) => handleTabKeyDown(e, tabIndex)}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div 
            className="flex-1 overflow-y-auto p-4"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            id={`tabpanel-${activeTab}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent" />
                <span className="ml-3 text-gray-600">Aranıyor...</span>
              </div>
            ) : (
              <>
                {getFilteredResults()}
                {!isLoading && getCurrentResults().length === 0 && searchQuery.trim() && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-gray-900">{t('common.noResults', { query: searchQuery })}</h3>
                    <p className="text-gray-500 mb-4">
                      {activeTab === 'all' 
                        ? t('search.noResults', { query: searchQuery })
                        : t('search.noResultsFor', { query: searchQuery, category: tabs.find(t => t.id === activeTab)?.label })
                      }
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('search.tryDifferentKeywords')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Desktop Dropdown */
        <div 
          ref={containerRef}
          className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg mt-1 max-h-[80vh] overflow-hidden z-50 hidden md:block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-results-title"
          aria-describedby="search-results-description"
          onMouseDown={(e) => {
            // Container için mouse down olayını engelleme
            e.stopPropagation();
          }}
        >
          {/* Screen Reader Announcements */}
          <div
            ref={announceRef}
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            role="status"
          >
            {announceMessage}
          </div>

          {/* Header with tabs */}
          <div className="flex items-center justify-between p-3 border-b">
            <div 
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
              role="tablist"
              aria-label="Arama sonucu kategorileri"
            >
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[index] = el; }}
                  onClick={() => handleTabChange(tab.id)}
                  onMouseDown={(e) => {
                    // Tab butonları için mouse down olayını engelleme
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  aria-label={`${tab.label}${tab.count > 0 ? `, ${tab.count} sonuç` : ', sonuç yok'}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  id={`tab-${tab.id}`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Arama sonuçlarını kapat"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Results content */}
          <div 
            className="overflow-y-auto p-3" 
            style={{ maxHeight: 'calc(80vh - 64px)' }}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            id={`tabpanel-${activeTab}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8" role="status" aria-label="Yükleniyor">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" aria-hidden="true" />
                <span className="sr-only">Arama sonuçları yükleniyor...</span>
              </div>
            ) : (
              <>
                <h2 id="search-results-title" className="sr-only">
                  {searchQuery} için arama sonuçları
                </h2>
                {getFilteredResults()}
                {!isLoading && getCurrentResults().length === 0 && searchQuery.trim() && (
                  <div className="text-center py-12" role="status">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-medium mb-2 text-gray-900">{t('search.noResults', { query: searchQuery })}</h3>
                    <p className="text-gray-500 text-sm mb-2">
                      {activeTab === 'all' 
                        ? t('search.noResults', { query: searchQuery })
                        : t('search.noResultsFor', { query: searchQuery, category: tabs.find(t => t.id === activeTab)?.label })
                      }
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('search.tryDifferentKeywords')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}