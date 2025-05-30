import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Film, Tv, Book, Users2, Video, Gamepad2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { SubHeader } from '../components/SubHeader';

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
  ].map(category => ({
    ...category,
    label: t(`common.categories.${category.id}`),
    description: t(`common.categoryDescriptions.${category.id}`)
  })), [t]);

  return (
    <>
      <Header />
      <SubHeader />
      <div className="min-h-screen bg-white pt-[119px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-4 md:p-8">
            <h1 className="text-2xl font-bold text-center mb-2">
              {t('listPreview.listDetails.selectCategory')}
            </h1>
            <p className="text-gray-600 text-center mb-8">
              {t('listPreview.listDetails.selectCategoryDescription')}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/create-list/${category.id}`)}
                    className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors h-full"
                  >
                    <div className="flex flex-col items-center">
                      <Icon size={32} className="text-gray-700 mb-3" />
                      <span className="text-gray-900 font-medium text-sm md:text-base text-center mb-2">
                        {category.label}
                      </span>
                      <p className="text-gray-500 text-xs text-center">
                        {category.description}
                      </p>
                    </div>
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