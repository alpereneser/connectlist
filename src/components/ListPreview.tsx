import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Link as LinkIcon, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { AuthPopup } from './AuthPopup';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { CommentModal } from './CommentModal';
import { useLikeMutation } from '../hooks/useLikeMutation';
import { createSlug } from '../lib/utils';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

interface ListPreviewProps {
  list: {
    id: string;
    title: string;
    description: string;
    user_id: string;
    likes_count: number;
    items_count: number;
    created_at?: string;
    category?: string;
    profiles: {
      username: string;
      full_name: string;
      avatar: string;
    };
  };
  items: Array<{
    id: string;
    title: string;
    image_url: string;
    year?: string;
    type?: 'movie' | 'series' | 'book' | 'game' | 'person' | 'video' | 'place' | 'music';
    external_id?: string;
  }>;
  onListClick?: () => void;
  currentUserId?: string;
  isOwnProfile?: boolean;
  hideAuthor?: boolean;
  hideActions?: boolean;
}

export function ListPreview({ list, items, onListClick, currentUserId, isOwnProfile, hideAuthor = false, hideActions = false }: ListPreviewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  // Şu anda kullanılmayan state'ler yorum satırına alındı
  // const [likeUsers, setLikeUsers] = useState<any[]>([]);
  // const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const [showShareModal, setShowShareModal] = useState(false);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(0);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(list.likes_count);
  const { like, unlike, isLiked } = useLikeMutation(list.id);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Dil ayarlarına göre kategori isimlerini dinamik olarak göster
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  
  // Log the props to use them and silence warnings
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') { // Only log in development
      console.log('[ListPreview] currentUserId:', currentUserId);
      console.log('[ListPreview] isOwnProfile:', isOwnProfile);
    }
  }, [currentUserId, isOwnProfile]);

  const categoryNames = {
    movies: currentLanguage === 'tr' ? 'Filmler' : 'Movies',
    series: currentLanguage === 'tr' ? 'Diziler' : 'TV Series',
    books: currentLanguage === 'tr' ? 'Kitaplar' : 'Books',
    games: currentLanguage === 'tr' ? 'Oyunlar' : 'Games',
    people: currentLanguage === 'tr' ? 'Kişiler' : 'People',
    videos: currentLanguage === 'tr' ? 'Videolar' : 'Videos',
    places: currentLanguage === 'tr' ? 'Mekanlar' : 'Places',
    musics: currentLanguage === 'tr' ? 'Müzikler' : 'Music'
  };

  const handleLikeClick = async () => {
    if (!await requireAuth('listeyi beğenmek')) return;
    handleLike();
  };

  // Bu fonksiyon şu anda kullanılmıyor, gerektiğinde tekrar aktif edilebilir
  // const fetchLikeUsers = async () => {
  //   setIsLoadingLikes(true);
  //   try {
  //     const { data, error } = await supabase
  //       .from('list_likes')
  //       .select(`
  //         profiles (
  //           id,
  //           username,
  //           full_name,
  //           avatar
  //         )
  //       `)
  //       .eq('list_id', list.id);
  //
  //     if (error) throw error;
  //     setLikeUsers(data.map(item => item.profiles));
  //   } catch (error) {
  //     console.error('Error fetching like users:', error);
  //   } finally {
  //     setIsLoadingLikes(false);
  //   }
  // };

  useEffect(() => {
    const fetchCommentCount = async () => {
      const { count, error } = await supabase
        .from('list_comments')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);

      if (error) {
        console.error('Error fetching comment count:', error);
        return;
      }

      setOptimisticCommentCount(count || 0);
    };

    fetchCommentCount();

    // Realtime subscription for comments
    const subscription = supabase
      .channel(`list_comments:${list.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_comments',
        filter: `list_id=eq.${list.id}`
      }, () => {
        fetchCommentCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [list.id]);

  const handleLike = async () => {
    if (isLiked) {
      setOptimisticLikesCount(prev => prev - 1);
      unlike();
    } else {
      setOptimisticLikesCount(prev => prev + 1);
      like();
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
    
    const url = `${window.location.origin}/${list.profiles.username}/list/${createSlug(list.title)}`;
    
    // Paylaşım metni oluştur
    const shareText = `${list.title}\n${list.description ? list.description + '\n' : ''}${url}`;
    
    // Mobil cihazlarda native paylaşım menüsünü kullan
    if (navigator.share && window.innerWidth < 768) {
      navigator.share({
        title: list.title,
        text: shareText,
        url: url
      }).catch(() => {
        // Paylaşım başarısız olursa veya iptal edilirse formatlanmış metni kopyala
        navigator.clipboard.writeText(shareText);
        setTimeout(() => setShowShareModal(false), 2000);
      });
    }
    else {
      // Masaüstünde formatlanmış metni kopyala
      navigator.clipboard.writeText(shareText);
      setTimeout(() => setShowShareModal(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return t('listPreview.timeAgo.now');
    } else if (minutes < 60) {
      return t('listPreview.timeAgo.minutes', { count: minutes });
    } else if (hours < 24) {
      return t('listPreview.timeAgo.hours', { count: hours });
    } else if (days < 7) {
      return t('listPreview.timeAgo.days', { count: days });
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = direction === 'left' ? -300 : 300;
    const newPosition = scrollPosition + scrollAmount;
    
    scrollContainerRef.current.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
    
    setScrollPosition(newPosition);
  };

  const handleCommentClick = () => {
    // Oturum açmamış kullanıcılar da yorumları görebilir
    setShowCommentModal(true);
  };

  useEffect(() => {
    const handleScrollUpdate = () => {
      if (scrollContainerRef.current) {
        setScrollPosition(scrollContainerRef.current.scrollLeft);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScrollUpdate);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScrollUpdate);
      }
    };
  }, []);
  return (
    <div className="bg-white md:rounded-lg md:shadow-sm overflow-hidden mt-[5px] border-t border-gray-200">
      {/* Liste Başlığı ve Kullanıcı Bilgisi */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Mobil ve Desktop için farklı layout */}
        <div className="block md:hidden space-y-2">
          {/* Kullanıcı Bilgileri */}
          {!hideAuthor && (
            <div className="flex items-center gap-3">
              <img
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${list.profiles.username}`);
                }}
                src={`${list.profiles?.avatar}${list.profiles?.avatar?.includes('?') ? '&' : '?'}t=1`}
                alt={list.profiles.full_name}
                className="w-8 h-8 rounded-full cursor-pointer"
              />
              <div>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${list.profiles.username}`);
                  }}
                  className="text-[15px] font-bold hover:underline cursor-pointer"
                >
                  {list.profiles.full_name}
                </span>
                <div className="flex items-center gap-1 text-[13px] text-gray-500">
                  <span>@{list.profiles.username}</span>
                  <span>•</span>
                  <span className="font-bold">{list.created_at ? formatDate(list.created_at) : ''}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Liste Başlığı */}
          <h2
            onClick={() => {
              if (onListClick) onListClick();
              navigate(`/${list.profiles.username}/list/${createSlug(list.title)}`);
            }}
            className="text-[15px] font-bold hover:underline cursor-pointer scale-90 origin-left mb-[2px]"
          >
            {list.title}
          </h2>
          
          {/* Liste Açıklaması */}
          {list.description && (
            <p className="text-[14px] text-gray-600 line-clamp-2 scale-90 origin-left mt-0 font-normal md:line-clamp-2">
              {list.description}
            </p>
          )}
        </div>

        {/* Desktop Layout */}
        {!hideAuthor ? (
          <div className="hidden md:flex md:flex-row md:items-center gap-3">
            <img
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${list.profiles.username}`);
              }}
              src={list.profiles?.avatar}
              alt={list.profiles.full_name}
              className="w-10 h-10 rounded-full cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${list.profiles.username}`);
                  }}
                  className="font-medium hover:underline cursor-pointer"
                >
                  {list.profiles.full_name}
                </span>
                <span className="text-gray-500">{t('listPreview.createdList')}</span>
                <span 
                  onClick={() => {
                    if (onListClick) onListClick();
                    navigate(`/${list.profiles.username}/list/${createSlug(list.title)}`);
                  }}
                  className="font-medium hover:underline cursor-pointer"
                >
                  {list.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>@{list.profiles.username}</span>
                <span>•</span>
                <span>{categoryNames[list.category as keyof typeof categoryNames]}</span>
                <span>•</span>
                <span>{t('listPreview.createdAt')}: {list.created_at ? formatDate(list.created_at) : ''}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:block">
            <h2
              onClick={() => {
                if (onListClick) onListClick();
                navigate(`/${list.profiles.username}/list/${createSlug(list.title)}`);
              }}
              className="text-lg font-semibold hover:underline cursor-pointer"
            >
              {list.title}
            </h2>
            {list.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{list.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Liste İçerikleri */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          id={`list-items-${list.id}`}
          className="flex overflow-x-auto scrollbar-hide px-3 md:px-6 pb-3 md:pb-6 space-x-3 md:space-x-4 scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.filter(item => item.image_url).map((item) => (
            <div 
              key={item.id}
              className={`flex-none ${item.type === 'video' ? 'w-[180px] md:w-[280px]' : 'w-[120px] md:w-[200px]'}`}
              role="button"
              tabIndex={0}
              aria-label={`${item.title}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as any).click(); } }}
              onClick={() => {
                switch (item.type) {
                  case 'movie':
                    navigate(`/movie/${item.external_id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    break;
                  case 'series':
                    navigate(`/series/${item.external_id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    break;
                  case 'book':
                    navigate(`/book/${item.external_id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    break;
                  case 'game':
                    navigate(`/game/${item.external_id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    break;
                  case 'person':
                    navigate(`/person/${item.external_id}/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    break;
                  case 'video':
                    window.open(`https://www.youtube.com/watch?v=${item.external_id}`, '_blank');
                    break;
                  case 'place':
                    // Mekan öğelerine tıklandığında doğrudan Google Maps sayfasını aç
                    window.open(`https://www.google.com/maps/place/?q=place_id:${item.external_id}`, '_blank');
                    break;
                }
              }}
            >
              <div 
                className={`relative ${item.type === 'video' ? 'aspect-video' : 'aspect-[2/3]'} rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity bg-gray-100`}
              >
                {!item.image_url ? (
                  <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center text-center p-4">
                    <div className="text-[12px] md:text-sm text-gray-500 line-clamp-1">{item.title}</div>
                  </div>
                ) : (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={(item.type === 'person' && !item.image_url) ? 
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title)}&backgroundColor=orange` : 
                     item.image_url}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover bg-gray-100"
                  />
                )}
              </div>
              {/* Mekan başlığı */}
              <h3 className="mt-2 font-medium text-[12px] md:text-sm line-clamp-1">
                {item.type === 'place' && item.title.includes('|') 
                  ? item.title.split('|')[0]?.trim() 
                  : item.title}
              </h3>
              
              {/* Mekan bilgileri veya yıl bilgisi */}
              {item.type === 'place' ? (
                <div>
                  {/* Ülke/Şehir bilgisi */}
                  {item.title.includes('|') && (
                    <p className="text-[11px] md:text-xs text-gray-500 line-clamp-1">
                      {(() => {
                        const locationParts = item.title.split('|')[1]?.trim().split(',');
                        if (locationParts && locationParts.length >= 2) {
                          const city = locationParts[0]?.trim();
                          const country = locationParts[locationParts.length - 1]?.trim();
                          return `${country}/${city}`;
                        }
                        return item.title.split('|')[1]?.trim();
                      })()}
                    </p>
                  )}
                  
                  {/* Google Maps butonu */}
                  <div className="text-[10px] md:text-xs text-blue-500 mt-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/place/?q=place_id:${item.external_id}`, '_blank');
                      }}
                      className="flex items-center gap-1"
                    >
                      <MapPin size={10} />
                      <span>Google Maps</span>
                    </button>
                  </div>
                </div>
              ) : item.year && (
                <p className="text-[11px] md:text-sm text-gray-500">{item.year}</p>
              )}
            </div>
          ))}
        </div>

        {/* Kaydırma Butonları */}
        <div className="hidden md:block">
          <button
            className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-opacity ${scrollPosition <= 0 ? 'opacity-0' : 'opacity-100'}`}
            onClick={() => handleScroll('left')}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-opacity ${scrollPosition >= (scrollContainerRef.current?.scrollWidth || 0) - (scrollContainerRef.current?.clientWidth || 0) ? 'opacity-0' : 'opacity-100'}`}
            onClick={() => handleScroll('right')}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Like ve Comment Butonları */}
      {!hideActions && (
        <div className="list-actions flex items-center gap-3 px-3 md:px-6 py-2 md:py-3 border-t">
          <button
            onClick={handleLikeClick}
            className={`flex items-center gap-1 text-gray-600 hover:text-red-500 ${
              isLiked ? 'text-red-500' : ''
            }`}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            <span className="text-sm">{optimisticLikesCount}</span>
          </button>
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1 text-gray-600 hover:text-purple-500"
          >
            <MessageCircle size={16} />
            <span className="text-sm">{optimisticCommentCount}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-500"
          >
            <Share2 size={16} />
          </button>
        </div>
      )}
      
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
      
      <CommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        listId={list.id}
        onCommentAdded={() => setOptimisticCommentCount(prev => prev + 1)}
        onCommentDeleted={() => setOptimisticCommentCount(prev => prev - 1)}
      />
      
      {/* Likes Modal */}
      {showLikesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{t('listPreview.likes')}</h3>
              <button
                onClick={() => setShowLikesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
              {/* Not: Beğenenlerin listesi şu anda devre dışı */}
              <div className="py-8 text-center text-gray-500">
                {t('listPreview.noLikes')}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Paylaşım Modal */}
      {showShareModal && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-[9999]">
          <LinkIcon size={16} />
          <span>{t('listPreview.linkCopied')}</span>
        </div>
      )}
    </div>
  );
}
