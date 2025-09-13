import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser } from '../lib/supabase-browser';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } from '../lib/api';
import { turkishToEnglish } from '../lib/utils';
import { 
  Check, 
  Trash2, 
  Bell, 
  BellOff, 
  Filter, 
  Search,
  Heart,
  MessageCircle,
  UserPlus,
  Mail,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationGroup {
  type: string;
  notifications: Notification[];
  count: number;
  latestTime: string;
}

export function Notifications() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Core State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Mobile Gestures & Interactions
  const [swipedNotification, setSwipedNotification] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<{ [key: string]: number }>({});
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, notificationId: '' });
  
  // Advanced Features
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'like' | 'comment' | 'follow' | 'message'>('all');
  const [isGrouped, setIsGrouped] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Performance & Optimization
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notificationCache, setNotificationCache] = useState<Map<string, Notification>>(new Map());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  // Modals & UI State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showNotificationDetail, setShowNotificationDetail] = useState<Notification | null>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Accessibility
  const [announceMessage, setAnnounceMessage] = useState<string>('');
  const [focusedNotificationIndex, setFocusedNotificationIndex] = useState(-1);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile Utility Functions
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[type]);
    }
  };

  const announceToScreenReader = (message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 1000);
  };

  // Lazy Loading Image Component
  const LazyImage: React.FC<{
    src: string;
    alt: string;
    className?: string;
    fallbackSrc?: string;
  }> = ({ src, alt, className = '', fallbackSrc }) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !imageSrc) {
              setImageSrc(src);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }, [src, imageSrc]);

    const handleImageLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleImageError = () => {
      setIsLoading(false);
      setHasError(true);
      setImageErrors(prev => new Set([...prev, src]));
      
      if (fallbackSrc && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
        setHasError(false);
      }
    };

    const getPlaceholderAvatar = (username: string) => {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=f3f4f6`;
    };

    return (
      <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
          </div>
        )}
        
        {imageSrc && (
          <img
            src={hasError ? getPlaceholderAvatar(alt) : imageSrc}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        )}
        
        {!imageSrc && (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-400 text-xs">{alt.slice(0, 2).toUpperCase()}</div>
          </div>
        )}
      </div>
    );
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'message':
        return <Mail className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filter and search functions
  const getFilteredNotifications = () => {
    let filtered = notifications;

    // Apply filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'unread') {
        filtered = filtered.filter(n => !n.is_read);
      } else {
        filtered = filtered.filter(n => n.type === selectedFilter);
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        getNotificationText(n).toLowerCase().includes(query) ||
        n.data.username?.toLowerCase().includes(query) ||
        n.data.list_title?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Group notifications by type and date
  const getGroupedNotifications = (): NotificationGroup[] => {
    const filtered = getFilteredNotifications();
    const groups: { [key: string]: NotificationGroup } = {};

    filtered.forEach(notification => {
      const key = `${notification.type}-${new Date(notification.created_at).toDateString()}`;
      
      if (!groups[key]) {
        groups[key] = {
          type: notification.type,
          notifications: [],
          count: 0,
          latestTime: notification.created_at
        };
      }
      
      groups[key].notifications.push(notification);
      groups[key].count++;
      
      if (new Date(notification.created_at) > new Date(groups[key].latestTime)) {
        groups[key].latestTime = notification.created_at;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime()
    );
  };

  // Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      notificationId
    });
  };

  const handleTouchMove = (e: React.TouchEvent, notificationId: string) => {
    if (touchStart.notificationId !== notificationId) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Only allow horizontal swipe
    if (Math.abs(deltaY) > 50) return;
    
    // Prevent default scrolling when swiping horizontally
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
    
    // Update swipe offset
    setSwipeOffset(prev => ({
      ...prev,
      [notificationId]: Math.max(-120, Math.min(0, deltaX))
    }));
    
    // Haptic feedback at 50% swipe
    if (Math.abs(deltaX) > 60 && !swipedNotification) {
      triggerHapticFeedback('light');
      setSwipedNotification(notificationId);
    }
  };

  const handleTouchEnd = (notificationId: string) => {
    const offset = swipeOffset[notificationId] || 0;
    
    if (offset < -60) {
      // Show delete action
      setSwipeOffset(prev => ({
        ...prev,
        [notificationId]: -80
      }));
      setSwipedNotification(notificationId);
      triggerHapticFeedback('medium');
    } else {
      // Reset position
      setSwipeOffset(prev => ({
        ...prev,
        [notificationId]: 0
      }));
      setSwipedNotification(null);
    }
  };

  // Pull to Refresh
  const handlePullStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY, notificationId: '' });
      setIsPulling(true);
    }
  };

  const handlePullMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStart.y;
    
    if (deltaY > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(120, deltaY));
      
      if (deltaY > 80 && !isRefreshing) {
        triggerHapticFeedback('light');
      }
    }
  };

  const handlePullEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHapticFeedback('medium');
      announceToScreenReader('Bildirimler yenileniyor');
      
      // Simulate refresh - call existing fetch function
      setTimeout(() => {
        // Use existing fetchData or create new function
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
        announceToScreenReader('Bildirimler yenilendi');
      }, 1500);
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  // Infinite Scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreNotifications();
    }
  }, [loadingMore, hasMore]);

  const loadMoreNotifications = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      // Simulate loading more notifications
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app, fetch next page of notifications
      const nextPage = page + 1;
      setPage(nextPage);
      
      // Simulate reaching end
      if (nextPage >= 5) {
        setHasMore(false);
        announceToScreenReader('Tüm bildirimler yüklendi');
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Cache Management
  const getCachedNotification = (id: string): Notification | undefined => {
    return notificationCache.get(id);
  };

  const setCachedNotification = (notification: Notification) => {
    setNotificationCache(prev => {
      const newCache = new Map(prev);
      newCache.set(notification.id, notification);
      
      // Limit cache size
      if (newCache.size > 100) {
        const firstKey = newCache.keys().next().value;
        if (firstKey) {
          newCache.delete(firstKey);
        }
      }
      
      return newCache;
    });
  };

  // Enhanced notification actions
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      triggerHapticFeedback('light');
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      
      await markNotificationAsRead(notificationId);
      announceToScreenReader('Bildirim okundu olarak işaretlendi');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      triggerHapticFeedback('medium');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setSwipedNotification(null);
      setSwipeOffset(prev => {
        const newOffset = { ...prev };
        delete newOffset[notificationId];
        return newOffset;
      });
      
      await deleteNotification(notificationId);
      announceToScreenReader('Bildirim silindi');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleBulkAction = async (action: 'read' | 'delete') => {
    if (selectedNotifications.size === 0) return;
    
    try {
      triggerHapticFeedback('medium');
      
      if (action === 'read') {
        setNotifications(prev => 
          prev.map(n => 
            selectedNotifications.has(n.id) 
              ? { ...n, is_read: true }
              : n
          )
        );
        announceToScreenReader(`${selectedNotifications.size} bildirim okundu olarak işaretlendi`);
      } else {
        setNotifications(prev => 
          prev.filter(n => !selectedNotifications.has(n.id))
        );
        announceToScreenReader(`${selectedNotifications.size} bildirim silindi`);
      }
      
      setSelectedNotifications(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabaseBrowser
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data);
      setIsLoading(false);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const notificationsSubscription = supabaseBrowser
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    // Önce bildirimi okundu olarak işaretlemeyi dene
    try {
      await markNotificationAsRead(notification.id);
      
      // Bildirimi okundu olarak işaretle ve state'i güncelle
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      // Hata olsa bile devam et, sadece loglama yap
      console.error('Bildirim okundu olarak işaretlenirken hata oluştu:', error);
    }
    
    // Bildirim tipine göre yönlendirme yap - bu kısım her durumda çalışmalı
    try {
      switch (notification.type) {
        case 'like':
        case 'comment':
          // Liste detayına yönlendir - Bildirim verisini kullan
          if (notification.data.list_id && notification.data.username) {
            // Türkçe karakterleri İngilizce karakterlere dönüştür
            const normalizedTitle = turkishToEnglish(notification.data.list_title || '');
            // Slug oluştur - sadece harfler, rakamlar ve tire kullanarak
            const slug = normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            
            // Doğrudan yönlendirme yap
            navigate(`/${notification.data.username}/list/${slug}`, {
              state: { 
                listId: notification.data.list_id,
                fromNotification: true, // Bildirimden geldiğini belirt
                type: notification.type // Bildirim tipini de gönder (like veya comment)
              }
            });
          } else {
            console.error('Liste ID veya kullanıcı adı bulunamadı:', notification.data);
          }
          break;
        case 'follow':
          // Kullanıcı profiline yönlendir - Bildirim verisini kullan
          navigate(`/profile/${notification.data.username}`);
          break;
        case 'message':
          // Eğer gönderenden konuşma başlatmak için kullanıcı id'si/username geldiyse state ile aktar
          if (notification.data?.sender_id) {
            navigate('/messages', { state: { userId: notification.data.sender_id } });
          } else if (notification.data?.username) {
            navigate('/messages', { state: { username: notification.data.username } });
          } else {
            navigate('/messages');
          }
          break;
      }
    } catch (error) {
      console.error('Yönlendirme sırasında hata oluştu:', error);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleDeleteAllNotifications = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAllNotifications = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setShowDeleteAllConfirm(false);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    } finally {
      setIsDeletingAll(false);
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
      return 'şimdi';
    } else if (minutes < 60) {
      return `${minutes}d`;
    } else if (hours < 24) {
      return `${hours}s`;
    } else {
      return `${days}g`;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const tr = i18n.language?.toLowerCase().startsWith('tr');
    const u = notification.data?.username || '';
    const title = notification.data?.list_title || '';
    const msg = notification.data?.message_text || '';
    switch (notification.type) {
      case 'like':
        return tr ? `${u} listenizi beğendi: ${title}` : `${u} liked your list: ${title}`;
      case 'comment':
        return tr ? `${u} listenize yorum yaptı: ${title}` : `${u} commented on your list: ${title}`;
      case 'follow':
        return tr ? `${u} sizi takip etmeye başladı` : `${u} started following you`;
      case 'message':
        return tr ? `${u} size mesaj gönderdi: ${msg}` : `${u} sent you a message: ${msg}`;
      default:
        return '';
    }
  };

  // Confirm delete with modal
  const confirmDeleteNotification = async (notificationId: string) => {
    try {
      await handleDeleteNotification(notificationId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteNotificationClick = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(notificationId);
  };

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const filteredNotifications = getFilteredNotifications();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedNotificationIndex(prev => 
          Math.min(prev + 1, filteredNotifications.length - 1)
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setFocusedNotificationIndex(prev => Math.max(prev - 1, -1));
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedNotificationIndex >= 0 && focusedNotificationIndex < filteredNotifications.length) {
          const notification = filteredNotifications[focusedNotificationIndex];
          handleNotificationClick(notification);
        }
        break;
        
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (focusedNotificationIndex >= 0 && focusedNotificationIndex < filteredNotifications.length) {
          const notification = filteredNotifications[focusedNotificationIndex];
          setShowDeleteConfirm(notification.id);
        }
        break;
        
      case 'r':
        e.preventDefault();
        if (focusedNotificationIndex >= 0 && focusedNotificationIndex < filteredNotifications.length) {
          const notification = filteredNotifications[focusedNotificationIndex];
          if (!notification.is_read) {
            handleMarkAsRead(notification.id);
          }
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowFilters(false);
        setShowSearchResults(false);
        setIsSelectionMode(false);
        setSelectedNotifications(new Set());
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (focusedNotificationIndex >= 0 && notificationRefs.current[focusedNotificationIndex]) {
      notificationRefs.current[focusedNotificationIndex]?.focus();
    }
  }, [focusedNotificationIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Screen Reader Announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announceMessage}
      </div>

      {/* Page Header below global header (Instagram-like) */}
      <div className="bg-white border-b sticky z-40" style={{ top: 'calc(var(--safe-area-inset-top) + var(--header-height))' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-semibold text-gray-900">
              {t('common.notifications.title', 'Notifications')}
            </h1>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Search Button */}
            <button
              onClick={() => {
                setShowSearchResults(!showSearchResults);
                if (!showSearchResults) {
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={t('common.search', 'Search')}
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-colors ${
                showFilters ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label={t('common.notifications.filter', 'Filter')}
              aria-pressed={showFilters}
            >
              <Filter className="h-5 w-5" />
            </button>
            
            {/* Selection Mode Button */}
            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`p-2 rounded-full transition-colors ${
                isSelectionMode ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label={t('common.notifications.selectionMode', 'Selection mode')}
              aria-pressed={isSelectionMode}
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearchResults && (
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.notifications.searchPlaceholder', 'Search notifications...')}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                role="searchbox"
                aria-label={t('common.notifications.searchPlaceholder', 'Search notifications...')}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                  aria-label={t('common.notifications.clear', 'Clear')}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="px-4 pb-4 border-t bg-gray-50">
            <div className="py-3">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('common.notifications.filters', 'Filters')}</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: t('common.notifications.all', 'All'), icon: Bell },
                  { key: 'unread', label: t('common.notifications.unread', 'Unread'), icon: BellOff },
                  { key: 'like', label: t('common.notifications.likes', 'Likes'), icon: Heart },
                  { key: 'comment', label: t('common.notifications.comments', 'Comments'), icon: MessageCircle },
                  { key: 'follow', label: t('common.notifications.followers', 'Follows'), icon: UserPlus },
                  { key: 'message', label: t('common.notifications.messages', 'Messages'), icon: Mail }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFilter(key as any)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm transition-all ${
                      selectedFilter === key
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                    role="radio"
                    aria-checked={selectedFilter === key}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGrouped}
                      onChange={(e) => setIsGrouped(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-600">{t('common.notifications.group', 'Group')}</span>
                  </label>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedFilter('all');
                    setSearchQuery('');
                    setIsGrouped(false);
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  {t('common.notifications.clear', 'Clear')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Actions Bar */}
        {isSelectionMode && selectedNotifications.size > 0 && (
          <div className="px-4 py-3 bg-orange-50 border-t flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('common.notifications.selectedCount', '{{count}} selected', { count: selectedNotifications.size })}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('read')}
                className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
              >
                <Check className="h-4 w-4" />
                <span>{t('common.notifications.markRead', 'Read')}</span>
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t('common.delete', 'Delete')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pull to Refresh Indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 z-50 flex justify-center pt-2"
          style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
        >
          <div className="bg-white rounded-full shadow-lg p-2">
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
            ) : (
              <div 
                className="h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"
                style={{ 
                  transform: `rotate(${(pullDistance / 80) * 360}deg)`,
                  opacity: Math.min(pullDistance / 80, 1)
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-gray-50 pt-12"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="main"
        aria-label={t('common.notifications.listAria', 'Notifications list')}
      >
      <div className="px-4 pb-16">
        <div className="max-w-2xl mx-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-2 text-gray-500 text-sm">{t('common.notifications.loading', 'Loading notifications...')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center mt-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm border border-gray-200">
                  <Bell className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-600 text-sm mt-4">{t('common.notifications.noNotifications', 'No notifications yet')}</p>
                <p className="text-gray-400 text-xs mt-1">{t('common.notifications.noNotificationsHint', 'New notifications will appear here')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Action buttons - only show if there are notifications */}
                <div className="px-4 py-3 bg-white border-b flex flex-wrap gap-2 justify-between rounded-t-xl">
                  <div className="flex gap-2">
              <button
                onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead || notifications.every(n => n.is_read)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                      {isMarkingAllRead ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span className="text-xs">{t('common.notifications.markAllRead', 'Mark all as read')}</span>
                  </button>
                  <button
                    onClick={handleDeleteAllNotifications}
                      className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                  >
                      <Trash2 className="h-3 w-3" />
                      <span className="text-xs">{t('common.notifications.deleteAll', 'Delete all')}</span>
                  </button>
                </div>
          </div>

                {/* Notifications List */}
                {(isGrouped ? getGroupedNotifications() : [{ notifications: getFilteredNotifications() }]).map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Group Header */}
                    {isGrouped && 'type' in group && (
                      <div className="px-4 py-2 bg-gray-50 border-b">
                        <div className="flex items-center space-x-2">
                          {getNotificationIcon(group.type)}
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {group.type === 'like' ? 'Beğeniler' :
                             group.type === 'comment' ? 'Yorumlar' :
                             group.type === 'follow' ? 'Takipçiler' :
                             group.type === 'message' ? 'Mesajlar' : group.type}
                          </span>
                          <span className="text-xs text-gray-500">({group.count})</span>
            </div>
                      </div>
                    )}

                    {/* Notification Items */}
                    {group.notifications.map((notification, index) => {
                      const globalIndex = groupIndex * 50 + index; // Rough estimate for focus management
                      const swipeOffsetValue = swipeOffset[notification.id] || 0;
                      
                      return (
                <div
                  key={notification.id}
                          ref={(el) => {
                            if (notificationRefs.current) {
                              notificationRefs.current[globalIndex] = el;
                            }
                          }}
                          className="relative overflow-hidden"
                        >
                          {/* Swipe Action Background */}
                          <div className="absolute inset-y-0 right-0 flex items-center justify-end bg-red-500 px-4">
                            <Trash2 className="h-5 w-5 text-white" />
                          </div>

                          {/* Main Notification Item */}
                          <div
                            className={`relative bg-white transform transition-transform duration-200 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none ${
                    !notification.is_read ? 'bg-orange-50' : ''
                            } ${
                              focusedNotificationIndex === globalIndex ? 'ring-2 ring-orange-500' : ''
                            } ${
                              isSelectionMode ? 'pl-12' : ''
                            }`}
                            style={{
                              transform: `translateX(${swipeOffsetValue}px)`
                            }}
                            role="button"
                            tabIndex={0}
                            aria-describedby={`notification-${notification.id}-description`}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(notification); } }}
                            onTouchStart={(e) => handleTouchStart(e, notification.id)}
                            onTouchMove={(e) => handleTouchMove(e, notification.id)}
                            onTouchEnd={() => handleTouchEnd(notification.id)}
                            onClick={() => {
                              if (isSelectionMode) {
                                const newSelected = new Set(selectedNotifications);
                                if (newSelected.has(notification.id)) {
                                  newSelected.delete(notification.id);
                                } else {
                                  newSelected.add(notification.id);
                                }
                                setSelectedNotifications(newSelected);
                                triggerHapticFeedback('light');
                              } else {
                                handleNotificationClick(notification);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-describedby={`notification-${notification.id}-description`}
                            aria-pressed={isSelectionMode ? selectedNotifications.has(notification.id) : undefined}
                          >
                            {/* Selection Checkbox */}
                            {isSelectionMode && (
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <input
                                  type="checkbox"
                                  checked={selectedNotifications.has(notification.id)}
                                  onChange={() => {}}
                                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                                  tabIndex={-1}
                                />
                              </div>
                            )}

                            <div className="flex items-start p-4 space-x-3">
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                <LazyImage
                                  src={notification.data.avatar_url || ''}
                                  alt={notification.data.username || 'User'}
                                  className="w-10 h-10 rounded-full"
                                />
                                
                                {/* Notification Type Icon */}
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                                  {getNotificationIcon(notification.type)}
                                </div>
                              </div>

                              {/* Content */}
                  <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      id={`notification-${notification.id}-description`}
                                      className={`text-sm leading-relaxed ${
                                        !notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'
                                      }`}
                                    >
                                      {getNotificationText(notification)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(notification.created_at).toLocaleString('tr-TR', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="flex items-center space-x-1 ml-2">
                                    {/* Unread Indicator */}
                          {!notification.is_read && (
                                      <div className="w-2 h-2 bg-orange-500 rounded-full" aria-label="Okunmamış" />
                                    )}
                                    
                                    {/* Mark as Read Button */}
                                    {!notification.is_read && !isSelectionMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkAsRead(notification.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-green-500 rounded transition-colors"
                                        aria-label="Okundu olarak işaretle"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                    )}
                                    
                                    {/* Delete Button */}
                                    {!isSelectionMode && (
                                      <button
                                        onClick={(e) => handleDeleteNotificationClick(notification.id, e)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                        aria-label="Bildirimi sil"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                          )}
                                    
                                    {/* More Options */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNotificationDetail(notification);
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                      aria-label="Detayları göster"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                        </div>
                      </div>
                              </div>
                            </div>
                          </div>

                          {/* Swipe Delete Action */}
                          {swipedNotification === notification.id && (
                      <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                              aria-label="Sil"
                      >
                              <Trash2 className="h-5 w-5" />
                      </button>
                          )}
                    </div>
                      );
                    })}
                </div>
              ))}

                {/* Infinite Scroll Loading */}
                {loadingMore && (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 text-orange-500 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">Daha fazla bildirim yükleniyor...</p>
            </div>
                )}

                {/* End of List */}
                {!hasMore && notifications.length > 0 && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">Tüm bildirimler yüklendi</p>
            </div>
          )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bildirim Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-lg w-full max-w-xs mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-3">
              <h3 className="text-base font-semibold mb-1">{t('common.notifications.deleteConfirm')}</h3>
              <p className="text-gray-600 text-xs mb-3">
                {t('common.notifications.deleteMessage')}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  {t('common.notifications.cancel')}
                </button>
                <button
                  onClick={() => confirmDeleteNotification(showDeleteConfirm)}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  {t('common.notifications.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tüm Bildirimleri Silme Onay Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="bg-white rounded-lg w-full max-w-xs mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-3">
              <h3 className="text-base font-semibold mb-1">{t('common.notifications.deleteAllConfirm')}</h3>
              <p className="text-gray-600 text-xs mb-3">
                {t('common.notifications.deleteAllMessage')}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  {t('common.notifications.cancel')}
                </button>
                <button
                  onClick={confirmDeleteAllNotifications}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  {t('common.notifications.deleteAll')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Bottom Sheet - Notification Detail */}
      {showNotificationDetail && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center"
          onClick={() => setShowNotificationDetail(null)}
        >
          <div 
            className="bg-white w-full max-w-md mx-auto rounded-t-xl sm:rounded-xl overflow-hidden transform transition-transform duration-300 ease-out"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-detail-title"
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-3 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 id="notification-detail-title" className="text-lg font-semibold text-gray-900">
                {t('common.notifications.detail', 'Notification Detail')}
              </h2>
              <button
                onClick={() => setShowNotificationDetail(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Kapat"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="flex items-start space-x-3 mb-4">
                <LazyImage
                  src={showNotificationDetail.data.avatar_url || ''}
                  alt={showNotificationDetail.data.username || 'User'}
                  className="w-12 h-12 rounded-full flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {getNotificationIcon(showNotificationDetail.type)}
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {(showNotificationDetail.type === 'like' ? t('common.notifications.like', 'Like') :
                        showNotificationDetail.type === 'comment' ? t('common.notifications.comment', 'Comment') :
                        showNotificationDetail.type === 'follow' ? t('common.notifications.follow', 'Follow') :
                        showNotificationDetail.type === 'message' ? t('common.notifications.message', 'Message') : showNotificationDetail.type)}
                    </span>
                    {!showNotificationDetail.is_read && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </div>
                  
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">
                    {getNotificationText(showNotificationDetail)}
                  </p>
                  
                  <p className="text-xs text-gray-500">
                    {new Date(showNotificationDetail.created_at).toLocaleString(i18n.language?.toLowerCase().startsWith('tr') ? 'tr-TR' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Additional Info */}
              {showNotificationDetail.data.list_title && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{t('common.notifications.relatedList', 'Related List')}</h4>
                  <p className="text-sm text-gray-600">{showNotificationDetail.data.list_title}</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="px-4 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-2">
              {!showNotificationDetail.is_read && (
                <button
                  onClick={() => {
                    handleMarkAsRead(showNotificationDetail.id);
                    setShowNotificationDetail(null);
                  }}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>{t('common.notifications.markRead', 'Mark as read')}</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  handleNotificationClick(showNotificationDetail);
                  setShowNotificationDetail(null);
                }}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
                <span>{t('common.notifications.go', 'Go')}</span>
              </button>
              
              <button
                onClick={() => {
                  handleDeleteNotification(showNotificationDetail.id);
                  setShowNotificationDetail(null);
                }}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t('common.delete', 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
