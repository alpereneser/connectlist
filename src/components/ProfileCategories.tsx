import { Film, Tv, Book, Youtube, Gamepad2, Home, Music } from 'lucide-react';
import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ProfileCategoriesProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function ProfileCategories({ activeCategory, onCategoryChange }: ProfileCategoriesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { triggerHaptic } = useHapticFeedback();

  const categories = useMemo(() => [
    { id: 'all', label: t('common.categories.all'), icon: Home },
    { id: 'movies', label: t('common.categories.movies'), icon: Film },
    { id: 'series', label: t('common.categories.series'), icon: Tv },
    { id: 'books', label: t('common.categories.books'), icon: Book },
    { id: 'games', label: t('common.categories.games'), icon: Gamepad2 },
    { id: 'videos', label: t('common.categories.videos'), icon: Youtube },
    { id: 'musics', label: t('common.categories.musics'), icon: Music },
  ], [t]);

  // Swipe navigation logic
  const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
  
  const handleSwipeLeft = () => {
    const nextIndex = (currentIndex + 1) % categories.length;
    triggerHaptic('light');
    onCategoryChange(categories[nextIndex].id);
  };

  const handleSwipeRight = () => {
    const prevIndex = currentIndex === 0 ? categories.length - 1 : currentIndex - 1;
    triggerHaptic('light');
    onCategoryChange(categories[prevIndex].id);
  };

  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
    velocity: 0.3
  });

  // Attach swipe handlers to mobile container
  useEffect(() => {
    const container = mobileContainerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', swipeHandlers.onTouchStart, { passive: true });
    container.addEventListener('touchmove', swipeHandlers.onTouchMove, { passive: true });
    container.addEventListener('touchend', swipeHandlers.onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', swipeHandlers.onTouchStart);
      container.removeEventListener('touchmove', swipeHandlers.onTouchMove);
      container.removeEventListener('touchend', swipeHandlers.onTouchEnd);
    };
  }, [swipeHandlers]);

  return (
    <div className="bg-white">
      {/* Mobile Categories - pill buttons with icons */}
      <div ref={mobileContainerRef} className="md:hidden border-t border-b border-gray-200 bg-white py-2 relative">
        {/* Swipe indicators */}
        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-300 pointer-events-none z-10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </div>
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-300 pointer-events-none z-10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </div>
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Categories - larger with icons */}
      <div className="hidden md:block border-t border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide md:flex-wrap md:justify-center px-4 py-2 items-center">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

