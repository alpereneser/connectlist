import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ListBullets, 
  FilmStrip, 
  Television, 
  Book, 
  GameController, 
  User, 
  MapPin 
} from '@phosphor-icons/react';

interface SubHeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export function SubHeader({ activeCategory = 'all', onCategoryChange }: SubHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Mobile UX States
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Tab configuration with Phosphor icons
  const tabs = [
    { id: 'all', label: t('search.categories.all'), icon: ListBullets, count: 0 },
    { id: 'movie', label: t('search.categories.movies'), icon: FilmStrip, count: 0 },
    { id: 'series', label: t('search.categories.series'), icon: Television, count: 0 },
    { id: 'book', label: t('search.categories.books'), icon: Book, count: 0 },
    { id: 'game', label: t('search.categories.games'), icon: GameController, count: 0 },
    { id: 'person', label: t('search.tabs.people'), icon: User, count: 0 },
    { id: 'place', label: t('search.tabs.places'), icon: MapPin, count: 0 },
  ];

  // Mobile detection with orientation support
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Handle tab change with haptic feedback
  const handleTabChange = useCallback((tabId: string) => {
    // Haptic feedback for mobile
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50); // Light haptic feedback
    }
    
    if (onCategoryChange) {
      onCategoryChange(tabId);
    } else {
      // Fallback navigation for non-homepage usage
      navigate('/', { 
        state: { 
          category: tabId,
          refresh: true,
          sortDirection: 'desc'
        } 
      });
    }
    
    // Announce to screen readers
    const selectedTab = tabs.find(tab => tab.id === tabId);
    if (selectedTab) {
      announceToScreenReader(`${selectedTab.label} kategorisi seçildi`);
    }
  }, [onCategoryChange, navigate, tabs, isMobile]);

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Touch handling for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - touchEndX;
    const threshold = 50;
    
    if (Math.abs(deltaX) > threshold) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeCategory);
      
      if (deltaX > 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        handleTabChange(tabs[currentIndex + 1].id);
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        handleTabChange(tabs[currentIndex - 1].id);
      }
    }
    
    setTouchStartX(0);
  };

  // Scroll handling for tab container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
    setIsScrolling(true);
    
    // Clear scrolling state after scroll ends
    if (window.scrollTimeout) {
      clearTimeout(window.scrollTimeout);
    }
    window.scrollTimeout = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150) as unknown as number;
  };

  // Auto-scroll to active tab on mobile
  useEffect(() => {
    if (isMobile && activeCategory) {
      const tabContainer = document.getElementById('tab-container');
      const activeTabElement = document.querySelector(`[data-tab="${activeCategory}"]`);
      
      if (tabContainer && activeTabElement) {
        const containerRect = tabContainer.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();
        
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          activeTabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    }
  }, [activeCategory, isMobile]);

  return (
    <div 
      className={`
        fixed left-0 right-0 z-30
        bg-white border-b border-gray-200 
        ${isMobile ? 'top-14' : 'top-16'}
      `}
      style={{
        top: isMobile ? '56px' : '64px' // Header height
      }}
      role="navigation"
      aria-label="Kategori navigasyonu"
    >
      {/* Container with same structure as Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className={`${isMobile ? 'h-15' : 'h-16'}`}>
          {/* Tab container with Header-consistent spacing */}
          <div 
            id="tab-container"
            className={`
              w-full flex justify-between gap-1 md:gap-2
              overflow-x-auto scrollbar-hide
              ${isMobile ? 'py-3' : 'py-4'}
              ${isScrolling ? 'scroll-smooth' : ''}
            `}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onScroll={handleScroll}
            role="tablist"
            aria-orientation="horizontal"
          >
            {tabs.map((tab, index) => {
              const isActive = activeCategory === tab.id;
              const IconComponent = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 flex flex-col items-center justify-center
                    ${isMobile ? 'px-1 py-2 min-w-[70px]' : 'px-2 py-2 min-w-[80px]'}
                    h-auto rounded-lg font-medium
                    transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                    ${isActive 
                      ? 'bg-orange-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:scale-95'
                    }
                    ${isMobile ? 'active:scale-95 touch-manipulation' : ''}
                  `}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  title={tab.label}
                >
                  {/* Icon and label layout - vertical for both mobile and desktop */}
                  <div className="flex flex-col items-center space-y-1">
                    <IconComponent 
                      className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`}
                      weight="regular"
                      aria-label={`${tab.label} ikonu`}
                    />
                    <span className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} font-medium text-center leading-tight whitespace-nowrap`}>
                      {tab.label}
                    </span>
                  </div>
                  
                  {/* Badge for count (if needed in future) */}
                  {tab.count > 0 && (
                    <span 
                      className={`
                        absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full
                        ${isActive ? 'bg-white bg-opacity-20' : 'bg-orange-500 text-white'}
                      `}
                      aria-label={`${tab.count} öğe`}
                    >
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Screen reader helper */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Aktif kategori: ${tabs.find(tab => tab.id === activeCategory)?.label || 'Tümü'}`}
      </div>
    </div>
  );
}

// Add global scroll timeout type
declare global {
  interface Window {
    scrollTimeout: number;
  }
}