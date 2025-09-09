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
    <div className="bg-white md:h-[75px]">
      {/* Mobile Categories - Border-based tabs */}
      <div className="md:hidden border-t border-b border-gray-200 bg-white">
        <div
          ref={scrollContainerRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 border-b-2 ${
                activeCategory === category.id
                  ? 'text-orange-500 border-orange-500'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Categories - Border-based tabs */}
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