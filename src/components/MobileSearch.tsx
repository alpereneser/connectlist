import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, MagnifyingGlass, ArrowLeft } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { SearchResults } from '../components/SearchResults';
import { useDebounce } from '../hooks/useDebounce';

export function MobileSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Mobile UX states
  const [isMobile, setIsMobile] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  // Performance states
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Mobile detection and viewport handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = viewportHeight - currentHeight;
      
      // Detect keyboard open/close
      if (heightDiff > 150) { // Keyboard is likely open
        setIsKeyboardOpen(true);
        setKeyboardHeight(heightDiff);
      } else {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }
      
      setViewportHeight(currentHeight);
    };
    
    const handleOrientationChange = () => {
      setTimeout(() => {
        setViewportHeight(window.innerHeight);
        handleResize();
      }, 100);
    };
    
    checkMobile();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [viewportHeight]);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current && isMobile) {
      // Delay focus to ensure smooth transition
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  // Handle search query changes
  useEffect(() => {
    if (debouncedSearch.trim()) {
      setShowResults(true);
      setIsSearching(true);
      
      // Simulate search delay
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setShowResults(false);
      setIsSearching(false);
    }
  }, [debouncedSearch]);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error('Error parsing search history:', error);
      }
    }
  }, []);

  // Handle input change with performance optimization
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Show/hide results based on input
    if (value.trim()) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, []);

  // Handle search submission
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchQuery.trim()) {
      // Add to search history
      const newHistory = [searchQuery.trim(), ...searchHistory.filter(item => item !== searchQuery.trim())].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      // Keep results open for submission
      setShowResults(true);
    }
  }, [searchQuery, searchHistory]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    // Check if we can go back in history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowResults(false);
    setIsSearching(false);
    
    // Refocus input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, []);

  // Handle search history item click
  const handleHistoryClick = useCallback((query: string) => {
    setSearchQuery(query);
    setShowResults(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, []);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsSearchFocused(true);
    
    // Show results if there's a query
    if (searchQuery.trim()) {
      setShowResults(true);
    }
  }, [searchQuery]);

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    // Delay blur to allow for result clicks
    setTimeout(() => {
      setIsSearchFocused(false);
    }, 150);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResults) {
          setShowResults(false);
          setSearchQuery('');
        } else {
          handleBack();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, handleBack]);

  return (
    <div 
      ref={containerRef}
      className={`
        min-h-screen bg-gray-50 safe-all pt-14
        ${isKeyboardOpen ? 'keyboard-open' : ''}
      `}
      style={{
        height: isKeyboardOpen ? `${viewportHeight}px` : '100vh',
        paddingBottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px'
      }}
    >
      {/* Mobile Header */}
      <div className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 safe-top" style={{ top: '56px' }}>
        <div className="flex items-center px-4 py-3">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="p-2 mr-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full active:scale-95 touch-manipulation"
            aria-label="Geri git"
            title="Geri"
          >
            <ArrowLeft className="h-6 w-6" weight="bold" />
          </button>

          {/* Search Input */}
          <div className="flex-1 relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlass className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={t('common.searchPlaceholder')}
                className="
                  w-full pl-10 pr-10 py-3 text-base
                  bg-gray-100 border-0 rounded-xl
                  focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent
                  placeholder-gray-500
                  ios-fix android-fix
                "
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Aramayı temizle"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Search Content */}
      <div className="flex-1 overflow-hidden pt-16">
        {/* Search History - Show when no query */}
        {!searchQuery.trim() && searchHistory.length > 0 && (
          <div className="bg-white mx-4 mt-4 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">
                {t('search.recentSearches', 'Son Aramalar')}
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {searchHistory.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(query)}
                  className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
                >
                  <div className="flex items-center space-x-3">
                    <MagnifyingGlass className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{query}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Searches - Show when no query */}
        {!searchQuery.trim() && (
          <div className="bg-white mx-4 mt-4 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">
                {t('search.popularSearches', 'Popüler Aramalar')}
              </h3>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {['Marvel', 'Netflix', 'Kitap Önerileri', 'Oyun', 'İstanbul', 'Yemek'].map((term) => (
                  <button
                    key={term}
                    onClick={() => handleHistoryClick(term)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 active:bg-gray-300 touch-manipulation"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && searchQuery.trim() && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
              <span>{t('common.searching', 'Aranıyor...')}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {showResults && searchQuery.trim() && !isSearching && (
          <div className="flex-1 overflow-hidden">
            <SearchResults
              isOpen={showResults}
              onClose={() => setShowResults(false)}
              searchQuery={debouncedSearch}
            />
          </div>
        )}

        {/* Empty State */}
        {!searchQuery.trim() && searchHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MagnifyingGlass className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('search.startSearching', 'Aramaya Başlayın')}
            </h3>
            <p className="text-gray-500 text-center max-w-sm">
              {t('search.searchDescription', 'Film, dizi, kitap, oyun ve daha fazlasını arayın')}
            </p>
          </div>
        )}
      </div>

      {/* Keyboard Height Spacer */}
      {isKeyboardOpen && (
        <div 
          className="bg-transparent"
          style={{ height: `${keyboardHeight}px` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
} 