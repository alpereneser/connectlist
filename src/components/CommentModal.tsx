import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Smile, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { AuthPopup } from './AuthPopup';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar: string;
  };
  replies?: Comment[];
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  commentCount?: number; // ListDetails'tan gelen toplam yorum sayısı
  isMobile?: boolean;
}

export function CommentModal({ isOpen, onClose, listId, onCommentAdded, onCommentDeleted, commentCount, isMobile = false }: CommentModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Yorum sayısını takip etmek için kullanılmıyor, onCommentAdded callback'i kullanılıyor
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [lastCommentId, setLastCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Kullanıcının oturum durumunu kontrol et
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setCurrentUserId(session?.user?.id || null);
      console.log('Auth check - isAuthenticated:', !!session, 'userId:', session?.user?.id || null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUserId(session?.user?.id || null);
      console.log('Auth state changed - isAuthenticated:', !!session, 'userId:', session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Modal dışına tıklandığında kapanma
  useClickOutside(modalRef, () => {
    if (!showEmojiPicker) {
      onClose();
    }
  });

  // Emoji picker dışına tıklandığında kapanma
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        emojiButtonRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEmojiPickerOpen &&
        emojiPickerRef.current &&
        emojiButtonRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchComments = async () => {
      setError(null);
      setIsLoadingComments(true);

      try {
        const { data, error } = await supabase
          .from('list_comments')
          .select(`
            *,
            profiles (
              username,
              full_name,
              avatar
            )
          `)
          .eq('list_id', listId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        // Organize comments into threads
        const commentThreads = data?.reduce((acc: Comment[], comment: Comment) => {
          if (!comment.parent_id) {
            comment.replies = data?.filter(reply => reply.parent_id === comment.id);
            acc.push(comment);
          }
          return acc;
        }, []);

        setComments(commentThreads);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Yorumlar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      } finally {
        setIsLoadingComments(false);
      }
    };

    fetchComments();

    // Realtime subscription oluştur
    const commentsSubscription = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_comments',
        filter: `list_id=eq.${listId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newComment = payload.new as Comment;
          
          supabase
            .from('profiles')
            .select('username, full_name, avatar')
            .eq('id', newComment.user_id)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                newComment.profiles = profile;
                
                setComments(prev => {
                  if (newComment.parent_id) {
                    return prev.map(comment => {
                      if (comment.id === newComment.parent_id) {
                        return {
                          ...comment,
                          replies: [...(comment.replies || []), newComment]
                        };
                      }
                      return comment;
                    });
                  }
                  return [...prev, { ...newComment, replies: [] }];
                });
              }
            });
        } else if (payload.eventType === 'DELETE') {
          setComments(prev => {
            const newComments = prev.filter(comment => {
              if (comment.id === payload.old.id) return false;
              if (comment.replies) {
                comment.replies = comment.replies.filter(reply => reply.id !== payload.old.id);
              }
              return true;
            });
            return newComments;
          });
          onCommentDeleted?.();
        }
      })
      .subscribe();

    // Cleanup
    return () => {
      commentsSubscription.unsubscribe();
    };
  }, [isOpen, listId]);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('list_comments')
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar
          )
        `)
        .eq('list_id', listId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      // Organize comments into threads
      const commentThreads = data?.reduce((acc: Comment[], comment: Comment) => {
        if (!comment.parent_id) {
          comment.replies = data?.filter(reply => reply.parent_id === comment.id);
          acc.push(comment);
        }
        return acc;
      }, []);

      setComments(commentThreads);
    };
    
    if (isOpen) fetchComments();
  }, [isOpen, listId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    // Kimlik doğrulama kontrolü
    const isAuthenticated = await requireAuth('commenting');
    if (!isAuthenticated) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // Kullanıcı ID'sini güncelle (ama doğrudan userId'yi kullan)
    setCurrentUserId(userId || null);

    try {
      console.log('Yorum gönderiliyor:', {
        list_id: listId,
        user_id: userId, // currentUserId yerine doğrudan userId kullan
        parent_id: replyTo?.id || null,
        text: newComment.trim()
      });
      
      const { data, error } = await supabase
        .from('list_comments')
        .insert({
          list_id: listId,
          user_id: userId, // currentUserId yerine doğrudan userId kullan
          parent_id: replyTo?.id || null,
          text: newComment.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Veritabanı hatası:', error);
        throw error;
      }

      console.log('Yorum başarıyla eklendi:', data);
      
      // Yeni yorumun ID'sini kaydet
      setLastCommentId(data.id);
      
      // Yorum sayısını güncelle
      if (onCommentAdded) {
        onCommentAdded();
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  // Yeni yorum eklendiğinde scroll yapma
  useEffect(() => {
    if (lastCommentId && commentsContainerRef.current) {
      const newCommentElement = document.getElementById(`comment-${lastCommentId}`);
      if (newCommentElement) {
        newCommentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLastCommentId(null); // Reset lastCommentId
      }
    }
  }, [comments, lastCommentId]);

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;

    // Optimistik olarak yorumu kaldır
    setComments(prev => {
      const newComments = prev.filter(comment => {
        if (comment.id === commentId) return false;
        if (comment.replies) {
          comment.replies = comment.replies.filter(reply => reply.id !== commentId);
        }
        return true;
      });
      return newComments;
    });

    setShowDeleteConfirm(null);
    try {
      const { error } = await supabase
        .from('list_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId);

      if (error) throw error;
      onCommentDeleted?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Hata durumunda yorumları yeniden yükle
      const { data } = await supabase
        .from('list_comments')
        .select(`*, profiles(username, full_name, avatar)`)
        .eq('list_id', listId)
        .order('created_at', { ascending: true });

      if (data) {
        const commentThreads = data.reduce((acc: Comment[], comment: Comment) => {
          if (!comment.parent_id) {
            comment.replies = data.filter(reply => reply.parent_id === comment.id);
            acc.push(comment);
          }
          return acc;
        }, []);
        setComments(commentThreads);
      }
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
      return t('listPreview.commentSection.timeAgo.now');
    } else if (minutes < 60) {
      return t('listPreview.commentSection.timeAgo.minutes', { count: minutes });
    } else if (hours < 24) {
      return t('listPreview.commentSection.timeAgo.hours', { count: hours });
    } else {
      return t('listPreview.commentSection.timeAgo.days', { count: days });
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    // Emoji'yi doğrudan ekle
    setNewComment(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    
    // Input'a odaklan
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  // Yorumları ve yanıtları say
  const totalCommentsCount = comments.reduce((acc, comment) => acc + 1 + (comment.replies ? comment.replies.length : 0), 0);
  const displayCommentCount = commentCount !== undefined ? commentCount : totalCommentsCount;

  return (
    <div className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'items-center justify-center'} bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        ref={modalRef}
        className={`bg-white ${isMobile ? 'w-full h-[90vh] rounded-t-2xl' : 'rounded-lg w-full max-w-lg max-h-[80vh]'} flex flex-col transform transition-all duration-300 ease-in-out ${isOpen ? (isMobile ? 'translate-y-0' : 'scale-100 opacity-100') : (isMobile ? 'translate-y-full' : 'scale-95 opacity-0')}`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between ${isMobile ? 'p-4' : 'p-5'} border-b border-gray-200`}>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800`}>
            {t('listPreview.commentSection.title')} ({displayCommentCount})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div ref={commentsContainerRef} className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} id={`comment-${comment.id}`} className={`space-y-3 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                  {/* Ana yorum */}
                  <div className="flex gap-3">
                    <img
                      src={comment.profiles.avatar}
                      alt={comment.profiles.full_name}
                      className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-full object-cover flex-shrink-0`}
                      onClick={() => navigate(`/profile/${comment.user_id}`)}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className="font-medium hover:underline cursor-pointer"
                            onClick={() => navigate(`/profile/${comment.user_id}`)}
                            style={{ fontSize: isMobile ? '13px' : '14px' }}
                          >
                            {comment.profiles.username}
                          </span>
                          <span className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} ml-2`}>
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        {currentUserId === comment.user_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(comment.id);
                            }}
                            className="text-gray-400 hover:text-red-500 text-sm"
                          >
                            {t('listPreview.commentSection.delete')}
                          </button>
                        )}
                      </div>
                      <p className={`text-gray-900 mt-1 ${isMobile ? 'text-sm' : ''}`}>{comment.text}</p>
                      <button
                        onClick={() => setReplyTo(comment)}
                        className={`text-gray-500 hover:text-gray-700 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}
                      >
                        {t('listPreview.commentSection.reply')}
                      </button>
                    </div>
                  </div>

                  {/* Yanıtlar */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className={`${isMobile ? 'ml-8' : 'ml-11'} space-y-3`}>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} id={`comment-${reply.id}`} className="flex gap-3">
                          <img
                            src={reply.profiles.avatar}
                            alt={reply.profiles.full_name}
                            className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-full object-cover flex-shrink-0`}
                            onClick={() => navigate(`/profile/${reply.user_id}`)}
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <span
                                  className="font-medium hover:underline cursor-pointer"
                                  onClick={() => navigate(`/profile/${reply.user_id}`)}
                                  style={{ fontSize: isMobile ? '13px' : '14px' }}
                                >
                                  {reply.profiles.username}
                                </span>
                                <span className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} ml-2`}>
                                  {formatDate(reply.created_at)}
                                </span>
                              </div>
                              {currentUserId === reply.user_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(reply.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 text-sm"
                                >
                                  {t('listPreview.commentSection.delete')}
                                </button>
                              )}
                            </div>
                            <p className={`text-gray-900 mt-1 ${isMobile ? 'text-sm' : ''}`}>{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {t('listPreview.noComments')}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitComment} className={`${isMobile ? 'p-3' : 'p-4'} border-t`}>
          {replyTo && (
            <div className={`flex items-center justify-between bg-gray-50 ${isMobile ? 'p-1.5 rounded-md mb-1.5' : 'p-2 rounded-lg mb-2'}`}>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                <span className="font-medium">{replyTo.profiles.username}</span> {t('listPreview.commentSection.replyingTo')}
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
            <div className="relative flex-shrink-0">
              <button
                ref={emojiButtonRef}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isAuthenticated) {
                    setShowAuthPopup(true);
                    return;
                  }
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`${isMobile ? 'p-1.5' : 'p-2'} text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100`}
              >
                <Smile size={isMobile ? 18 : 20} />
              </button>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className={`absolute ${isMobile ? 'bottom-10 left-0' : 'bottom-12 left-0'} z-50`}>
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    autoFocusSearch={false}
                    searchDisabled
                    skinTonesDisabled
                    lazyLoadEmojis={true}
                    emojiStyle={"google" as any}
                    width={isMobile ? 250 : 300}
                    height={isMobile ? 300 : 400}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                // Input alanına tıklamada kimlik doğrulama kontrolü kaldırıldı
                // Kullanıcı zaten oturum açmışsa popup gösterilmeyecek
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment(e);
                  }
                }}
                placeholder={t('listPreview.commentSection.writeComment')}
                className={`w-full ${isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} pr-10 border rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50`}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className={`absolute ${isMobile ? 'right-1 top-1 p-1.5' : 'right-2 top-2 p-1.5'} text-orange-500 hover:text-orange-600 disabled:opacity-50 rounded-full`}
              >
                <Send size={isMobile ? 16 : 18} />
              </button>
            </div>
          </div>
        </form>
        
        {/* Silme Onay Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className={`bg-white rounded-lg w-full ${isMobile ? 'max-w-xs mx-3' : 'max-w-sm mx-4'}`}>
              <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-2`}>{t('listPreview.commentSection.deleteConfirm')}</h3>
                <p className={`text-gray-600 ${isMobile ? 'text-xs mb-4' : 'text-sm mb-6'}`}>
                  {t('listPreview.commentSection.deleteMessage')}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {t('listPreview.commentSection.cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteComment(showDeleteConfirm)}
                    className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} bg-red-500 text-white rounded-lg hover:bg-red-600`}
                  >
                    {t('listPreview.commentSection.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Auth Popup */}
        <AuthPopup
          isOpen={showAuthPopup}
          onClose={() => setShowAuthPopup(false)}
          message={authMessage}
        />
      </div>
    </div>
  );
}