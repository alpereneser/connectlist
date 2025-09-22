import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser'; // supabaseBrowser'ı supabase olarak kullan
import { deleteNotification, deleteAllNotifications } from '../lib/api';
import { Check, Trash2, X, Bell, Heart, MessageCircle, UserPlus, List, AlertCircle } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
// removed unused import: turkishToEnglish

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  data: {
    list_id?: string;
    comment_id?: string;
    user_id?: string;
    username?: string;
    full_name?: string;
    avatar?: string;
    list_title?: string;
    comment_text?: string;
    message_text?: string;
    conversation_id?: string;
  };
  is_read: boolean;
  created_at: string;
  user_id: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  markAllReadText: string;
  noNotificationsText: string;
  deleteAllText: string;
  processingText: string;
  onMarkAllRead: () => void;
  onNotificationsRead: () => void;
}

export function NotificationDropdown({ 
  isOpen, 
  onClose, 
  title,
  markAllReadText,
  noNotificationsText,
  deleteAllText,
  onMarkAllRead,
  onNotificationsRead
}: NotificationDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  // Accessibility States
  const [announceMessage, setAnnounceMessage] = useState<string>('');
  const [focusedNotificationIndex, setFocusedNotificationIndex] = useState(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  // Refs
  const notificationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const announceRef = useRef<HTMLDivElement>(null);
  const markAllReadButtonRef = useRef<HTMLButtonElement>(null);
  const deleteAllButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useClickOutside(dropdownRef, onClose);

  // Haptic Feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);
      
  // Screen Reader Announcements
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message);
    setTimeout(() => setAnnounceMessage(''), 1000);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch notifications with profile data
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Enrich notifications with current user profile data
      const enrichedNotifications = await Promise.all(
        (notifications || []).map(async (notification) => {
          if (notification.data?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name, avatar')
              .eq('id', notification.data.user_id)
              .single();

            if (profile) {
              return {
                ...notification,
                data: {
                  ...notification.data,
                  username: profile.username,
                  full_name: profile.full_name,
                  avatar: profile.avatar
                }
              };
            }
          }
          return notification;
        })
      );

      setNotifications(enrichedNotifications);
      
      // Announce notification count
      const unreadCount = enrichedNotifications.filter(n => !n.is_read).length;
      if (unreadCount > 0) {
        announceToScreenReader(`${unreadCount} okunmamış bildirim var`);
      } else {
        announceToScreenReader('Tüm bildirimler okundu');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      announceToScreenReader('Bildirimler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [announceToScreenReader]);

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      triggerHaptic('light');
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      
      announceToScreenReader('Bildirim okundu olarak işaretlendi');
          onNotificationsRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      announceToScreenReader('Bildirim işaretlenirken hata oluştu');
    }
  }, [triggerHaptic, announceToScreenReader, onNotificationsRead]);

  // Mark all notifications as read
  const handleMarkAllRead = useCallback(async () => {
    try {
      setIsMarkingRead(true);
      triggerHaptic('medium');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      announceToScreenReader('Tüm bildirimler okundu olarak işaretlendi');
      onMarkAllRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      announceToScreenReader('Bildirimler işaretlenirken hata oluştu');
    } finally {
      setIsMarkingRead(false);
    }
  }, [triggerHaptic, announceToScreenReader, onMarkAllRead]);


  // Confirm flow is used for delete all; direct handler removed to avoid unused warnings

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    triggerHaptic('medium');
    
    // Mark as read if not already read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.data.list_id) {
          navigate(`/list/${notification.data.list_id}`);
          announceToScreenReader(`${notification.data.list_title || 'Liste'} sayfasına yönlendirildi`);
        }
        break;
      case 'follow':
        if (notification.data.username) {
          navigate(`/profile/${notification.data.username}`);
          announceToScreenReader(`${notification.data.username} profiline yönlendirildi`);
        }
        break;
      case 'message':
        navigate('/messages');
        announceToScreenReader('Mesajlar sayfasına yönlendirildi');
        break;
    }
      
    onClose();
  }, [triggerHaptic, handleMarkAsRead, navigate, announceToScreenReader, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    setIsKeyboardNavigation(true);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = focusedNotificationIndex < notifications.length - 1 
          ? focusedNotificationIndex + 1 
          : 0;
        setFocusedNotificationIndex(nextIndex);
        notificationRefs.current[nextIndex]?.focus();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = focusedNotificationIndex > 0 
          ? focusedNotificationIndex - 1 
          : notifications.length - 1;
        setFocusedNotificationIndex(prevIndex);
        notificationRefs.current[prevIndex]?.focus();
        break;
        
      case 'Home':
        e.preventDefault();
        setFocusedNotificationIndex(0);
        notificationRefs.current[0]?.focus();
        break;
        
      case 'End':
        e.preventDefault();
        const lastIndex = notifications.length - 1;
        setFocusedNotificationIndex(lastIndex);
        notificationRefs.current[lastIndex]?.focus();
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedNotificationIndex >= 0 && focusedNotificationIndex < notifications.length) {
          handleNotificationClick(notifications[focusedNotificationIndex]);
        }
        break;
        
      case 'r':
        e.preventDefault();
        if (focusedNotificationIndex >= 0 && focusedNotificationIndex < notifications.length) {
          const notification = notifications[focusedNotificationIndex];
          if (!notification.is_read) {
            handleMarkAsRead(notification.id);
        }
        }
        break;
        
      case 'Escape':
        e.preventDefault();
      onClose();
        announceToScreenReader('Bildirimler kapatıldı');
        break;
    }
  }, [focusedNotificationIndex, notifications, handleNotificationClick, handleMarkAsRead, onClose, announceToScreenReader]);

  // Get notification icon
  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" aria-hidden="true" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" aria-hidden="true" />;
      case 'list_add':
        return <List className="h-4 w-4 text-orange-500" aria-hidden="true" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-purple-500" aria-hidden="true" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
  }, []);

  // Format notification time
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes}dk`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}sa`;
    return `${Math.floor(diffInMinutes / 1440)}g`;
  }, []);

  // Get notification title
  const getNotificationTitle = useCallback((notification: Notification) => {
    const displayName = notification.data.full_name || notification.data.username || 'Kullanıcı';
    
    switch (notification.type) {
      case 'like':
        return `${displayName} listenizi beğendi`;
      case 'comment':
        return `${displayName} listenize yorum yaptı`;
      case 'follow':
        return `${displayName} sizi takip etmeye başladı`;
      case 'message':
        return `${displayName} size mesaj gönderdi`;
      default:
        return 'Bildirim';
    }
  }, []);

  // Get notification message
  const getNotificationMessage = useCallback((notification: Notification) => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return notification.data.list_title || 'Liste';
      case 'follow':
        return notification.data.username || 'Kullanıcı';
      case 'message':
        return notification.data.message_text?.substring(0, 50) + '...' || 'Mesaj';
      default:
        return '';
    }
  }, []);

  // Get notification avatar
  const getNotificationAvatar = useCallback((notification: Notification) => {
    // Supabase storage URL'lerinde cache busting için timestamp ekle
    const avatar = notification.data.avatar;
    if (avatar && avatar.includes('supabase.co')) {
      const separator = avatar.includes('?') ? '&' : '?';
      return `${avatar}${separator}t=${Date.now()}`;
    }
    
    // Fallback olarak initials avatar kullan
    const name = notification.data.full_name || notification.data.username || 'User';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f97316`;
  }, []);

  // Focus management
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      // Focus first notification when opened
      setTimeout(() => {
        setFocusedNotificationIndex(0);
        notificationRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen, notifications.length]);

  // Clear keyboard navigation flag on mouse use
  useEffect(() => {
    const handleMouseMove = () => {
      setIsKeyboardNavigation(false);
    };
    
    if (isKeyboardNavigation) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isKeyboardNavigation]);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(notificationId);
  };

  const confirmDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllNotificationsConfirm = async () => {
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

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef} 
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg overflow-hidden z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
      aria-describedby="notifications-description"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Screen Reader Announcements */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announceMessage}
      </div>

      {/* Hidden Description */}
      <div id="notifications-description" className="sr-only">
        Bildirimler listesi. Ok tuşları ile gezinebilir, Enter ile açabilir, R tuşu ile okundu işaretleyebilirsiniz.
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 id="notifications-title" className="text-lg font-semibold">{title}</h2>
          <button
            ref={markAllReadButtonRef}
            onClick={handleMarkAllRead}
            disabled={isMarkingRead || notifications.length === 0 || notifications.every(n => n.is_read)}
            className="p-2 text-orange-500 hover:text-orange-600 disabled:opacity-50 rounded-full hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            aria-label={markAllReadText}
            title={markAllReadText}
          >
            <Check size={20} className={isMarkingRead ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
          <button
            ref={deleteAllButtonRef}
            onClick={handleDeleteAllNotificationsConfirm}
            disabled={isDeletingAll || notifications.length === 0}
            className="p-2 text-red-500 hover:text-red-600 disabled:opacity-50 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            aria-label={deleteAllText}
            title={deleteAllText}
          >
            <Trash2 size={20} className={isDeletingAll ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
        <button
          ref={closeButtonRef}
          onClick={() => {
            onClose();
            announceToScreenReader('Bildirimler kapatıldı');
          }}
          className="text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Bildirimleri kapat"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-label="Yükleniyor">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" aria-hidden="true" />
            <span className="sr-only">Bildirimler yükleniyor...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8" role="status">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-gray-500">{noNotificationsText}</p>
          </div>
        ) : (
          <div role="list" aria-label="Bildirimler listesi">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                ref={(el) => { notificationRefs.current[index] = el; }}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset ${
                  !notification.is_read ? 'bg-orange-50' : ''
                } ${
                  isKeyboardNavigation && focusedNotificationIndex === index ? 'ring-2 ring-orange-500' : ''
                }`}
                role="listitem"
                tabIndex={0}
                aria-label={`${getNotificationTitle(notification)}. ${getNotificationMessage(notification)}. ${
                  notification.is_read ? 'Okundu' : 'Okunmadı'
                }. ${formatTime(notification.created_at)} önce.`}
                onFocus={() => setFocusedNotificationIndex(index)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={getNotificationAvatar(notification)}
                      alt={notification.data.full_name || notification.data.username || 'User'}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${notification.data.full_name || notification.data.username || '?'}`;
                      }}
                    />
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                                    <div className="flex-1">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {getNotificationTitle(notification)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {getNotificationMessage(notification)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-400">
                          {formatTime(notification.created_at)}
                      </span>
                        <button
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label={i18n.language === 'tr' ? 'Bildirimi sil' : 'Delete notification'}
                          title={i18n.language === 'tr' ? 'Bildirimi sil' : 'Delete notification'}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                        {!notification.is_read && (
                          <div 
                            className="w-2 h-2 bg-orange-500 rounded-full" 
                            aria-label="Okunmamış bildirim göstergesi"
                            role="status"
                          />
                        )}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Bildirim Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-lg w-full max-w-xs mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{i18n.language === 'tr' ? 'Bildirimi Sil' : 'Delete Notification'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {i18n.language === 'tr' 
                  ? 'Bu bildirimi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.' 
                  : 'Are you sure you want to delete this notification? This action cannot be undone.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  {i18n.language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={() => confirmDeleteNotification(showDeleteConfirm)}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  {i18n.language === 'tr' ? 'Sil' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tüm Bildirimleri Silme Onay Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="bg-white rounded-lg w-full max-w-xs mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{i18n.language === 'tr' ? 'Tüm Bildirimleri Sil' : 'Delete All Notifications'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {i18n.language === 'tr' 
                  ? 'Tüm bildirimleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.' 
                  : 'Are you sure you want to delete all notifications? This action cannot be undone.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  {i18n.language === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  onClick={confirmDeleteAllNotifications}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  {i18n.language === 'tr' ? 'Tümünü Sil' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
}