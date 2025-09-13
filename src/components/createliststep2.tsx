import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createList } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type ListItem = {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'video' | 'place' | 'music';
  year?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

interface CreateListStep2Props {
  category: string;
  selectedItems: ListItem[];
  onBack: () => void;
  onComplete: () => void;
}

export function CreateListStep2({ category, selectedItems, onBack, onComplete }: CreateListStep2Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError(i18n.language === 'tr' ? 'Liste başlığı gereklidir' : 'List title is required');
      return;
    }

    if (!user) {
      setError(i18n.language === 'tr' ? 'Giriş yapmanız gerekiyor' : 'You need to be logged in');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await createList({
        title: title.trim(),
        description: description.trim(),
        category,
        items: selectedItems,
        user_id: user.id
      });
      
      onComplete();
    } catch (err) {
      console.error('Error creating list:', err);
      setError(i18n.language === 'tr' ? 'Liste oluşturulurken hata oluştu' : 'Error creating list');
    } finally {
      setIsCreating(false);
    }
  };

  const getCategoryTitle = () => {
    const categoryMap: { [key: string]: string } = {
      movies: i18n.language === 'tr' ? 'Film' : 'Movie',
      series: i18n.language === 'tr' ? 'Dizi' : 'Series',
      books: i18n.language === 'tr' ? 'Kitap' : 'Book',
      games: i18n.language === 'tr' ? 'Oyun' : 'Game',
      people: i18n.language === 'tr' ? 'Kişi' : 'Person',
      videos: i18n.language === 'tr' ? 'Video' : 'Video',
      places: i18n.language === 'tr' ? 'Mekan' : 'Place',
      music: i18n.language === 'tr' ? 'Müzik' : 'Music'
    };
    return categoryMap[category || ''] || category;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Liste Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold">
                {i18n.language === 'tr' ? `Yeni ${getCategoryTitle()} Listesi Oluştur` : `Create New ${getCategoryTitle()} List`}
              </h1>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  {i18n.language === 'tr' ? 'Liste Başlığı' : 'List Title'}
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={i18n.language === 'tr' ? 'Listeye bir başlık verin' : 'Give your list a title'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  {i18n.language === 'tr' ? 'Liste Açıklaması' : 'List Description'}
                  <span className="text-gray-500 text-sm ml-1">
                    ({i18n.language === 'tr' ? 'İsteğe bağlı' : 'Optional'})
                  </span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={i18n.language === 'tr' ? 'Listeniz hakkında kısa bir açıklama yazın' : 'Write a short description about your list'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          {/* Seçilen İçerikler Önizleme */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">
              {i18n.language === 'tr' ? 'Önizleme' : 'Preview'}
              <span className="ml-2 text-sm text-gray-500">({selectedItems.length} {i18n.language === 'tr' ? 'öğe' : 'items'})</span>
            </h2>
            
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>{i18n.language === 'tr' ? 'Henüz içerik eklenmedi' : 'No content added yet'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selectedItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h3>
                    {item.type === 'place' ? (
                      <div className="text-xs text-gray-500">
                        {item.city && <span>{item.city}</span>}
                        {item.city && item.country && <span>, </span>}
                        {item.country && <span>{item.country}</span>}
                      </div>
                    ) : item.year ? (
                      <p className="text-xs text-gray-500">{item.year}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 font-medium"
              disabled={isCreating}
            >
              {i18n.language === 'tr' ? 'Geri' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim() || selectedItems.length === 0}
              className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {i18n.language === 'tr' ? 'Oluşturuluyor...' : 'Creating...'}
                </>
              ) : (
                i18n.language === 'tr' ? 'Liste Oluştur' : 'Create List'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}