import React, { useState, useEffect, useCallback } from 'react';
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
  Plus,
  MusicNotes,
  VideoCamera,
  Eye,
} from '@phosphor-icons/react';

interface SubHeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export function SubHeader({ activeCategory = 'all', onCategoryChange }: SubHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const tabs = [
    { id: 'all', label: t('common.categories.all'), icon: ListBullets, count: 0 },
    { id: 'musics', label: t('common.categories.musics'), icon: MusicNotes, count: 0 },
    { id: 'movies', label: t('common.categories.movies'), icon: FilmStrip, count: 0 },
    { id: 'series', label: t('common.categories.series'), icon: Television, count: 0 },
    { id: 'books', label: t('common.categories.books'), icon: Book, count: 0 },
    { id: 'games', label: t('common.categories.games'), icon: GameController, count: 0 },
    { id: 'videos', label: t('common.categories.videos'), icon: VideoCamera, count: 0 },
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    if (isMobile && 'vibrate' in navigator) navigator.vibrate(50);
    onCategoryChange?.(tabId);
    navigate('/', { state: { category: tabId, refresh: true, sortDirection: 'desc' } });
  }, [onCategoryChange, navigate, isMobile]);

  const handleCreateList = useCallback(() => {
    if (!user) {
      setShowAuthPopup(true);
      return;
    }
    navigate('/select-category');
  }, [navigate, user]);

  const handleDiscover = useCallback(() => navigate('/search'), [navigate]);



  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX) return;
    const deltaX = touchStartX - e.changedTouches[0].clientX;
    const idx = tabs.findIndex(tab => tab.id === activeCategory);
    const threshold = 50;
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && idx < tabs.length - 1) handleTabChange(tabs[idx + 1].id);
      else if (deltaX < 0 && idx > 0) handleTabChange(tabs[idx - 1].id);
    }
    setTouchStartX(0);
  };

  const handleScroll = () => {
    setIsScrolling(true);
    if (window.scrollTimeout) clearTimeout(window.scrollTimeout);
    window.scrollTimeout = window.setTimeout(() => setIsScrolling(false), 150) as unknown as number;
  };

  useEffect(() => {
    if (isMobile && activeCategory) {
      const container = document.getElementById('tab-container');
      const activeEl = document.querySelector(`[data-tab="${activeCategory}"]`);
      if (container && activeEl) {
        const c = container.getBoundingClientRect();
        const r = (activeEl as HTMLElement).getBoundingClientRect();
        if (r.left < c.left || r.right > c.right) {
          (activeEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [activeCategory, isMobile]);

  return (
    <div
      className={`
        fixed left-0 right-0 z-30
        bg-white border-b border-gray-200 shadow-sm
      `}
      style={{ top: 'calc(var(--safe-area-inset-top) + var(--header-height))' }}
      role="navigation"
      aria-label="Kategori navigasyonu"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className={`${isMobile ? 'py-2' : 'py-3'}`}>
          <div className={`flex w-full items-center ${isMobile ? 'gap-3' : 'gap-6'}`}>
            <div
              id="tab-container"
              className={`flex flex-1 items-center ${isMobile ? 'overflow-x-auto scrollbar-hide gap-3' : 'flex-wrap gap-6'} ${isScrolling ? 'scroll-smooth' : ''} min-h-[40px]`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onScroll={handleScroll}
              role="tablist"
              aria-orientation="horizontal"
            >
              {tabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                const Icon = tab.icon as any;
                return (
                  <button
                    key={tab.id}
                    data-tab={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      relative flex items-center gap-2 whitespace-nowrap
                      ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-3 text-sm'}
                      font-medium transition-all duration-200
                      border-b-2
                      ${isActive ? 'border-orange-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'}
                      focus:outline-none active:bg-gray-100 active:scale-95
                      ${isMobile ? 'flex-shrink-0' : ''}
                    `}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    title={tab.label}
                  >
                    <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} weight="regular" aria-label={`${tab.label} ikonu`} />
                    <span className="leading-none">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {!isMobile && (
              <div className="ml-auto flex items-center gap-3 min-h-[40px]">
                <button
                  onClick={handleDiscover}
                  className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-orange-500 hover:text-orange-500 focus:outline-none active:bg-gray-100 active:scale-95"
                  title={t('common.discover')}
                >
                  <Eye className="h-4 w-4" weight="regular" aria-hidden="true" />
                  <span>{t('common.discover')}</span>
                </button>
                <button
                  onClick={handleCreateList}
                  className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-600 focus:outline-none active:bg-orange-700 active:scale-95"
                  title={t('common.createList')}
                >
                  <Plus className="h-4 w-4" weight="regular" aria-hidden="true" />
                  <span>{t('common.createList')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screen reader helper */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Aktif kategori: ${tabs.find(tab => tab.id === activeCategory)?.label || t('common.categories.all')}`}
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

declare global {
  interface Window { scrollTimeout: number }
}
