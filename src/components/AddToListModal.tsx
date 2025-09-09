import { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, AlertCircle } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useNavigate } from 'react-router-dom';
// import { useTranslation } from 'react-i18next'; // Kullanılmıyor
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'movie' | 'series' | 'book' | 'game' | 'person' | 'video' | 'place' | 'music';
  contentId: string;
  contentTitle: string;
  contentImage: string;
  contentYear?: string;
  contentDescription?: string;
}

interface List {
  id: string;
  title: string;
  description: string;
  category: string;
  items_count: number;
}

export function AddToListModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
  contentImage,
  contentYear,
  contentDescription
}: AddToListModalProps) {
  // useTranslation hook'u kullanılmıyor, çünkü metinler doğrudan Türkçe olarak yazılmış
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const [userLists, setUserLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  
  useClickOutside(modalRef, onClose);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchUserLists = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Oturum yoksa hata göster ama konsola da yaz
        if (!session) {
          console.error('Oturum bulunamadı - AddToListModal');
          console.log('Supabase session:', session);
          setError('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
          setIsLoading(false);
          return;
        }
        
        // Oturum bilgilerini konsola yaz
        console.log('Supabase session bulundu:', session.user.id);
        
        // Kullanıcının listelerini getir
        const { data: lists, error: listsError } = await supabase
          .from('lists')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('category', getCategory())
          .order('created_at', { ascending: false });
        
        if (listsError) throw listsError;
        
        setUserLists(lists || []);
      } catch (error) {
        console.error('Error fetching user lists:', error);
        setError('Listeler yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserLists();
  }, [isOpen, contentType]);

  const getCategory = () => {
    switch (contentType) {
      case 'movie': return 'movies';
      case 'series': return 'series';
      case 'book': return 'books';
      case 'game': return 'games';
      case 'person': return 'people';
      case 'video': return 'videos';
      case 'place': return 'places';
      case 'music': return 'musics';
      default: return '';
    }
  };

  const handleAddToList = async (listId: string) => {
    setError(null);
    setSuccessMessage(null);
    setSelectedListId(listId);
    
    try {
      // Önce bu içeriğin bu listede olup olmadığını kontrol et
      const { data: existingItems, error: checkError } = await supabase
        .from('list_items')
        .select('id')
        .eq('list_id', listId)
        .eq('external_id', contentId)
        .eq('type', contentType);
      
      if (checkError) throw checkError;
      
      if (existingItems && existingItems.length > 0) {
        setSuccessMessage('Bu içerik zaten listenizde bulunuyor');
        return;
      }
      
      // Listedeki mevcut öğe sayısını bul
      const { data: positionData, error: positionError } = await supabase
        .from('list_items')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);
      
      if (positionError) throw positionError;
      
      const nextPosition = positionData && positionData.length > 0 
        ? positionData[0].position + 1 
        : 1;
      
      // Yeni öğeyi ekle
      const { error: insertError } = await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          external_id: contentId,
          title: contentTitle,
          image_url: contentImage,
          type: contentType,
          year: contentYear,
          description: contentDescription,
          position: nextPosition
        });
      
      if (insertError) throw insertError;
      
      setSuccessMessage('İçerik listenize eklendi');
      
      // Liste öğe sayısını güncelle
      const { error: updateError } = await supabase
        .from('lists')
        .update({ items_count: nextPosition })
        .eq('id', listId);
      
      if (updateError) {
        console.error('Error updating list items count:', updateError);
      }
    } catch (error) {
      console.error('Error adding to list:', error);
      setError('İçerik eklenirken bir hata oluştu');
    }
  };

  // Arama sorgusu boşsa veya userLists boşsa tüm listeleri göster
  // Aksi takdirde filtreleme yap
  const filteredLists = searchQuery.trim() === '' 
    ? userLists 
    : userLists.filter(list => 
        list && list.title && typeof list.title === 'string' && 
        list.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Listeye Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Liste ara..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 text-green-500 p-3 rounded-lg mb-4 flex items-center gap-2">
              <div className="flex-shrink-0 w-4 h-4 border-2 border-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <span>{successMessage}</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : filteredLists.length > 0 ? (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToList(list.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border ${
                    selectedListId === list.id 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-left">
                    <h3 className="font-medium">{list.title}</h3>
                    <p className="text-sm text-gray-500">{list.items_count} içerik</p>
                  </div>
                  <Plus size={20} className="text-gray-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Bu kategoride henüz listeniz bulunmuyor</p>
              <p className="mt-4">
                <button
                  onClick={() => navigate(`/create-list/${getCategory()}`)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} />
                  Yeni liste oluşturmak için tıklayın
                </button>
              </p>
            </div>
          )}
          
          {filteredLists.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate(`/create-list/${getCategory()}`, {
                  state: {
                    type: contentType,
                    item: {
                      id: contentId,
                      title: contentTitle,
                      image: contentImage,
                      year: contentYear,
                      description: contentDescription
                    }
                  }
                })}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600"
              >
                <Plus size={16} />
                <span>Yeni Liste Oluştur</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}