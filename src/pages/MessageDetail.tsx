import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, ChevronLeft, MoreHorizontal, Trash2, Info, Phone, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { markMessagesAsRead, sendMessage } from '../lib/api';

type Message = {
  id: string;
  conversation_id: string;
  text: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
  is_sending?: boolean;
  has_error?: boolean;
};

export function MessageDetail() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<{ full_name: string; username: string; avatar: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState<null | 'mine' | 'conversation'>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }
      setCurrentUserId(session.user.id);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!conversationId) return;
    let isMounted = true;

    const fetchConversation = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participants:conversation_participants(
            user_id,
            profiles(username, full_name, avatar)
          )
        `)
        .eq('id', conversationId)
        .single();
      if (!error && data) {
        const other = data.participants?.find((p: any) => p.user_id !== currentUserId)?.profiles;
        if (isMounted && other) setOtherUser({ full_name: other.full_name, username: other.username, avatar: other.avatar });
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('decrypted_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (isMounted && data) setMessages(data as Message[]);
      await markMessagesAsRead(conversationId);
      scrollToBottom();
    };

    fetchConversation();
    fetchMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'decrypted_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        scrollToBottom();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'decrypted_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, ...msg } : m)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'decrypted_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const msg = payload.old as Partial<Message>;
        if (msg.id) setMessages(prev => prev.filter(m => m.id !== msg.id));
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const handleTyping = () => {
    setIsTyping(true);
    if (typingTimeout) clearTimeout(typingTimeout);
    const to = setTimeout(() => setIsTyping(false), 1000);
    setTypingTimeout(to);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !conversationId) return;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, conversation_id: conversationId, text, created_at: new Date().toISOString(), sender_id: currentUserId || '', is_read: false, is_sending: true }]);
    setNewMessage('');
    scrollToBottom();

    try {
      const msg = await sendMessage(conversationId, text);
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...msg, is_sending: false } : m)));
    } catch (err) {
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, is_sending: false, has_error: true } : m)));
    }
  };

  const handleDeleteSingle = async (id: string) => {
    const target = messages.find(m => m.id === id);
    if (!target || target.sender_id !== currentUserId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id)
        .eq('sender_id', currentUserId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Error deleting message:', e);
    }
  };

  const handleDeleteMine = async () => {
    if (!conversationId || !currentUserId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('sender_id', currentUserId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.sender_id !== currentUserId));
      setShowConfirm(null);
    } catch (e) {
      console.error('Error deleting my messages:', e);
    }
  };

  const handleLeaveConversation = async () => {
    if (!conversationId || !currentUserId) return;
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId);
      if (error) throw error;
      setShowConfirm(null);
      navigate('/messages', { replace: true });
    } catch (e) {
      console.error('Error leaving conversation:', e);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-[60] bg-white" role="dialog" aria-label="Messages">
      {/* Instagram-style Header */}
      <div className="fixed left-0 right-0 bg-white border-b border-gray-200" style={{ top: 'var(--safe-area-inset-top)' }}>
        <div className="h-16 flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="Geri">
              <ChevronLeft size={24} className="text-gray-700" />
            </button>
            {otherUser && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={otherUser.avatar} alt={otherUser.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="leading-tight">
                  <div className="text-base font-semibold text-gray-900">{otherUser.full_name}</div>
                  <div className="text-xs text-gray-500">Aktif</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Sesli arama">
              <Phone size={20} className="text-gray-700" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Görüntülü arama">
              <Video size={20} className="text-gray-700" />
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(v => !v)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="More">
                <Info size={20} className="text-gray-700" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                  <button onClick={() => { setShowMenu(false); setShowConfirm('mine'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3">
                    <Trash2 size={16} className="text-red-500" />
                    Mesajlarımı Sil
                  </button>
                  <button onClick={() => { setShowMenu(false); setShowConfirm('conversation'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3 border-t border-gray-100">
                    <Trash2 size={16} className="text-red-500" />
                    Konuşmayı Sil
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Instagram Style */}
      <div
        className="absolute left-0 right-0 bg-white"
        style={{
          top: 'calc(var(--safe-area-inset-top) + 64px)',
          bottom: 'calc(var(--safe-area-inset-bottom) + 72px)',
          overflowY: 'auto'
        }}
      >
        <div className="px-4 py-4">
          {messages.length > 0 ? (
            messages.map((m, index) => {
              const isOwn = m.sender_id === currentUserId;
              const prevMessage = messages[index - 1];
              const showAvatar = !isOwn && (!prevMessage || prevMessage.sender_id !== m.sender_id);
              const isLastInGroup = !messages[index + 1] || messages[index + 1].sender_id !== m.sender_id;
              
              return (
                <div key={m.id} className={`mb-1 flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                  {!isOwn && (
                    <div className="w-8 mr-2 flex-shrink-0">
                      {showAvatar && otherUser && (
                        <img src={otherUser.avatar} alt={otherUser.full_name} className="w-6 h-6 rounded-full object-cover" />
                      )}
                    </div>
                  )}
                  <div className={`relative max-w-[70%] ${isOwn ? 'ml-12' : 'mr-12'}`}>
                    <div className={`px-4 py-2 text-sm leading-relaxed ${
                      isOwn 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    } ${isLastInGroup ? 'mb-2' : 'mb-0.5'}`}>
                      <div className="break-words">{m.text}</div>
                      {m.is_sending && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1 h-1 bg-white/70 rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                          <div className="w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                        </div>
                      )}
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDeleteSingle(m.id)}
                        className="absolute -top-1 -left-8 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg"
                        aria-label="Mesajı sil"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {isLastInGroup && (
                      <div className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                        {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Send size={32} className="text-gray-300" />
              </div>
              <p className="text-lg font-medium mb-1">Henüz mesaj yok</p>
              <p className="text-sm">İlk mesajı göndererek konuşmayı başlatın</p>
            </div>
          )}
          {isTyping && (
            <div className="flex items-start gap-2 mb-2">
              <div className="w-8 mr-2 flex-shrink-0">
                {otherUser && (
                  <img src={otherUser.avatar} alt={otherUser.full_name} className="w-6 h-6 rounded-full object-cover" />
                )}
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Instagram-style Input */}
      <form
        onSubmit={handleSendMessage}
        className="fixed left-0 right-0 bg-white border-t border-gray-200"
        style={{ bottom: 'var(--safe-area-inset-bottom)' }}
      >
        <div className="px-4 py-3 flex items-end gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
              placeholder="Mesaj yazın..."
              className="w-full px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-transparent focus:border-blue-500 transition-all duration-200 text-sm"
              style={{ minHeight: '44px', maxHeight: '120px', resize: 'none' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={!newMessage.trim()} 
            className={`p-3 rounded-full transition-all duration-200 ${
              newMessage.trim() 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send size={18} className={newMessage.trim() ? 'transform rotate-0' : 'transform -rotate-45'} />
          </button>
        </div>
      </form>
    </div>

    {/* Confirm modals */}
    {showConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg w-full max-w-sm mx-4 p-6">
          <h3 className="text-lg font-semibold mb-2">
            {showConfirm === 'mine' ? t('common.messages.deleteMyMessages', 'Delete my messages') : t('common.messages.deleteConversation', 'Delete conversation')}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {showConfirm === 'mine' ? t('common.messages.deleteMyMessagesConfirm', 'Are you sure you want to delete all messages you sent in this conversation? This cannot be undone.') : t('common.messages.deleteConfirmation', 'Are you sure you want to delete this conversation? This action cannot be undone.')}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('common.messages.cancel', 'Cancel')}</button>
            <button
              onClick={() => showConfirm === 'mine' ? handleDeleteMine() : handleLeaveConversation()}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              {t('common.messages.delete', 'Delete')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default MessageDetail;
