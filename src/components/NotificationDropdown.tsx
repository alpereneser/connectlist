import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser'; // supabaseBrowser'ı supabase olarak kullan
import { markNotificationAsRead, deleteNotification, deleteAllNotifications } from '../lib/api';
import { Check, Trash2, X } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { turkishToEnglish } from '../lib/utils';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  markAllReadText: string;
  noNotificationsText: string;
  deleteAllText: string;
  processingText: string;
  onMarkAllRead: () => Promise<void>;
  onNotificationsRead?: () => void; // Bildirimler okunduğunda çağrılacak callback
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
  

  useClickOutside(dropdownRef, onClose);

  const handleMarkAllRead = async () => {
    setIsMarkingRead(true);
    try {
      await onMarkAllRead();
      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: true
      })));
      
      // Tüm bildirimler okunduğunda callback'i çağır
      if (onNotificationsRead) {
        onNotificationsRead();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      // Önce kullanıcı oturumunu kontrol et
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }
      
      // Kullanıcının kendi bildirimlerini al
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        setIsLoading(false);
        return;
      }

      console.log('Fetched notifications:', data);
      setNotifications(data || []);
      setIsLoading(false);
    };

    if (isOpen) {
      fetchNotifications();

      // Subscribe to new notifications
      const notificationsSubscription = supabase
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
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Önce bildirimi okundu olarak işaretlemeyi dene
    try {
      await markNotificationAsRead(notification.id);

      // Bildirimi okundu olarak işaretle ve state'i güncelle
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));

      // Diğer okunmamış bildirimleri kontrol et
      if (!notifications.some(n => !n.is_read && n.id !== notification.id)) {
        onMarkAllRead();
        
        // Tüm bildirimler okunduğunda callback'i çağır
        if (onNotificationsRead) {
          onNotificationsRead();
        }
      }
    } catch (error) {
      // Hata olsa bile devam et, sadece loglama yap
      console.error('Bildirim okundu olarak işaretlenirken hata oluştu:', error);
    }
    
    // Bildirim tipine göre yönlendirme yap - bu kısım her durumda çalışmalı
    try {
      // Bildirim tipine göre doğrudan yönlendirme yap
      let targetUrl = '';
      let slug = '';
      
      let title = '';
      
      switch (notification.type) {
        case 'like':
        case 'comment':
          // Liste detayına yönlendir - Türkçe karakterleri doğru şekilde işle
          title = notification.data.list_title;
          slug = turkishToEnglish(title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, '-');
          targetUrl = `/${notification.data.username}/list/${slug}`;
          console.log('Redirecting to list:', targetUrl);
          break;
        case 'follow':
          // Kullanıcı profiline yönlendir
          targetUrl = `/profile/${notification.data.username}`;
          break;
        case 'message':
          targetUrl = '/messages';
          break;
      }
      
      navigate(targetUrl, {
        state: { 
          listId: notification.data.list_id,
          fromNotification: true, // Bildirimden geldiğini belirt
          type: notification.type // Bildirim tipini de gönder (like veya comment)
        }
      });
      onClose();
    } catch (error) {
      console.error('Yönlendirme sırasında hata oluştu:', error);
    }
  };

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

  const handleDeleteAllNotifications = async () => {
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
    switch (notification.type) {
      case 'like':
        return `${notification.data.username} listenizi beğendi: ${notification.data.list_title}`;
      case 'comment':
        return `${notification.data.username} listenize yorum yaptı: ${notification.data.list_title}`;
      case 'follow':
        return `${notification.data.username} sizi takip etmeye başladı`;
      case 'message':
        return `${notification.data.username} size mesaj gönderdi: ${notification.data.message_text}`;
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingRead || notifications.length === 0}
            className="p-2 text-orange-500 hover:text-orange-600 disabled:opacity-50 rounded-full hover:bg-orange-50"
            title={markAllReadText}
          >
            <Check size={20} className={isMarkingRead ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDeleteAllNotifications}
            disabled={isDeletingAll || notifications.length === 0}
            className="p-2 text-red-500 hover:text-red-600 disabled:opacity-50 rounded-full hover:bg-red-50"
            title={deleteAllText}
          >
            <Trash2 size={20} className={isDeletingAll ? 'animate-spin' : ''} />
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left cursor-pointer ${
                  !notification.is_read ? 'bg-orange-50' : ''
                }`}
              >
                <img
                  src={(() => {
                    const actorAvatarUrl = notification.data.actor_avatar || notification.data.avatar;
                    if (actorAvatarUrl) {
                      return `${actorAvatarUrl}${actorAvatarUrl.includes('?') ? '&' : '?'}t=1`;
                    }
                    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.data.username || 'default'}`;
                  })()}
                  alt={notification.data.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-900">{getNotificationText(notification)}</p>
                      <span className="text-sm text-gray-500">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id, e);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            {noNotificationsText}
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