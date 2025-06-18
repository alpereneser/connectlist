import { Film, Tv, Book, Users2, Youtube, Gamepad2, Home, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRef } from 'react';

interface ProfileCategoriesProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function ProfileCategories({ activeCategory, onCategoryChange }: ProfileCategoriesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const categories = useMemo(() => [
    { id: 'all', label: t('common.categories.all'), icon: Home },
    { id: 'movies', label: t('common.categories.movies'), icon: Film },
    { id: 'series', label: t('common.categories.series'), icon: Tv },
    { id: 'books', label: t('common.categories.books'), icon: Book },
    { id: 'games', label: t('common.categories.games'), icon: Gamepad2 },
    { id: 'people', label: t('common.categories.people'), icon: Users2 },
    { id: 'videos', label: t('common.categories.videos'), icon: Youtube },
    { id: 'places', label: t('common.categories.places'), icon: MapPin },
  ], [t]);

  return (
    <div className="bg-white md:h-[75px]">
      {/* Mobile Categories - Modern chip design */}
      <div className="md:hidden bg-gray-50 px-4 py-1">
      <div
        ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => {
            const categoryEmojis = {
              all: '📋',
              movies: '🎬',
              series: '📺',
              books: '📚',
              games: '🎮',
              people: '👤',
              videos: '📹',
              places: '📍'
            };
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 border ${
                  activeCategory === category.id
                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">
                  {categoryEmojis[category.id as keyof typeof categoryEmojis]}
                </span>
                <span className="font-semibold">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Categories - Original design */}
      <div className="hidden md:block h-full border-t border-b border-gray-200">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide md:flex-wrap md:justify-center px-2 h-full">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
                className={`flex h-full items-center gap-2 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeCategory === category.id
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
                <Icon size={16} />
              <span>{category.label}</span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}