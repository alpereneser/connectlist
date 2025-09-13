import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Film, Tv, Book, Users2, Video, Gamepad2, MapPin, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SelectCategory() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const categories = useMemo(() => [
    { 
      id: 'movies', 
      label: 'Filmler', 
      icon: Film, 
      description: ''
    },
    { 
      id: 'series', 
      label: 'Diziler', 
      icon: Tv, 
      description: ''
    },
    { 
      id: 'books', 
      label: 'Kitaplar', 
      icon: Book, 
      description: ''
    },
    { 
      id: 'games', 
      label: 'Oyunlar', 
      icon: Gamepad2, 
      description: ''
    },
    { 
      id: 'people', 
      label: 'Kişiler', 
      icon: Users2, 
      description: ''
    },
    { 
      id: 'videos', 
      label: 'Videolar', 
      icon: Video, 
      description: ''
    },
    { 
      id: 'places', 
      label: 'Mekanlar', 
      icon: MapPin, 
      description: ''
    },
    { 
      id: 'musics', 
      label: 'Müzikler', 
      icon: Music, 
      description: ''
    },
  ].map(category => ({
    ...category,
    label: t(`common.categories.${category.id}`),
    description: t(`common.categoryDescriptions.${category.id}`)
  })), [t]);

  return (
    <>
      {/* Mobile-first, app-like compact category picker */}
      <div
        className="min-h-screen bg-white"
        style={{
          // Main layout already adds header padding on mobile; add only SubHeader here
          paddingTop: 'calc(var(--safe-area-inset-top) + var(--subheader-height))',
          paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))',
        }}
      >
        <div
          className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 flex items-center"
          style={{
            minHeight:
              'calc(100dvh - var(--safe-area-inset-top) - var(--subheader-height) - var(--safe-area-inset-bottom) - var(--bottom-menu-height))',
          }}
        >
          <div className="px-1 md:px-2 w-full">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 text-center mb-1">
              {t('listPreview.listDetails.selectCategory')}
            </h1>
            <p className="text-xs md:text-base text-gray-600 text-center mb-4 md:mb-6">
              {t('listPreview.listDetails.selectCategoryDescription')}
            </p>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {categories.map((category) => {
                const Icon = category.icon;

                const colorById: Record<string, { bg: string; text: string; ring: string }> = {
                  movies: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100' },
                  series: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
                  books: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
                  games: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
                  people: { bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-100' },
                  videos: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
                  places: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-100' },
                  musics: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100' },
                };
                const scheme = colorById[category.id] || colorById.movies;

                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/create-list/${category.id}`)}
                    aria-label={category.label}
                    className={`relative flex flex-col items-center justify-center rounded-xl h-20 md:h-28 bg-white border border-gray-200 ${
                      // subtle shadow on mobile for app-like feel
                      'shadow-[0_1px_6px_rgba(0,0,0,0.06)]'
                    } active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  >
                    <div className={`w-10 h-10 md:w-12 md:h-12 ${scheme.bg} ${scheme.ring} ring-1 rounded-lg flex items-center justify-center mb-1 md:mb-2`}>
                      <Icon className={`${scheme.text}`} size={22} />
                    </div>
                    <span className="text-[11px] md:text-sm font-medium text-gray-900 text-center leading-tight line-clamp-1">
                      {category.label}
                    </span>
                    {/* Keep description desktop-only for compact mobile look */}
                    <p className="hidden md:block text-gray-500 text-xs text-center mt-1">
                      {category.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
