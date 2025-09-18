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
  })).filter(c => c.id  !==  'people' && c.id  !==  'places'), [t]);

  return (
    <>
            {/* Mobile-first compact; Desktop follows the provided design mock */}
            <div
              className="min-h-screen bg-white"
              style={{
                // Main layout already adds header padding on mobile; add only SubHeader here
                paddingTop: 'calc(var(--safe-area-inset-top) + var(--subheader-height))',
                paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))',
              }}
            >
              <div
          className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-10 flex items-center"
                style={{
                  minHeight:
                    'calc(100dvh - var(--safe-area-inset-top) - var(--subheader-height) - var(--safe-area-inset-bottom) - var(--bottom-menu-height))',
                }}
              >
                <div className="px-1 md:px-2 w-full">
            <h1 className="text-lg md:text-2xl font-semibold text-gray-900 text-center mb-2">
              {t('listPreview.listDetails.selectCategory')}
            </h1>
            <p className="text-xs md:text-sm text-gray-600 text-center mb-6 md:mb-10 max-w-2xl mx-auto">
              {t('listPreview.listDetails.selectCategoryDescription')}
            </p>

            {/* Grid: mobile 2 columns, desktop 3 columns as in mock */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
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
                    className={`
                      group relative w-full h-20 md:h-48 lg:h-52
                      flex flex-col items-center justify-center text-center
                      rounded-xl bg-white border border-gray-200 shadow-none
                      active:scale-95 transition-all duration-150 ease-out
                      focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                      md:hover:border-gray-300 md:hover:shadow-sm
                    `}
                  >
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-1 md:mb-3`}>
                      {/* Desktop: neutral icon color; Mobile: keep scheme color */}
                      <Icon className={`text-gray-700 md:text-gray-700 ${scheme.text} md:!text-gray-700`} size={26} />
                    </div>
                    <span className="text-[11px] md:text-base font-medium text-gray-900 text-center leading-tight line-clamp-1">
                      {category.label}
                    </span>
                    {/* Desktop-only helper text */}
                    <p className="hidden md:block text-gray-600 text-sm text-center mt-2 md:px-6 leading-snug">
                      {category.description}
                    </p>
                    {/* Subtle hover indicator on desktop */}
                    <div className="hidden md:block absolute inset-0 rounded-xl ring-0 ring-orange-500/0 group-hover:ring-2 transition-all" />
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
