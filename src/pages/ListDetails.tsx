import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { Helmet } from 'react-helmet-async';
import { Film, Tv, Book, Users2, Youtube, Gamepad2, Heart, Share2, Pencil, Check, Trash2, X, Link as LinkIcon, Plus, Send, MapPin, Music, ArrowLeft } from 'lucide-react';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { turkishToEnglish } from '../lib/utils';
import { AuthPopup } from '../components/AuthPopup';
import { useRequireAuth } from '../hooks/useRequireAuth';

import { SearchPopup } from '../components/SearchPopup';
import { CommentModal } from '../components/CommentModal';
import { useListDetails } from '../hooks/useListDetails';
import { useListMutations } from '../hooks/useListMutations';
import { useLikeMutation } from '../hooks/useLikeMutation';
import { useDebounce } from '../hooks/useDebounce';
import { DEFAULT_HOME_CATEGORY } from '../constants/categories';

const formatDate = (dateString: string, t: TFunction, i18nLanguage: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return t('common.time.now');
  } else if (minutes < 60) {
    return t('common.time.minutesAgo', { count: minutes });
  } else if (hours < 24) {
    return t('common.time.hoursAgo', { count: hours });
  } else if (days < 7) {
    return t('common.time.daysAgo', { count: days });
  } else {
    return date.toLocaleDateString(i18nLanguage === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

// Kategori ikonunu belirleyen yardımcı fonksiyon
const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'movies': return Film;
    case 'series': return Tv;
    case 'books': return Book;
    case 'games': return Gamepad2;
    case 'people': return Users2;
    case 'videos': return Youtube;
    case 'places': return MapPin;
    case 'musics': return Music;
    default: return Film;
  }
};

// Kategori adını normalize eden yardımcı fonksiyon
const getNormalizedCategory = (category?: string): string => {
  if (!category) return 'all';
  
  // Tekil formdan çoğul forma dönüştür
  switch (category) {
    case 'movie': return 'movies';
    case 'serie': 
    case 'tv': 
    case 'tv-series': return 'series';
    case 'book': return 'books';
    case 'game': return 'games';
    case 'person': return 'people';
    case 'video': return 'videos';
    case 'place': return 'places';
    case 'music': return 'musics';
    // Zaten doğru formatta olanlar
    case 'movies':
    case 'series':
    case 'books':
    case 'games':
    case 'people':
    case 'videos':
    case 'places':
    case 'musics':
      return category;
    default: return 'all';
  }
};

