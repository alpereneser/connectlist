import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

interface CommentSectionProps {
  listId: string;
  currentUserId: string | null;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar: string;
  };
  replies?: Comment[];
}

export const CommentSection: React.FC<CommentSectionProps> = ({ listId, currentUserId }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<{id: string, username: string} | null>(null);
  const [showDeleteConfirmComment, setShowDeleteConfirmComment] = useState<string | null>(null);

  // Yorumları getiren fonksiyon
  const fetchComments = async () => {
    if (!listId) return;
    
    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('list_comments')
        .select(`
          *,
          profiles(id, username, full_name, avatar)
        `)
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ana yorumları ve yanıtları ayır
      const parentComments = data?.filter(comment => comment.parent_id === null) || [];
      const replies = data?.filter(comment => comment.parent_id !== null) || [];

      // Her ana yoruma yanıtlarını ekle
      const commentsWithReplies = parentComments.map(comment => {
        const commentReplies = replies.filter(reply => reply.parent_id === comment.id);
        return {
          ...comment,
          replies: commentReplies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        };
      });

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Yorum gönderme işlevi
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('list_comments')
        .insert({
          list_id: listId,
          user_id: currentUserId,
          parent_id: replyToComment ? replyToComment.id : null,
          text: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setNewComment('');
      setReplyToComment(null);
      await fetchComments();
      
      // E-posta bildirimi tetikle (UI akışını bloklamadan)
      if (data?.id) {
        import('../lib/email-triggers')
          .then(({ triggerListCommentNotification }) => triggerListCommentNotification(data.id))
          .catch((err) => console.error('List yorum e-posta bildirimi tetiklenemedi:', err));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  // Yorum silme işlevi
  const handleDeleteComment = async (commentId: string | null) => {
    if (!currentUserId || !commentId) return;
    
    try {
      const { error } = await supabase
        .from('list_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId);
        
      if (error) throw error;
      
      // Yorumu listeden kaldır - hem ana yorumları hem de yanıtları kontrol et
      setComments(prevComments => {
        // Önce ana yorumları kontrol et
        const filteredComments = prevComments.filter(c => c.id !== commentId);
        
        // Yanıtları kontrol et
        return filteredComments.map(comment => {
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.filter((reply: any) => reply.id !== commentId)
            };
          }
          return comment;
        });
      });
      
      setShowDeleteConfirmComment(null);
      
      // Yorumları güncellemek için tekrar yükle
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // İlk yükleme için yorumları getir
  useEffect(() => {
    fetchComments();
  }, [listId]);

  // Tarih formatı fonksiyonu
  const formatDate = (dateString: string, language: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) {
      return language === 'tr' ? 'Az önce' : 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${language === 'tr' ? 'dakika önce' : 'minutes ago'}`;
    } else if (diffHours < 24) {
      return `${diffHours} ${language === 'tr' ? 'saat önce' : 'hours ago'}`;
    } else if (diffDays < 30) {
      return `${diffDays} ${language === 'tr' ? 'gün önce' : 'days ago'}`;
    } else if (diffMonths < 12) {
      return `${diffMonths} ${language === 'tr' ? 'ay önce' : 'months ago'}`;
    } else {
      return `${diffYears} ${language === 'tr' ? 'yıl önce' : 'years ago'}`;
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">
        {t('listPreview.listDetails.comments.title')}
      </h3>
      
      {/* Yorum Formu */}
      {currentUserId && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex flex-col space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                replyToComment
                  ? t('listPreview.listDetails.comments.replyPlaceholder', { username: replyToComment.username })
                  : t('listPreview.listDetails.comments.placeholder')
              }
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex justify-between items-center">
              {replyToComment && (
                <button
                  type="button"
                  onClick={() => setReplyToComment(null)}
                  className="text-gray-500 text-sm"
                >
                  {t('listPreview.listDetails.comments.cancelReply')}
                </button>
              )}
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 ml-auto"
              >
                {replyToComment
                  ? t('listPreview.listDetails.comments.reply')
                  : t('listPreview.listDetails.comments.submit')}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {/* Yorumlar Listesi */}
      <div className="space-y-4 md:space-y-6">
        {isLoadingComments ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} id={`comment-${comment.id}`} className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              {/* Ana yorum */}
              <div className="flex gap-2 md:gap-3">
                <img
                  src={comment.profiles.avatar}
                  alt={comment.profiles.full_name}
                  className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
                  onClick={() => navigate(`/profile/${comment.profiles.username}`)}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className="font-medium hover:underline cursor-pointer text-xs md:text-base"
                        onClick={() => navigate(`/profile/${comment.profiles.username}`)}
                      >
                        {comment.profiles.username}
                      </span>
                      <span className="text-gray-500 text-[10px] md:text-sm ml-2">
                        {formatDate(comment.created_at, i18n.language)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {currentUserId && (
                        <button
                          onClick={() => setReplyToComment({id: comment.id, username: comment.profiles.username})}
                          className="text-gray-400 hover:text-blue-500 text-[10px] md:text-sm"
                        >
                          {t('listPreview.listDetails.comments.replyButton')}
                        </button>
                      )}
                      {currentUserId === comment.user_id && (
                        <button
                          onClick={() => setShowDeleteConfirmComment(comment.id)}
                          className="text-gray-400 hover:text-red-500 text-[10px] md:text-sm"
                        >
                          {t('listPreview.listDetails.comments.deleteButton')}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap text-xs md:text-base">{comment.text}</p>
                </div>
              </div>

              {/* Yanıtlar */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 md:ml-11 space-y-2 md:space-y-3">
                  {comment.replies.map((reply: Comment) => (
                    <div key={reply.id} id={`comment-${reply.id}`} className="flex gap-2 md:gap-3">
                      <img
                        src={reply.profiles.avatar}
                        alt={reply.profiles.full_name}
                        className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
                        onClick={() => navigate(`/profile/${reply.profiles.username}`)}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <span
                              className="font-medium hover:underline cursor-pointer text-xs md:text-base"
                              onClick={() => navigate(`/profile/${reply.profiles.username}`)}
                            >
                              {reply.profiles.username}
                            </span>
                            <span className="text-gray-500 text-[10px] md:text-sm ml-2">
                              {formatDate(reply.created_at, i18n.language)}
                            </span>
                          </div>
                          {currentUserId === reply.user_id && (
                            <button
                              onClick={() => setShowDeleteConfirmComment(reply.id)}
                              className="text-gray-400 hover:text-red-500 text-[10px] md:text-sm"
                            >
                              {t('listPreview.listDetails.comments.deleteButton')}
                            </button>
                          )}
                        </div>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap text-xs md:text-base">{reply.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-6 text-xs md:text-base md:py-8">
            {t('listPreview.listDetails.comments.noComments')}
          </div>
        )}
      </div>
      
      {/* Yorum Silme Onay Modal */}
      {showDeleteConfirmComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{t('listPreview.listDetails.comments.deleteComment')}</h2>
            <p className="text-gray-600 mb-6">
              {t('listPreview.listDetails.comments.deleteConfirm')}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmComment(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('listPreview.listDetails.cancel')}
              </button>
              <button
                onClick={() => handleDeleteComment(showDeleteConfirmComment)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {t('listPreview.listDetails.comments.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
