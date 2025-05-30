import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Film, Tv, Book, Users2, Youtube, Plus, Gamepad2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthPopup } from './AuthPopup';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useRef } from 'react';

interface SubHeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export function SubHeader({ activeCategory, onCategoryChange }: SubHeaderProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(activeCategory || 'all');
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCategory) {
      setActiveTab(activeCategory);
    }
  }, [activeCategory]);

  const handleTabChange = (category: string) => {
    setActiveTab(category);
    if (onCategoryChange) {
      onCategoryChange(category === 'all' ? 'all' : tabs.find(tab => tab.id === category)?.category || category);
    } else {
      // Her zaman en son eklenen listelerden başlayarak sırala (desc - sondan başa doğru)
      navigate('/', {
        state: {
          category: category === 'all' ? 'all' : tabs.find(tab => tab.id === category)?.category || category,
          sortDirection: 'desc', // En yeni listeler önce gelecek şekilde sırala
          refresh: true, // Sayfayı yenile
          timestamp: Date.now() // Her tıklamada yeni bir zaman damgası ekle
        }
      });
    }
  };

  const tabs = useMemo(() => [
    { id: 'all', label: t('common.lists.all'), icon: Home, category: 'all' },
    { id: 'movies', label: t('common.lists.movies'), icon: Film, category: 'movies' },
    { id: 'series', label: t('common.lists.series'), icon: Tv, category: 'series' },
    { id: 'books', label: t('common.lists.books'), icon: Book, category: 'books' },
    { id: 'games', label: t('common.lists.games'), icon: Gamepad2, category: 'games' },
    { id: 'people', label: t('common.lists.people'), icon: Users2, category: 'people' },
    { id: 'videos', label: t('common.lists.videos'), icon: Youtube, category: 'videos' },
    { id: 'places', label: t('common.lists.places'), icon: MapPin, category: 'places' },
  ], [t]);

  return (
    <div className="bg-gray-100 border-b border-gray-200 mb-[10px] md:fixed md:top-16 md:left-0 md:right-0 md:z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[55px] md:h-[75px]">
          <div 
            ref={scrollContainerRef}
            className="flex h-full items-center space-x-2 overflow-x-auto scrollbar-hide md:space-x-4 md:overflow-visible"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex h-full items-center space-x-1 md:space-x-2 px-2 md:px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-orange-500 text-orange-500'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => {
                    // Tüm kategoriler için aynı işlemi yap
                    handleTabChange(tab.id);
                  }}
                >
                  <Icon size={14} className="md:w-4 md:h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="hidden md:flex items-center">
            <button
              onClick={async () => {
                if (await requireAuth('liste oluşturmak')) {
                  navigate('/select-category');
                }
              }}
              className="add-list-button flex items-center space-x-2 px-3 h-[45px] text-sm font-medium bg-orange-500 text-white border border-orange-500 hover:bg-orange-600 hover:border-orange-600 rounded-lg"
            >
              <Plus size={16} />
              <span>{t('common.addList')}</span>
            </button>
          </div>
        </div>
      </div>
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
    </div>
  );
}