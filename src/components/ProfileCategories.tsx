import { Film, Tv, Book, Users2, Youtube, Gamepad2, Home, MapPin, Music } from 'lucide-react';
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
    { id: 'musics', label: t('common.categories.musics'), icon: Music },
  ], [t]);

  return (
    <div className="bg-white md:h-[80px]">
      {/* Mobile Categories - pill buttons with icons */}
      <div className="md:hidden border-t border-b border-gray-200 bg-white py-2">
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
      <div className="hidden md:block h-full border-t border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide md:flex-wrap md:justify-center px-4 h-full items-center">
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