export default function ListDetails() {
  const { username, slug, id } = useParams();
  const [listId, setListId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const { data, isLoading, error, isOwner, refetch } = useListDetails(listId || '');
  // Liste öğesi tipi
  type ListItem = {
    id: string;
    list_id?: string; // İsteğe bağlı yapıldı çünkü bazı öğelerde bulunmayabilir
    title: string;
    description?: string;
    image_url?: string;
    url?: string;
    order?: number;
    created_at?: string;
    updated_at?: string;
    // Bazı liste öğelerinde bulunan ek alanlar
    external_id?: string;
    type?: string;
    year?: string;
    position?: number;
    // Google Places API için eklenen alanlar
    city?: string;
    country?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };

  // Kullanıcı tipi
  type User = {
    id: string;
    username: string;
    full_name: string;
    avatar?: string;
    created_at?: string;
  };

  // Yorum tipi
  type Comment = {
    id: string;
    list_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at?: string;
    user?: User;
  };

  // Beğeni tipi
  type Like = {
    id: string;
    list_id: string;
    user_id: string;
    created_at: string;
    user?: User;
  };

  // Liste tipi
  type List = {
    id: string;
    title: string;
    description?: string;
    category?: string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    image_url?: string;
    username?: string; // Kullanıcı adı bazen doğrudan liste içinde bulunabilir
    profiles?: User; // Kullanıcı profil bilgileri
    likes_count?: number; // Beğeni sayısı
  };

  // Ana veri tipi
  type SafeData = {
    list?: List;        // Liste bilgileri
    items?: ListItem[]; // Liste öğeleri
    user?: User;        // Liste sahibi
    comments?: Comment[]; // Yorumlar
    likes?: Like[];     // Beğeniler
  };
  // data undefined olabilir, bu yüzden boş bir SafeData nesnesi oluştur
  // useMemo ile performans iyileştirmesi
  // Type '(string | undefined)[]' is not assignable to type 'string[]' hatasını düzeltmek için
  const filterUndefined = <T,>(arr: (T | undefined)[]): T[] => {
    return arr.filter((item): item is T => item !== undefined);
  };
  // data undefined olabileceği durumlar için güvenli erişim fonksiyonu
  const safeDataAccess = <T,>(accessor: () => T | undefined, defaultValue: T): T => {
    try {
      const value = accessor();
      return value !== undefined ? value : defaultValue;
    } catch {
      // Hata durumunda varsayılan değeri döndür
      return defaultValue;
    }
  };

  const safeData = useMemo<SafeData>(() => {
    return data || { list: undefined, items: [], user: undefined, comments: [], likes: [] };
  }, [data]);
  // Artık kendi fonksiyonlarımızı kullandığımız için bu hook'ları kullanmıyoruz
  const { isUpdating, isDeleting } = useListMutations(listId || '');
  const { like, unlike, isLiked } = useLikeMutation(listId || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(safeDataAccess(() => safeData.list?.title, ''));
  const [editDescription, setEditDescription] = useState(safeDataAccess(() => safeData.list?.description, ''));

  // Debounced auto-save for title and description
  const debouncedTitle = useDebounce(editTitle, 1000);
  const debouncedDescription = useDebounce(editDescription, 1000);
  const [items, setItems] = useState(safeDataAccess(() => safeData.items, []));
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  // Yorum sayacı değişkeni, yorum butonu gizli olsa da yorum modalı için gerekli
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(0);
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState<string | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyToComment, setReplyToComment] = useState<{id: string, username: string} | null>(null);
  const [showDeleteConfirmComment, setShowDeleteConfirmComment] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // 1. Önce URL parametresinden ID'yi kontrol et (/list/:id route'u için)
    if (id) {
      setListId(id);
      return;
    }
    
    // 2. CreateList, Bildirimler veya Search sayfasından gelen listId parametresini kontrol et
    if (location.state?.listId) {
      setListId(location.state.listId);
      
      // Eğer bildirimden geliyorsa, yorum modalını açabiliriz
      if (location.state?.fromNotification && location.state?.type === 'comment') {
        setTimeout(() => setShowCommentModal(true), 1000); // Sayfa yüklendikten sonra yorum modalını aç
      }
      
      // Eğer yeni oluşturulan bir listeyse ve URL'de liste ID'si yoksa
      // URL'yi güncelleyelim ki sayfa yenilenirse liste görüntülenebilsin
      if (location.state?.newList && !username && !slug) {
        // Geçmişi değiştirmeden URL'yi güncelle
        window.history.replaceState(
          { ...location.state, newList: false }, // newList bayrağını kaldır
          '', 
          `/list/${location.state.listId}`
        );
      }
      
      return;
    }
    
    // 3. Son olarak username/slug kombinasyonunu kontrol et (/:username/list/:slug route'u için)
    const fetchListId = async () => {
      if (!username || !slug) return;

      const { data, error } = await supabase
        .from('lists')
        .select(`
          id,
          title,
          profiles!user_id (
            username
          )
        `)
        .eq('profiles.username', username)
        .eq('is_public', true);

      if (error) {
        console.error('Error fetching list:', error);
        navigate('/', { replace: true, state: { error: 'Liste bulunamadı' } });
        return;
      }

      const decodedSlug = decodeURIComponent(slug);
      const normalizedSlug = turkishToEnglish(decodedSlug.replace(/-/g, ' ')).toLowerCase();
      
      const matchingList = data.find(list => 
        turkishToEnglish(list.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === normalizedSlug
      );
      
      if (!matchingList) {
        console.warn('No list found for:', { username, slug, normalizedSlug });
        navigate('/', { replace: true, state: { error: 'Liste bulunamadı' } });
        return;
      }

      setListId(matchingList.id);
    };

    fetchListId();
  }, [id, listId, location.state, navigate, username, slug]);

  useEffect(() => {
    // Liste verisi yüklendiğinde, state'leri güncelle
    if (safeData?.list) {
      setEditTitle(safeData.list.title);
      setEditDescription(safeData.list.description || '');
      setItems(safeData.items || []);
      // Yorum butonu gizlendiği için yorum sayacı kaldırıldı
    }
  }, [safeData]);

  useEffect(() => {
    // Kullanıcının oturum durumunu kontrol et
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!listId) return;
    
    // Realtime subscription for list updates
    const listChannel = supabase
      .channel(`list-details-${listId}`)
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE olaylarını dinle
        schema: 'public',
        table: 'lists',
        filter: `id=eq.${listId}`,
      }, (payload) => {
        console.log('List updated:', payload);
        // Listeyi yeniden yükle
        refetch();
      })
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE olaylarını dinle
        schema: 'public',
        table: 'list_items',
        filter: `list_id=eq.${listId}`,
      }, (payload) => {
        console.log('List items updated:', payload);
        // Listeyi yeniden yükle
        refetch();
      })
      .subscribe((status) => {
        console.log(`List details subscription status for ${listId}:`, status);
      });
      
    return () => {
      supabase.removeChannel(listChannel);
    };
  }, [listId, refetch]);
  
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

      // Toplam yorum sayısını hesapla (ana yorumlar + tüm yanıtlar)
      const totalComments = commentsWithReplies.reduce((acc, comment) => {
        return acc + 1 + (comment.replies ? comment.replies.length : 0);
      }, 0);
      setOptimisticCommentCount(totalComments); // Optimistic sayacı güncelle

    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };
  
  useEffect(() => {
    if (!listId) return;

    // İlk yükleme için yorumları getir
    fetchComments();

    // Realtime subscription oluştur
    const commentsChannel = supabase
      .channel(`list-comments-${listId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'list_comments',
        filter: `list_id=eq.${listId}`
      }, (payload) => {
        console.log('Comments updated:', payload);
        // Yorumları yeniden yükle
        fetchComments();
      })
      .subscribe((status) => {
        console.log(`Comments subscription status for ${listId}:`, status);
      });

    // Cleanup
    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [listId]);

  // Auto-save title when debounced value changes
  useEffect(() => {
    if (!listId || !isEditing || !debouncedTitle) return;
    if (debouncedTitle === safeData.list?.title) return; // Don't save if unchanged

    const saveTitle = async () => {
      try {
        const { error } = await supabase
          .from('lists')
          .update({ title: debouncedTitle })
          .eq('id', listId);

        if (error) throw error;
        console.log('Title auto-saved:', debouncedTitle);
      } catch (error) {
        console.error('Error auto-saving title:', error);
      }
    };

    saveTitle();
  }, [debouncedTitle, listId, isEditing, safeData.list?.title]);

  // Auto-save description when debounced value changes
  useEffect(() => {
    if (!listId || !isEditing) return;
    if (debouncedDescription === safeData.list?.description) return; // Don't save if unchanged

    const saveDescription = async () => {
      try {
        const { error } = await supabase
          .from('lists')
          .update({ description: debouncedDescription })
          .eq('id', listId);

        if (error) throw error;
        console.log('Description auto-saved:', debouncedDescription);
      } catch (error) {
        console.error('Error auto-saving description:', error);
      }
    };

    saveDescription();
  }, [debouncedDescription, listId, isEditing, safeData.list?.description]);

  const handleLikeClick = async () => {
    if (!await requireAuth('listeyi beğenmek')) return;
    handleLike();
  };

  // Yorum butonu gizlendiği için handleCommentClick fonksiyonu kaldırıldı

  const handleLike = async () => {
    if (isLiked) {
      await unlike();
    } else {
      await like();
    }
  };

  // Instagram tarayıcısını algılama fonksiyonu
  const isInstagramBrowser = () => {
    const userAgent = navigator.userAgent || navigator.vendor || '';
    return userAgent.indexOf('Instagram') > -1;
  };

  const handleShare = () => {
    setShowShareModal(true);
    
    const urlToCopy = window.location.href; // TARAYICININ MEVCUT TAM URL'İNİ KULLAN
    
    // Paylaşım metni ve başlığı için varsayılan değerlerle birlikte çevrilebilir metinler
    const listTitle = safeData?.list?.title || t('listDetails.share.defaultTitle', 'Bu Listeye Göz Atın!');
    const listDescription = safeData?.list?.description || '';
    
    const shareText = `${listTitle}\n${listDescription ? listDescription + '\n' : ''}${urlToCopy}`;
    
    // Mobil cihazlarda native paylaşım menüsünü kullan
    if (navigator.share && window.innerWidth < 768) {
      navigator.share({
        title: listTitle, // Paylaşım başlığı
        text: shareText,
        url: urlToCopy
      }).catch((error) => {
        // Paylaşım başarısız olursa veya iptal edilirse (AbortError hariç) panoya kopyala
        if (error.name !== 'AbortError') {
          console.error('Share API failed:', error);
        }
        navigator.clipboard.writeText(shareText).catch(err => {
           console.error('Panoya kopyalama (paylaşım sonrası fallback) başarısız:', err);
           // İsteğe bağlı: Kullanıcıya kopyalamanın da başarısız olduğunu bildir
           // alert(t('listDetails.share.copyFallbackFailed', 'Paylaşım iptal edildi/başarısız oldu ve bağlantı kopyalanamadı.'));
        });
        setTimeout(() => setShowShareModal(false), 2000);
      });
    } else {
      // Masaüstünde veya Web Share API olmayan mobil cihazlarda panoya kopyala
      navigator.clipboard.writeText(shareText).catch(err => {
          console.error('Panoya kopyalama (masaüstü) başarısız:', err);
          alert(t('listDetails.share.copyFailed', 'Bağlantı kopyalanamadı.'));
      });
      setTimeout(() => setShowShareModal(false), 2000);
    }
    
    // Instagram tarayıcısı uyarısı (bu kısım değişmedi)
    if (isInstagramBrowser()) {
      alert(t('listDetails.share.instagramWarning', "Instagram tarayıcısındasınız. En iyi deneyim için bağlantıyı kopyalayıp Safari veya Chrome gibi bir tarayıcıda açmanız önerilir."));
    }
  };

  // Liste düzenleme fonksiyonu
  const handleEdit = async () => {
    if (!data?.list) return;
    
    // Eğer düzenleme moduna geçiyorsak, sadece state'i değiştir
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    
    // Düzenleme modundan çıkıyorsak, verileri güncelle
    try {
      // Oturum kontrolü
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) {
        alert(t('common.errors.notLoggedIn'));
        return;
      }

      // 1. Adım: Liste başlığı ve açıklamasını güncelle
      try {
        const { error: updateError } = await supabase
          .from('lists')
          .update({
            title: editTitle,
            description: editDescription.trim(),
            items_count: items.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', listId)
          .eq('user_id', sessionData.session.user.id);

        if (updateError) {
          console.error('Liste güncelleme hatası:', updateError);
          alert(t('common.errors.updateFailed'));
          return;
        }
      } catch (error) {
        console.error('Liste güncelleme hatası:', error);
        alert(t('common.errors.updateFailed'));
        return;
      }

      // 2. Adım: Liste öğelerini güncelle
      await updateItemsInDatabase(items);

      // 3. Adım: Düzenleme modundan çık ve verileri yenile
      setIsEditing(false);
      if (typeof refetch === 'function') {
        await refetch();
      }
    } catch (error) {
      console.error('Düzenleme işlemi sırasında hata:', error);
      alert(t('common.errors.updateFailed'));
    }
  };

  // Liste öğelerini veritabanında güncelleme fonksiyonu
  const updateItemsInDatabase = async (updatedItems: ListItem[]) => {
    if (!listId) return false;

    try {
      // Oturum kontrolü
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t('common.errors.notLoggedIn'));
        return false;
      }

      // 1. Adım: Mevcut liste öğelerini sil
      const { error: deleteError } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId);

      if (deleteError) {
        console.error('Öğe silme işlemi sırasında hata:', deleteError);
        return false;
      }

      // 2. Adım: Yeni öğeleri ekle
      if (updatedItems.length > 0) {
        const newItems = updatedItems.map((item, index) => ({
          list_id: listId,
          external_id: item.external_id,
          title: item.title,
          image_url: item.image_url,
          type: item.type,
          year: item.year,
          description: item.description,
          position: index + 1,
        }));

        const { error: insertError } = await supabase
          .from('list_items')
          .insert(newItems);

        if (insertError) {
          console.error('Öğe ekleme işlemi sırasında hata:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Öğeleri güncelleme sırasında hata:', error);
      return false;
    }
  };

  const handleAddItem = async (newItem: {
    id: string;
    title: string;
    image: string;
    type: string;
    year?: string;
    description?: string;
  }) => {
    const newListItem = {
      id: crypto.randomUUID(),
      external_id: newItem.id,
      title: newItem.title,
      image_url: newItem.image,
      type: newItem.type,
      year: newItem.year,
      description: newItem.description,
      position: items.length + 1
    };
    
    // Yerel state'i güncelle
    const updatedItems = [...items, newListItem];
    setItems(updatedItems);
    
    // Düzenleme modunda da veritabanını güncelle (içerik kaybını önlemek için)
    if (listId) {
      await updateItemsInDatabase(updatedItems);
    }
  };

  const confirmRemoveItem = async (itemId: string) => {
    // Yerel state'i güncelle
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    
    // Düzenleme modunda da veritabanını güncelle (içerik kaybını önlemek için)
    if (listId) {
      await updateItemsInDatabase(updatedItems);
    }
    
    // Modal'ı kapat
    setShowItemDeleteConfirm(null);
  };

  // Liste silme fonksiyonu
  const handleDelete = async () => {
    if (!listId) return;
    // Show deleting banner
    setIsDeletingList(true);


    try {
      // Oturum kontrolü
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) {
        alert(t('common.errors.notLoggedIn'));
        return;
      }

      // 1. Adım: Liste öğelerini sil
      try {
        const { error: itemsError } = await supabase
          .from('list_items')
          .delete()
          .eq('list_id', listId);
        
        if (itemsError) {
          console.error('Liste öğeleri silinirken hata:', itemsError);
          // Silme hatası olsa bile devam et
        }
      } catch (error) {
        console.warn('RLS uyarısı (liste öğeleri silme - görmezden gelinebilir):', error);
      }
      
      // 2. Adım: Listeyi sil
      try {
        const { error: listError } = await supabase
          .from('lists')
          .delete()
          .eq('id', listId)
          .eq('user_id', sessionData.session.user.id);
        
        if (listError) {
          console.error('Liste silinirken hata:', listError);
          alert(t('common.errors.deleteFailed'));
          return;
        }
      } catch (error) {
        console.warn('RLS uyarısı (liste silme - görmezden gelinebilir):', error);
      }
      
      // 3. Adım: Anasayfaya yönlendir (ALL + desc)
      navigate('/', { 
        replace: true, 
        state: { 
          refresh: true, 
          timestamp: new Date().getTime(),
          category: DEFAULT_HOME_CATEGORY,
          sortDirection: 'desc'
        } 
      });
    } catch (error) {
      console.error('Liste silme hatası:', error);
      alert(t('common.errors.deleteFailed'));
      setIsDeletingList(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (!isEditing) return;
    
    // Silme onayı için öğe ID'sini ayarla
    setShowItemDeleteConfirm(itemId);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    try {
      const { error } = await supabase
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
      setOptimisticCommentCount(prev => prev + 1);
      
      // Yeni yorumu hemen göstermek için yorumları tekrar yükle
      await fetchComments();
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
      
      setOptimisticCommentCount(prev => prev - 1);
      setShowDeleteConfirmComment(null);
      
      // Yorumları güncellemek için tekrar yükle
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Kategori ikonu için getCategoryIcon fonksiyonunu kullanalım

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="animate-pulse">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                      {React.createElement(getCategoryIcon(safeData?.list?.category || 'default'), { className: "w-5 h-5 text-orange-500" })}
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="px-6 pb-6 mt-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="aspect-[2/3] bg-gray-200 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !safeData?.list) {
    return (
      <>
        <Helmet>
          <title>{t('common.errors.listNotFound')} | ConnectList</title>
          <meta name="description" content={t('common.errors.listNotFoundDescription')} />
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 text-center">
                <p className="text-gray-500 text-lg">Liste yükleniyor...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Liste başlığı ve açıklamasından SEO meta etiketleri oluştur
  const pageTitle = safeData?.list?.title ? `${safeData.list.title} | ConnectList` : 'ConnectList';
  const pageDescription = safeData?.list?.description || 'Film, dizi, kitap, oyun ve kişi listelerinizi oluşturun, paylaşın ve keşfedin. ConnectList ile sosyalleşin.';
  // Doğru URL formatını kullan
  const pageUrl = `${window.location.origin}/${username}/list/${slug}`;
  const pageImage = safeData?.list?.image_url || 'https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/connectlist-social-slogan.png';
  // Görsel URL'sine önbellek kırma parametresi ekle
  const pageImageWithCache = pageImage ? `${pageImage}?t=${new Date().getTime()}` : pageImage;
  
  return (
    <>
      {isDeletingList && (
        <div className="fixed left-0 right-0 z-50 flex items-center justify-center" style={{ top: 'calc(var(--safe-area-inset-top) + var(--header-height))' }}>
          <div className="m-2 px-4 py-2 rounded-full bg-orange-500 text-white text-sm shadow">
            {i18n.language === 'tr' ? 'Liste siliniyor…' : 'Deleting list…'}
          </div>
        </div>
      )}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImageWithCache} />
        <meta property="og:site_name" content="ConnectList" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImageWithCache} />
        
        {/* Yapısal veri (Schema.org) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": safeData?.list?.title,
            "description": pageDescription,
            "image": pageImageWithCache,
            "author": {
              "@type": "Person",
              "name": safeData?.list?.username || "ConnectList Kullanıcısı"
            },
            "publisher": {
              "@type": "Organization",
              "name": "ConnectList",
              "logo": {
                "@type": "ImageObject",
                "url": "https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/favicon.png?t=1"
              }
            },
            "datePublished": safeData?.list?.created_at,
            "dateModified": safeData?.list?.updated_at
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-gray-100" style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Liste Başlığı ve Bilgileri */}
            {/* Mobil Layout */}
            <div className="block md:hidden">
              {/* Geri Butonu */}
              <div className="flex items-center px-6 pt-4 pb-2">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={18} className="text-gray-600" />
                </button>
              </div>
              <div className="space-y-3 px-6">
                {/* Kullanıcı Bilgileri */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/profile/${safeData.list?.profiles?.username || ''}`)}
                    className="flex-shrink-0"
                  >
                    <img
                      src={safeData.list?.profiles?.avatar || ''}
                      alt={safeData.list?.profiles?.full_name || ''}
                      className="w-10 h-10 rounded-full"
                    />
                  </button>
                  <div>
                    <button
                      onClick={() => navigate(`/profile/${safeData.list?.profiles?.username || ''}`)}
                      className="text-[15px] font-bold hover:text-orange-500"
                    >
                      {safeData.list?.profiles?.full_name || ''}
                    </button>
                    <div className="flex items-center gap-1 text-[13px] text-gray-500">
                      <span>@{safeData.list?.profiles?.username || ''}</span>
                      <span>•</span>
                      <span className="font-bold">{formatDate(safeData.list?.created_at || '', t, i18n.language)}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2 ml-auto">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleEdit}
                            className="p-2 text-gray-600 hover:text-green-500 rounded-full hover:bg-gray-100"
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent" />
                            ) : (
                              <Check size={20} />
                            )}
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 text-gray-600 hover:text-red-500 rounded-full hover:bg-gray-100"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              // Düzenleme modunu aktif et
                              setIsEditing(true);
                              // Mevcut değerleri düzenleme alanlarına yükle
                              if (safeData?.list) {
                                setEditTitle(safeData.list.title);
                                setEditDescription(safeData.list.description || '');
                                setItems(safeData.items || []);
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-blue-500 rounded-full hover:bg-gray-100"
                          >
                            <Pencil size={20} />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="p-2 text-gray-600 hover:text-red-500 rounded-full hover:bg-gray-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Liste Başlığı ve Açıklama */}
                <div>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-[22px] font-bold border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2"
                        placeholder="Liste başlığı"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full text-sm text-gray-600 border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mt-2 whitespace-pre-wrap"
                        placeholder="Liste açıklaması"
                        rows={3}
                      />
                    </>
                  ) : (
                    <>
                      <h1 className="text-[22px] font-bold mb-1">{safeData.list?.title || ''}</h1>
                      <p className="text-[14px] text-gray-600 font-normal whitespace-pre-wrap break-words">{safeData.list?.description || ''}</p>
                      <div className="text-[12px] text-gray-400 mt-2 font-normal">{t('common.time.lastUpdate')} {formatDate(safeData.list?.updated_at || '', t, i18n.language)}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden md:block mt-5 px-6">
              {/* Geri Butonu */}
              <div className="flex items-center mb-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => navigate(`/profile/${safeData.list?.profiles?.username || ''}`)}
                  className="flex-shrink-0"
                >
                  <img
                    src={safeData.list?.profiles?.avatar || ''}
                    alt={safeData.list?.profiles?.full_name || ''}
                    className="w-10 h-10 rounded-full"
                  />
                </button>
                <div>
                  <button
                    onClick={() => navigate(`/profile/${safeData.list?.profiles?.username || ''}`)}
                    className="font-medium hover:text-orange-500"
                  >
                    {safeData.list?.profiles?.full_name || ''}
                  </button>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>@{safeData.list?.profiles?.username || ''}</span>
                    <span>•</span>
                    <span>{formatDate(safeData.list?.created_at || '', t, i18n.language)}</span>
                    <span>•</span>
                    <span>{t('common.time.lastUpdate')} {formatDate(safeData.list?.updated_at || '', t, i18n.language)}</span>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2 ml-auto">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleEdit}
                          className="p-2 text-gray-600 hover:text-green-500 rounded-full hover:bg-gray-100"
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent" />
                          ) : (
                            <Check size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="p-2 text-gray-600 hover:text-red-500 rounded-full hover:bg-gray-100"
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            // Düzenleme modunu aktif et
                            setIsEditing(true);
                            // Mevcut değerleri düzenleme alanlarına yükle
                            if (safeData?.list) {
                              setEditTitle(safeData.list.title);
                              setEditDescription(safeData.list.description || '');
                              setItems(safeData.items || []);
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-blue-500 rounded-full hover:bg-gray-100"
                        >
                          <Pencil size={20} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isDeleting}
                          className="p-2 text-gray-600 hover:text-red-500 rounded-full hover:bg-gray-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-6">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-2xl font-bold border-b border-gray-300 focus:border-orange-500 focus:outline-none pb-1 mb-2"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full text-gray-600 border rounded-lg p-2 focus:border-orange-500 focus:outline-none whitespace-pre-wrap"
                        rows={3}
                      />
                    </>
                  ) : (
                    <>
                      <h1 className="text-[14px] md:text-[22px] font-bold mb-1">{safeData.list?.title || ''}</h1>
                      <p className="text-gray-600 whitespace-pre-wrap break-words">{safeData.list?.description || ''}</p>
                    </>
                  )}
              </div>
            </div>
            {/* Liste İçerikleri */}
            <div className="px-3 md:px-6 pb-2 md:pb-6 mt-[10px] pt-[15px] md:pt-[25px] border-t border-gray-200">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-4">
                {[...items, ...(isEditing ? [null] : [])].map((item) => (
                  item ? (
                  <div 
                    key={item.id}
                    onClick={() => {
                      if (isEditing) {
                        return;
                      }
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
                        case 'music': {
                          // Music items should open in YouTube Music
                          const eid = item.external_id || '';
                          let target = '';
                          if (/^[a-zA-Z0-9_-]{11}$/.test(eid)) {
                            // Looks like a YouTube video id
                            target = `https://music.youtube.com/watch?v=${eid}`;
                          } else if (eid.startsWith('http')) {
                            // If a full URL was stored previously
                            if (eid.includes('youtube.com') || eid.includes('youtu.be')) {
                              // Map to music.youtube.com domain when possible
                              try {
                                const u = new URL(eid);
                                const v = u.searchParams.get('v');
                                target = v ? `https://music.youtube.com/watch?v=${v}` : eid.replace('www.youtube.com', 'music.youtube.com');
                              } catch {
                                target = eid;
                              }
                            } else if (eid.includes('spotify.com')) {
                              // Fallback: open a YouTube Music search by title
                              target = `https://music.youtube.com/search?q=${encodeURIComponent(item.title)}`;
                            } else {
                              target = eid;
                            }
                          } else {
                            // Fallback: search by title
                            target = `https://music.youtube.com/search?q=${encodeURIComponent(item.title)}`;
                          }
                          window.open(target, '_blank');
                          break;
                        }
                        case 'place':
                          // Mekan için Google Maps linkini aç
                          window.open(`https://www.google.com/maps/place/?q=place_id:${item.external_id}`, '_blank');
                          break;
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div 
                      className={`relative ${item.type === 'video' ? 'aspect-video' : 'aspect-[2/3]'} rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity bg-gray-50`}
                    >
                      {!item.image_url ? (
                        <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center text-center p-4">
                          <div className="text-[10px] md:text-sm text-gray-500 line-clamp-3">{item.title}</div>
                        </div>
                      ) : (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium text-[10px] md:text-sm line-clamp-1">
                      {item.type === 'place' && item.title.includes('|') 
                        ? item.title.split('|')[0]?.trim() 
                        : item.title}
                    </h3>
                    {item.type === 'place' ? (
                      <div className="text-[9px] md:text-xs text-gray-500">
                        {/* Ülke/Şehir bilgisi */}
                        {item.title && item.title.includes('|') ? (
                          <div>
                            {(() => {
                              const locationParts = item.title.split('|')[1]?.trim().split(',');
                              if (locationParts && locationParts.length >= 2) {
                                const city = locationParts[0]?.trim();
                                const country = locationParts[locationParts.length - 1]?.trim();
                                return <span>{country}/{city}</span>;
                              }
                              return <span>{item.title.split('|')[1]?.trim()}</span>;
                            })()}
                          </div>
                        ) : (
                          <div>
                            {item.city && <span>{item.city}</span>}
                            {item.city && item.country && <span>, </span>}
                            {item.country && <span>{item.country}</span>}
                          </div>
                        )}
                        <div className="text-[8px] md:text-[10px] text-blue-500 mt-1">
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
                      <p className="text-[9px] md:text-sm text-gray-500">{item.year}</p>
                    )}
                  </div>
                  ) : (
                    <div key="add-button">
                      <button
                        onClick={() => setShowSearchPopup(true)}
                        className="w-full aspect-[2/3] rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity bg-gray-100 flex flex-col items-center justify-center gap-2"
                      >
                        <Plus size={32} className="text-gray-400" />
                        <span className="text-xs text-gray-400">{t('listPreview.listDetails.addContent')}</span>
                      </button>
                    </div>
                  )
                ))}
              </div>
            </div>
            
            {/* Yorum Bölümü - Items alanının hemen altında */}
            {!isEditing && (
              <div className="px-3 md:px-6 py-2 md:py-4 border-t border-gray-200">
                <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">{t('listPreview.listDetails.comments.title')} ({comments.length})</h3>
                
                {/* Yorum Giriş Formu */}
                <form onSubmit={handleSubmitComment} className="mb-3 md:mb-6">
                  {replyToComment && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-2">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{replyToComment.username}</span> kullanıcısına yanıt veriyorsunuz
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setReplyToComment(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onClick={() => {
                          if (!currentUserId) {
                            setShowAuthPopup(true);
                          }
                        }}
                        placeholder={replyToComment 
                          ? `${replyToComment.username} kullanıcısına yanıt yaz...` 
                          : t('listPreview.listDetails.comments.placeholder')}
                        className="w-full px-3 md:px-4 py-1.5 md:py-2 pr-10 border rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 text-xs md:text-base"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || !currentUserId}
                        className="absolute right-2 top-1.5 md:top-2 p-1 md:p-1.5 text-orange-500 hover:text-orange-600 disabled:opacity-50 rounded-full"
                      >
                        <Send size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                    </div>
                  </div>
                </form>
                
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
                                  {formatDate(comment.created_at, t, i18n.language)}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                {currentUserId && (
                                  <button
                                    onClick={() => setReplyToComment({id: comment.id, username: comment.profiles.username})}
                                    className="text-gray-400 hover:text-blue-500 text-[10px] md:text-sm"
                                  >
                                    {i18n.language === 'tr' ? 'Yanıtla' : 'Reply'}
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
                            {comment.replies.map((reply: any) => (
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
                                        {formatDate(reply.created_at, t, i18n.language)}
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
              </div>
            )}
            
            {/* Like ve Share Butonları */}
            <div className="border-t mt-2 md:mt-4">
              <div className="flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-4">
                <button
                  onClick={handleLikeClick}
                  className={`flex items-center gap-2 ${
                    isLiked ? 'text-red-500' : ''
                  }`}
                >
                  <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                  <span>{safeData.list?.likes_count || 0}</span>
                </button>
                {/* Yorum butonu gizlendi */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Reklam alanı - Liste detaylarının altında */}
          <div className="mt-6">
            {/* Reklam alanı kaldırıldı */}
          </div>
        </div>
      </div>
      
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
      
      <CommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        listId={listId || ''}
        commentCount={optimisticCommentCount}
        onCommentAdded={fetchComments}
        onCommentDeleted={fetchComments}
      />
      
      {showSearchPopup && (
        <>
          {/* Kategori bilgisini konsola yazdır */}
          {console.log('Liste kategorisi:', safeData?.list?.category)}
          <SearchPopup
            isOpen={showSearchPopup}
            onClose={() => setShowSearchPopup(false)}
            onSelect={handleAddItem}
            category={getNormalizedCategory(safeData?.list?.category)}
            alreadyAddedItemIds={filterUndefined(items.map(item => item.external_id))}
          />
        </>
      )}
      
      {/* Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{t('listPreview.listDetails.deleteConfirm')}</h2>
            <p className="text-gray-600 mb-6">
              {t('listPreview.listDetails.deleteMessage')}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('listPreview.listDetails.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? t('listPreview.listDetails.deleting') : t('listPreview.listDetails.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öğe Silme Onay Modal */}
      {showItemDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{t('listPreview.listDetails.deleteItemConfirm')}</h2>
            <p className="text-gray-600 mb-6">
              {t('listPreview.listDetails.deleteItemMessage')}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowItemDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('listPreview.listDetails.cancel')}
              </button>
              <button
                onClick={() => confirmRemoveItem(showItemDeleteConfirm)}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isUpdating ? t('listPreview.listDetails.deleting') : t('listPreview.listDetails.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-[9999]">
          <LinkIcon size={16} />
          <span>{t('listPreview.linkCopied')}</span>
        </div>
      )}
    </>
  );
}

export { ListDetails }


