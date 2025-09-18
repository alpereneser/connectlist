import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Reply, Edit, Trash2, User } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { 
  getComments, 
  createComment, 
  deleteComment, 
  updateComment,
  Comment,
  CreateCommentData 
} from '../api/comments';
import { useAuth } from '../contexts/AuthContext';

interface ContentCommentsProps {
  contentType: 'movie' | 'series' | 'book' | 'game' | 'person' | 'place';
  contentId: string;
  contentTitle: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onReply, 
  onEdit, 
  onDelete, 
  currentUserId,
  level = 0 
}) => {
  const isOwner = currentUserId === comment.user_id;
  const marginLeft = level * 20;

  return (
    <div className={`border-l-2 border-gray-100 pl-4 py-3`} style={{ marginLeft: `${marginLeft}px` }}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {comment.user?.user_metadata?.avatar_url ? (
            <img 
              src={comment.user.user_metadata.avatar_url} 
              alt={comment.user?.user_metadata?.full_name || comment.user?.email || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {comment.user?.user_metadata?.full_name || comment.user?.email || 'Anonim Kullanıcı'}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('tr-TR')}
            </span>
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed mb-2">
            {comment.content}
          </p>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => onReply(comment.id)}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center space-x-1"
            >
              <Reply className="w-3 h-3" />
              <span>Yanıtla</span>
            </button>
            
            {isOwner && (
              <>
                <button 
                  onClick={() => onEdit(comment)}
                  className="text-xs text-gray-500 hover:text-green-600 flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Düzenle</span>
                </button>
                
                <button 
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-gray-500 hover:text-red-600 flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Sil</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ContentComments: React.FC<ContentCommentsProps> = ({ 
  contentType, 
  contentId, 
  contentTitle 
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // SEO structured data için yorumları hazırla
  const generateCommentsStructuredData = () => {
    if (comments.length === 0) return null;

    const commentsData = comments.map((comment) => ({
      "@type": "Comment",
      "@id": `#comment-${comment.id}`,
      "author": {
        "@type": "Person",
        "name": comment.user?.user_metadata?.full_name || comment.user?.email || "Anonim Kullanıcı",
        "image": comment.user?.user_metadata?.avatar_url || undefined
      },
      "dateCreated": comment.created_at,
      "text": comment.content,
      "parentItem": {
        "@type": contentType === 'movie' ? 'Movie' : contentType === 'series' ? 'TVSeries' : 'CreativeWork',
        "name": contentTitle
      }
    }));

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${contentTitle} Yorumları`,
      "description": `${contentTitle} hakkında kullanıcı yorumları ve değerlendirmeleri`,
      "numberOfItems": comments.length,
      "itemListElement": commentsData.map((comment, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": comment
      }))
    };
  };

  const structuredData = generateCommentsStructuredData();

  // Yorumları yükle
  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await getComments(contentType, contentId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Yorumlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [contentType, contentId]);

  // Yeni yorum gönder
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;

    setSubmitting(true);
    try {
      const commentData: CreateCommentData = {
        content_type: contentType,
        content_id: contentId,
        content: newComment.trim(),
        parent_comment_id: replyingTo || undefined
      };

      const createdComment = await createComment(commentData);
      if (createdComment) {
        setNewComment('');
        setReplyingTo(null);
        loadComments();
      }
    } catch (error) {
      console.error('Yorum gönderilemedi:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Yorum düzenle
  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() || !editingComment || submitting) return;

    setSubmitting(true);
    try {
      const updatedComment = await updateComment(editingComment.id, editContent.trim());
      if (updatedComment) {
        setEditingComment(null);
        setEditContent('');
        loadComments();
      }
    } catch (error) {
      console.error('Yorum güncellenemedi:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Yorum sil
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
    
    try {
      const success = await deleteComment(commentId);
      if (success) {
        loadComments();
      }
    } catch (error) {
      console.error('Yorum silinemedi:', error);
    }
  };

  // Yanıtla
  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setEditingComment(null);
  };

  // Düzenle
  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setReplyingTo(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Structured Data */}
      {structuredData && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        </Helmet>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Yorumlar ({comments.length})
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {contentTitle} hakkında düşüncelerinizi paylaşın
        </p>
      </div>

      {/* Comment Form */}
      {user && (
        <div className="p-6 border-b bg-gray-50">
          {editingComment ? (
            <form onSubmit={handleEditComment} className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Edit className="w-4 h-4" />
                <span>Yorumu düzenle</span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Yorumunuzu düzenleyin..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                required
              />
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Güncelleniyor...' : 'Güncelle'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  İptal
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              {replyingTo && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Reply className="w-4 h-4" />
                  <span>Yanıt yazıyorsunuz</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    İptal
                  </button>
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Yanıtınızı yazın..." : "Yorumunuzu yazın..."}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                required
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Gönderiliyor...' : 'Gönder'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Comments List */}
      <div className="p-6">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Henüz yorum yapılmamış.</p>
            {!user && (
              <p className="text-sm text-gray-400 mt-1">
                Yorum yapmak için giriş yapın.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDeleteComment}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ContentComments;