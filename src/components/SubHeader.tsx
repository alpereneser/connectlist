import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { AuthPopup } from './AuthPopup';
import { 
  ListBullets, 
  FilmStrip, 
  Television, 
  Book, 
  GameController, 
  User, 
  MapPin,
  Plus 
} from '@phosphor-icons/react';

interface SubHeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export function SubHeader({ activeCategory = 'all', onCategoryChange }: SubHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Mobile UX States
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  // Tab configuration with Phosphor icons
  const tabs = [
    { id: 'all', label: t('search.categories.all'), icon: ListBullets, count: 0 },
    { id: 'movies', label: t('search.categories.movies'), icon: FilmStrip, count: 0 },
    { id: 'series', label: t('search.categories.series'), icon: Television, count: 0 },
    { id: 'books', label: t('search.categories.books'), icon: Book, count: 0 },
    { id: 'games', label: t('search.categories.games'), icon: GameController, count: 0 },
    { id: 'people', label: t('search.tabs.people'), icon: User, count: 0 },
    { id: 'places', label: t('search.tabs.places'), icon: MapPin, count: 0 },
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
      // Tüm kategoriler için sondan başa (desc) sıralama
      const sortDirection = 'desc';
      navigate('/', { 
        state: { 
          category: tabId,
          refresh: true,
          sortDirection: sortDirection
        } 
      });
    }
    
    // Announce to screen readers
    const selectedTab = tabs.find(tab => tab.id === tabId);
    if (selectedTab) {
      announceToScreenReader(`${selectedTab.label} kategorisi seçildi`);
    }
  }, [onCategoryChange, navigate, tabs, isMobile]);

  // Handle create list button click
  const handleCreateList = useCallback(() => {
    if (!user) {
      setShowAuthPopup(true);
      return;
    }
    navigate('/select-category');
  }, [navigate, user]);

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

  // Touch handling removed - only click navigation allowed

  // Scroll handling for tab container
  const handleScroll = () => {
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
        bg-white h-[70px]
        ${isMobile ? 'top-14' : 'top-16'}
      `}
      role="navigation"
      aria-label="Kategori navigasyonu"
    >
      {/* Container with same structure as Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="h-[70px]">
          {/* Tab container with Header-consistent spacing */}
          <div 
            id="tab-container"
            className={`
              w-full flex ${isMobile ? 'justify-between' : 'justify-start'} gap-1 md:gap-2
              overflow-x-auto scrollbar-hide
              ${isMobile ? 'py-0' : 'py-0'} // Remove padding to prevent overflow
              ${isScrolling ? 'scroll-smooth' : ''}
            `}
            onScroll={handleScroll}
            role="tablist"
            aria-orientation="horizontal"
          >
            {tabs.map((tab) => {
              const isActive = activeCategory === tab.id;
              const IconComponent = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex-1 flex flex-col items-center justify-center
                    ${isMobile ? 'px-1 min-w-[70px]' : 'px-2 min-w-[80px]'}
                    h-[70px] font-medium
                    transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                    ${isActive 
                      ? `border-b-4 border-orange-600 text-orange-600` 
                      : 'text-gray-600 hover:text-gray-800 active:scale-95'
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
                  <div className="flex flex-col items-center space-y-0">
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
            
            {/* Create List Button - Only visible on desktop */}
            {!isMobile && (
              <button
                onClick={handleCreateList}
                className="
                  flex flex-col items-center justify-center
                  px-2 min-w-[80px]
                  h-[70px] rounded-lg font-medium
                  transition-all duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                  bg-orange-500 text-white shadow-md
                  hover:bg-orange-600 active:scale-95
                  ml-2
                "
                title={t('createList.buttonText')}
              >
                <div className="flex flex-col items-center space-y-1">
                  <Plus 
                    className="w-5 h-5"
                    weight="regular"
                    aria-label="Liste oluştur ikonu"
                  />
                  <span className="text-[10px] font-medium text-center leading-tight whitespace-nowrap">
                    {t('createList.buttonText')}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Screen reader helper */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Aktif kategori: ${tabs.find(tab => tab.id === activeCategory)?.label || 'Tümü'}`}
      </div>
      
      {/* Auth Popup */}
      {showAuthPopup && (
        <AuthPopup 
          onClose={() => setShowAuthPopup(false)}
          onSuccess={() => {
            setShowAuthPopup(false);
            navigate('/select-category');
          }}
        />
      )}
    </div>
  );
}

// Add global scroll timeout type
declare global {
  interface Window {
    scrollTimeout: number;
  }
}