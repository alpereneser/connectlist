import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { BottomMenu } from '../components/BottomMenu';
import { supabaseBrowser } from '../lib/supabase-browser';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } from '../lib/api';
import { turkishToEnglish } from '../lib/utils';
import { Check, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  data: any;
  is_read: boolean;
  created_at: string;
}

export function Notifications() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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
          navigate('/messages');
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

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 pt-[75px] pb-16">
        <div className="bg-white max-w-2xl mx-auto shadow-sm rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b">
            <h1 className="text-base font-bold">{t('common.notifications.title')}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAllRead || notifications.length === 0}
                className="text-xs text-orange-500 hover:text-orange-600 disabled:opacity-50 flex items-center gap-1 p-1"
              >
                <Check size={14} />
                {isMarkingAllRead ? t('common.notifications.processing') : t('common.notifications.markAllRead')}
              </button>
              <button
                onClick={handleDeleteAllNotifications}
                disabled={isDeletingAll || notifications.length === 0}
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 flex items-center gap-1 p-1"
              >
                <Trash2 size={14} />
                {isDeletingAll ? t('common.notifications.processing') : t('common.notifications.deleteAll')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full flex items-center gap-2 p-2.5 hover:bg-gray-50 transition-colors text-left cursor-pointer ${
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
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <p className="text-xs text-gray-900 font-medium truncate">{getNotificationText(notification)}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0 ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4 text-xs">
              {t('common.notifications.noNotifications')}
            </div>
          )}
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
      <BottomMenu />
    </>
  );
}