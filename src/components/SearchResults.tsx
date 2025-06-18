import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, MessageCircle } from 'lucide-react';
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
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Accessibility States
  const [announceMessage, setAnnounceMessage] = useState<string>('');
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);
  const [focusedTabIndex, setFocusedTabIndex] = useState(0);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  // Touch handling for mobile pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    setIsPulling(false);
    setPullDistance(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || !isMobile) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStart.y;
    
    // Pull to refresh when scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop === 0 && deltaY > 0) {
      e.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(deltaY * 0.5, 80));
    }
  }, [touchStart, isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (isPulling && pullDistance > 50) {
      // Trigger refresh
      triggerHaptic('medium');
      // Reset search or refresh results
      setTimeout(() => {
        setIsPulling(false);
        setPullDistance(0);
      }, 300);
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
    setTouchStart(null);
  }, [isPulling, pullDistance]);

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

  // Screen Reader Announcements
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 1000);
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
      count: (searchResults?.users?.length || 0) + (searchResults?.lists?.length || 0) + (searchResults?.movies?.length || 0) + (searchResults?.shows?.length || 0) + (searchResults?.people?.length || 0) + (searchResults?.games?.length || 0) + (searchResults?.books?.length || 0) + (searchResults?.places?.length || 0)
    },
    { id: 'users', label: t('search.tabs.users'), count: searchResults?.users?.length || 0 },
    { id: 'lists', label: t('search.tabs.lists'), count: searchResults?.lists?.length || 0 },
    { id: 'movies', label: t('search.tabs.movies'), count: searchResults?.movies?.length || 0 },
    { id: 'shows', label: t('search.tabs.shows'), count: searchResults?.shows?.length || 0 },
    { id: 'people', label: t('search.tabs.people'), count: searchResults?.people?.length || 0 },
    { id: 'games', label: t('search.tabs.games'), count: searchResults?.games?.length || 0 },
    { id: 'books', label: t('search.tabs.books'), count: searchResults?.books?.length || 0 },
    { id: 'places', label: t('search.tabs.places'), count: searchResults?.places?.length || 0 },
  ], [searchResults, t]);

  // Handle tab change with accessibility
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setFocusedResultIndex(-1);
    triggerHaptic('light');
    
    const selectedTab = tabs.find(tab => tab.id === tabId);
    if (selectedTab) {
      announceToScreenReader(`${selectedTab.label} sekmesi seçildi. ${selectedTab.count} sonuç bulundu.`);
    }
    
    // Tab değişiminden sonra search input'a focus'u geri ver
    setTimeout(() => {
      const searchInput = document.querySelector('input[role="combobox"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }, [tabs, triggerHaptic, announceToScreenReader]);

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = index > 0 ? index - 1 : tabs.length - 1;
        setFocusedTabIndex(prevIndex);
        tabRefs.current[prevIndex]?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = index < tabs.length - 1 ? index + 1 : 0;
        setFocusedTabIndex(nextIndex);
        tabRefs.current[nextIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedTabIndex(0);
        tabRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastIndex = tabs.length - 1;
        setFocusedTabIndex(lastIndex);
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
      if (searchResults.people) allResults.push(...searchResults.people.map((item: any) => ({ ...item, type: 'person' })));
      if (searchResults.games) allResults.push(...searchResults.games.map((item: any) => ({ ...item, type: 'game' })));
      if (searchResults.books) allResults.push(...searchResults.books.map((item: any) => ({ ...item, type: 'book' })));
      if (searchResults.places) allResults.push(...searchResults.places.map((item: any) => ({ ...item, type: 'place' })));
    } else {
      const resultKey = activeTab as keyof typeof searchResults;
      if (searchResults[resultKey]) {
        allResults.push(...(searchResults[resultKey] as any[]).map((item: any) => ({ ...item, type: activeTab.slice(0, -1) })));
      }
    }
    
    return allResults;
  }, [activeTab, searchResults]);

  // Handle result click with accessibility
  const handleResultClick = useCallback((result: any, index: number) => {
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

  // Keyboard navigation for results
  const handleResultKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const currentResults = getCurrentResults();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = index < currentResults.length - 1 ? index + 1 : 0;
        setFocusedResultIndex(nextIndex);
        resultRefs.current[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = index > 0 ? index - 1 : currentResults.length - 1;
        setFocusedResultIndex(prevIndex);
        resultRefs.current[prevIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedResultIndex(0);
        resultRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastIndex = currentResults.length - 1;
        setFocusedResultIndex(lastIndex);
        resultRefs.current[lastIndex]?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleResultClick(currentResults[index], index);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        announceToScreenReader('Arama sonuçları kapatıldı');
        break;
    }
  }, [getCurrentResults, handleResultClick, onClose, announceToScreenReader]);

  // Handle close with accessibility
  const handleClose = useCallback(() => {
    onClose();
    announceToScreenReader('Arama sonuçları kapatıldı');
    triggerHaptic('light');
  }, [onClose, announceToScreenReader, triggerHaptic]);

  // Focus management
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Focus first tab when opened
      setTimeout(() => {
        tabRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Announce results when they change
  useEffect(() => {
    if (!isLoading && searchQuery) {
      const currentResults = getCurrentResults();
      const totalResults = tabs.find(tab => tab.id === 'all')?.count || 0;
      
      if (totalResults > 0) {
        announceToScreenReader(`${searchQuery} için ${totalResults} sonuç bulundu`);
      } else {
        announceToScreenReader(`${searchQuery} için sonuç bulunamadı`);
      }
    }
  }, [isLoading, searchQuery, getCurrentResults, tabs, announceToScreenReader]);

  // Get filtered results for rendering
  const getFilteredResults = () => {
    const currentResults = getCurrentResults();
    
    if (activeTab === 'all') {
      // Group results by type for "all" tab
      const groupedResults: { [key: string]: any[] } = {};
      
      currentResults.forEach(result => {
        if (!groupedResults[result.type]) {
          groupedResults[result.type] = [];
        }
        groupedResults[result.type].push(result);
      });

      return (
        <div className="space-y-6" role="region" aria-label="Tüm arama sonuçları">
          {Object.entries(groupedResults).map(([type, items]) => (
            <div key={type}>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                {type === 'user' ? t('search.categories.users') :
                 type === 'list' ? t('search.categories.lists') :
                 type === 'movie' ? t('search.categories.movies') :
                 type === 'show' ? t('search.categories.series') :
                 type === 'person' ? t('common.categories.people') :
                 type === 'game' ? t('search.categories.games') :
                 type === 'book' ? t('search.categories.books') :
                 type === 'place' ? t('common.categories.places') : type}
              </h3>
              <div className="space-y-2" role="list" aria-label={`${type} sonuçları`}>
                {items.slice(0, 3).map((item, index) => (
                  <div
                    key={`${item.id}-${type}`}
                    ref={(el) => {
                      const globalIndex = currentResults.findIndex(r => r.id === item.id && r.type === type);
                      resultRefs.current[globalIndex] = el;
                    }}
                    onClick={() => {
                      const globalIndex = currentResults.findIndex(r => r.id === item.id && r.type === type);
                      handleResultClick(item, globalIndex);
                    }}
                    onMouseDown={(e) => {
                      // Mouse down olayında default davranışı engelle ki input focus'u kaybetmesin
                      e.preventDefault();
                    }}
                    onKeyDown={(e) => {
                      const globalIndex = currentResults.findIndex(r => r.id === item.id && r.type === type);
                      handleResultKeyDown(e, globalIndex);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${
                      type === 'user' ? item.full_name :
                      type === 'list' ? item.title :
                      type === 'movie' ? item.title :
                      type === 'show' ? item.name :
                      type === 'person' ? item.name :
                      type === 'game' ? item.name :
                      type === 'book' ? item.volumeInfo?.title :
                      type === 'place' ? item.name : t('search.result')
                    }, ${
                      type === 'user' ? t('search.categories.users') :
                      type === 'list' ? t('search.categories.lists') :
                      type === 'movie' ? t('search.categories.movies') :
                      type === 'show' ? t('search.categories.series') :
                      type === 'person' ? t('common.categories.people') :
                      type === 'game' ? t('search.categories.games') :
                      type === 'book' ? t('search.categories.books') :
                      type === 'place' ? t('common.categories.places') : type
                    }`}
                  >
                    <img
                      src={
                        type === 'user' ? item.avatar :
                        type === 'list' ? (item.items?.[0]?.image_url || '/placeholder-list.png') :
                        type === 'movie' ? `https://image.tmdb.org/t/p/w92${item.poster_path}` :
                        type === 'show' ? `https://image.tmdb.org/t/p/w92${item.poster_path}` :
                        type === 'person' ? `https://image.tmdb.org/t/p/w92${item.profile_path}` :
                        type === 'game' ? item.background_image :
                        type === 'book' ? item.volumeInfo?.imageLinks?.thumbnail :
                        type === 'place' ? (item.image || getDefaultPlaceImage(item.name)) : '/placeholder.png'
                      }
                      alt=""
                      className={`object-cover rounded ${
                        type === 'user' || type === 'person' ? 'w-12 h-12 rounded-full' : 'w-12 h-16'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {type === 'user' ? item.full_name :
                         type === 'list' ? item.title :
                         type === 'movie' ? item.title :
                         type === 'show' ? item.name :
                         type === 'person' ? item.name :
                         type === 'game' ? item.name :
                         type === 'book' ? item.volumeInfo?.title :
                         type === 'place' ? item.name : 'Başlık'}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {type === 'user' ? `@${item.username}` :
                         type === 'list' ? t('search.itemCount', { count: item.items?.length || 0 }) :
                         type === 'movie' ? item.release_date?.split('-')[0] :
                         type === 'show' ? item.first_air_date?.split('-')[0] :
                         type === 'person' ? item.known_for_department :
                         type === 'game' ? item.released?.split('-')[0] :
                         type === 'book' ? item.volumeInfo?.authors?.join(', ') :
                         type === 'place' ? (item.address || item.city || item.country) : ''}
                      </p>
                    </div>
                    {type === 'user' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle follow action
                            triggerHaptic('light');
                          }}
                          className="p-2 text-gray-600 hover:text-orange-500 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          aria-label={`${item.full_name} kullanıcısını takip et`}
                          tabIndex={-1}
                        >
                          <UserPlus size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/messages', { state: { userId: item.id } });
                            triggerHaptic('light');
                          }}
                          className="p-2 text-gray-600 hover:text-blue-500 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`${item.full_name} kullanıcısına mesaj gönder`}
                          tabIndex={-1}
                        >
                          <MessageCircle size={16} aria-hidden="true" />
                        </button>
              </div>
            )}
                    </div>
                  ))}
                      </div>
                    </div>
                  ))}
                </div>
      );
    } else {
      // Single category results
      return (
        <div className="space-y-2" role="list" aria-label={`${tabs.find(t => t.id === activeTab)?.label} sonuçları`}>
          {currentResults.map((item, index) => (
            <div
              key={`${item.id}-${item.type}`}
              ref={(el) => { resultRefs.current[index] = el; }}
              onClick={() => handleResultClick(item, index)}
              onMouseDown={(e) => {
                // Mouse down olayında default davranışı engelle ki input focus'u kaybetmesin
                e.preventDefault();
              }}
              onKeyDown={(e) => handleResultKeyDown(e, index)}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
              role="listitem"
              tabIndex={0}
              aria-label={`${
                item.type === 'user' ? item.full_name :
                item.type === 'list' ? item.title :
                item.type === 'movie' ? item.title :
                item.type === 'show' ? item.name :
                item.type === 'person' ? item.name :
                item.type === 'game' ? item.name :
                item.type === 'book' ? item.volumeInfo?.title :
                item.type === 'place' ? item.name : t('search.result')
              }, ${tabs.find(t => t.id === activeTab)?.label}`}
            >
              <img
                src={
                  item.type === 'user' ? item.avatar :
                  item.type === 'list' ? (item.items?.[0]?.image_url || '/placeholder-list.png') :
                  item.type === 'movie' ? `https://image.tmdb.org/t/p/w92${item.poster_path}` :
                  item.type === 'show' ? `https://image.tmdb.org/t/p/w92${item.poster_path}` :
                  item.type === 'person' ? `https://image.tmdb.org/t/p/w92${item.profile_path}` :
                  item.type === 'game' ? item.background_image :
                  item.type === 'book' ? item.volumeInfo?.imageLinks?.thumbnail :
                  item.type === 'place' ? (item.image || getDefaultPlaceImage(item.name)) : '/placeholder.png'
                }
                alt=""
                className={`object-cover rounded ${
                  item.type === 'user' || item.type === 'person' ? 'w-12 h-12 rounded-full' : 'w-12 h-16'
                }`}
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
    }
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
          {/* Pull to refresh indicator */}
          {isPulling && (
            <div 
              className="absolute top-0 left-0 right-0 flex justify-center z-10"
              style={{ 
                transform: `translateY(${pullDistance - 50}px)`,
                paddingTop: 'env(safe-area-inset-top)'
              }}
            >
              <div className="bg-white rounded-full shadow-lg p-2 border border-gray-200">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
              </div>
            </div>
          )}

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
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[index] = el; }}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-label={`${tab.label}${tab.count > 0 ? `, ${tab.count} sonuç` : ', sonuç yok'}`}
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
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent" />
                <span className="ml-3 text-gray-600">Aranıyor...</span>
              </div>
            ) : (
              <>
                {getFilteredResults()}
                {!isLoading && getCurrentResults().length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Sonuç bulunamadı</h3>
                    <p className="text-gray-500">
                      {activeTab === 'all'
                        ? t('search.noResults', { query: searchQuery })
                        : t('search.noCategoryResults', { category: tabs.find(t => t.id === activeTab)?.label })}
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
            e.preventDefault();
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
                    e.preventDefault();
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
                {!isLoading && getCurrentResults().length === 0 && (
                  <div className="text-center py-12" role="status">
                    <p className="text-gray-500 text-lg">
                      {activeTab === 'all'
                        ? t('search.noResults', { query: searchQuery })
                        : t('search.noCategoryResults', { category: tabs.find(t => t.id === activeTab)?.label })}
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