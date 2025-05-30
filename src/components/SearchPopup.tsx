import { useState, useEffect, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDebounce } from '../hooks/useDebounce';
import { searchTMDB, searchGames, searchBooks, getVideoDetails, searchLists } from '../lib/api';
import { searchPlaces, getDefaultPlaceImage } from '../lib/api-places';
import { useNavigate } from 'react-router-dom';

// API sonuç tipleri
interface TMDBItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path?: string;
  profile_path?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  known_for_department?: string;
}

interface SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: {
    id: string;
    title: string;
    image: string;
    type: string;
    year?: string;
    description?: string;
  }) => void;
  category: string;
  alreadyAddedItemIds?: string[]; // Listede zaten olanlar
  selectedItemIds?: string[]; // Şu an seçili olanlar (CreateList için)
}

type SearchResult = {
  id: string;
  title: string;
  image: string;
  type: string;
  year?: string;
  description?: string;
  username?: string;
}

export function SearchPopup({ isOpen, onClose, onSelect, category, alreadyAddedItemIds = [], selectedItemIds = [] }: SearchPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(popupRef, onClose);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const navigate = useNavigate();
  
  // Kategori değerini normalize et
  const normalizedCategory = useMemo(() => {
    // Eğer kategori zaten doğru formatta ise (movies, series, books, games, people, videos, lists, all)
    // olduğu gibi kullan
    if (['movies', 'series', 'books', 'games', 'people', 'videos', 'lists', 'all'].includes(category)) {
      return category;
    }
    
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
      case 'list': return 'lists';
      default: return 'all';
    }
  }, [category]);
  
  // Konsola kategori bilgisini yazdır (hata ayıklama için)
  useEffect(() => {
    console.log('SearchPopup kategori:', category);
    console.log('SearchPopup normalizedCategory:', normalizedCategory);
  }, [category, normalizedCategory]);

  const getCategoryTitle = () => {
    switch (normalizedCategory) {
      case 'movies': return 'Filmler';
      case 'series': return 'Diziler';
      case 'books': return 'Kitaplar';
      case 'games': return 'Oyunlar';
      case 'people': return 'Kişiler';
      case 'videos': return 'Videolar';
      case 'lists': return 'Listeler';
      default: return '';
    }
  };

  useEffect(() => {
    if (debouncedSearch) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, normalizedCategory]);

  // Arama işlemini güvenli bir şekilde gerçekleştiren fonksiyon
  const handleSearch = async () => {
    // Hata durumunu sıfırla
    setError(null);
    
    // Boş arama sorgusu kontrolü
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Video araması için özel işlem
    if (normalizedCategory === 'videos') {
      const videoId = debouncedSearch.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&\s]{11})/)?.[1];

      if (videoId) {
        setIsSearching(true);
        try {
          const videoDetails = await getVideoDetails(videoId);
          const videoItem = {
            id: videoId,
            title: videoDetails.title,
            type: 'video',
            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            description: videoDetails.description,
            year: new Date().getFullYear().toString()
          };
          setSearchResults([videoItem]);
        } catch (error) {
          console.error('Video arama hatası:', error);
          setError('Video bilgileri alınamadı. Lütfen geçerli bir YouTube linki girdiğinizden emin olun.');
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }
      return;
    }

    // Arama işlemini başlat
    setIsSearching(true);
    let filteredResults: SearchResult[] = [];
    
    try {
      // Kategori bazlı arama işlemleri
      switch (normalizedCategory) {
        case 'all': {
          // Tüm kategorilerde arama yap
          try {
            // Film ve dizi araması
            const tmdbResults = await searchTMDB(debouncedSearch);
            
            // Filmler
            const movieResults: SearchResult[] = tmdbResults
              .filter((item: TMDBItem) => item && item.media_type === 'movie' && item.poster_path)
              .map((item: TMDBItem) => ({
                id: item.id.toString(),
                title: item.title || 'İsimsiz Film',
                image: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title || 'Film')}&backgroundColor=red`,
                type: 'movie',
                year: item.release_date?.split('-')[0] || '',
                description: item.overview || ''
              }));
            
            // Diziler
            const seriesResults: SearchResult[] = tmdbResults
              .filter((item: TMDBItem) => item && item.media_type === 'tv')
              .map((item: TMDBItem) => ({
                id: item.id.toString(),
                title: item.name || 'İsimsiz Dizi',
                image: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name || 'Dizi')}&backgroundColor=purple`,
                type: 'series',
                year: item.first_air_date?.split('-')[0] || '',
                description: item.overview || ''
              }));
            
            // Kişiler
            const peopleResults: SearchResult[] = tmdbResults
              .filter((item: TMDBItem) => item && item.media_type === 'person' && item.profile_path)
              .map((item: TMDBItem) => ({
                id: item.id.toString(),
                title: item.name || 'İsimsiz Kişi',
                image: `https://image.tmdb.org/t/p/w185${item.profile_path}`,
                type: 'person',
                description: item.known_for_department || ''
              }));
            
            // Kitap araması
            const bookResults = await searchBooks(debouncedSearch);
            const bookItems: SearchResult[] = bookResults.map((item: any) => {
              try {
                if (!item || !item.volumeInfo) {
                  return null;
                }
                
                const title = item.volumeInfo.title || 'İsimsiz Kitap';
                
                let imageUrl = '';
                if (item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail) {
                  imageUrl = item.volumeInfo.imageLinks.thumbnail;
                  if (imageUrl.startsWith('http:')) {
                    imageUrl = imageUrl.replace('http:', 'https:');
                  }
                } else {
                  imageUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}&backgroundColor=orange`;
                }
                
                let year = '';
                if (item.volumeInfo.publishedDate) {
                  const parts = item.volumeInfo.publishedDate.split('-');
                  if (parts.length > 0) {
                    year = parts[0];
                  }
                }
                
                return {
                  id: item.id,
                  title: title,
                  image: imageUrl,
                  type: 'book',
                  year: year,
                  description: item.volumeInfo.description || ''
                };
              } catch (error) {
                console.error('Kitap formatlanırken hata:', error, item);
                return null;
              }
            }).filter((item): item is SearchResult => item !== null);
            
            // Oyun araması
            const gameResults = await searchGames(debouncedSearch);
            const gameItems = gameResults
              .filter((item: { background_image?: string; id: number; name: string; released?: string; description_raw?: string }) => 
                item && item.background_image)
              .map((item: { background_image: string; id: number; name: string; released?: string; description_raw?: string }) => ({
                id: item.id.toString(),
                title: item.name || 'İsimsiz Oyun',
                image: item.background_image,
                type: 'game',
                year: item.released?.split('-')[0] || '',
                description: item.description_raw || ''
              }));
            
            // Tüm sonuçları birleştir
            filteredResults = [...movieResults, ...seriesResults, ...bookItems, ...gameItems, ...peopleResults];
          } catch (error) {
            console.error('Genel arama hatası:', error);
            setError('Arama sırasında bir hata oluştu.');
          }
          break;
        }
        // Film araması
        case 'movies': {
          try {
            const tmdbResults = await searchTMDB(debouncedSearch);
            filteredResults = tmdbResults
              .filter((item: TMDBItem) => item && item.media_type === 'movie' && item.poster_path)
              .map((item: TMDBItem) => ({
                id: item.id.toString(),
                title: item.title || 'İsimsiz Film',
                image: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title || 'Film')}&backgroundColor=red`,
                type: 'movie',
                year: item.release_date?.split('-')[0] || '',
                description: item.overview || ''
              }));
            
            if (filteredResults.length === 0) {
              setError(`"${debouncedSearch}" için film bulunamadı.`);
            }
          } catch (error) {
            console.error('Film arama hatası:', error);
            setError('Film araması sırasında bir hata oluştu.');
          }
          break;
        }
        
        // Dizi araması
        case 'series': {
          try {
            const tmdbResults = await searchTMDB(debouncedSearch);
            filteredResults = tmdbResults
              .filter((item: TMDBItem) => item && item.media_type === 'tv')
              .map((item: TMDBItem) => ({
                id: item.id.toString(),
                title: item.name || 'İsimsiz Dizi',
                image: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name || 'Dizi')}&backgroundColor=purple`,
                type: 'series',
                year: item.first_air_date?.split('-')[0] || '',
                description: item.overview || ''
              }));
            
            if (filteredResults.length === 0) {
              setError(`"${debouncedSearch}" için dizi bulunamadı.`);
            }
          } catch (error) {
            console.error('Dizi arama hatası:', error);
            setError('Dizi araması sırasında bir hata oluştu.');
          }
          break;
        }
        
        // Kitap araması
        case 'books': {
          try {
            // Google Books API'den kitapları getir
            const bookResults = await searchBooks(debouncedSearch);
            
            // Sonuçları işle
            if (Array.isArray(bookResults) && bookResults.length > 0) {
              // Kitap sonuçlarını işle
              const validResults = bookResults
                .filter(item => item && item.volumeInfo)
                .map((item: any) => {
                  // Kitap başlığını güvenli bir şekilde al
                  const title = item.volumeInfo.title || 'İsimsiz Kitap';
                  
                  // Resim URL'sini güvenli bir şekilde al
                  let imageUrl = '';
                  if (item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail) {
                    imageUrl = item.volumeInfo.imageLinks.thumbnail;
                    // HTTP URL'lerini HTTPS'e dönüştür
                    if (imageUrl.startsWith('http:')) {
                      imageUrl = imageUrl.replace('http:', 'https:');
                    }
                  } else {
                    // Varsayılan resim
                    imageUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}&backgroundColor=orange`;
                  }
                  
                  // Yayın yılını güvenli bir şekilde al
                  let year = '';
                  if (item.volumeInfo.publishedDate) {
                    const parts = item.volumeInfo.publishedDate.split('-');
                    if (parts.length > 0) {
                      year = parts[0];
                    }
                  }
                  
                  return {
                    id: item.id,
                    title: title,
                    image: imageUrl,
                    type: 'book',
                    year: year,
                    description: item.volumeInfo.description || ''
                  };
                });
              
              filteredResults = validResults;
              
              // Hata mesajını temizle
              setError(null);
            } else {
              // Sonuç bulunamadı
              filteredResults = [];
              if (debouncedSearch.trim()) {
                setError(`"${debouncedSearch}" için kitap bulunamadı.`);
              }
            }
          } catch (error) {
            console.error('Kitap arama hatası:', error);
            setError('Kitap araması sırasında bir hata oluştu. Lütfen tekrar deneyin.');
            filteredResults = [];
          }
          break;
        }
        case 'games': {
          try {
            const gameResults = await searchGames(debouncedSearch);
            filteredResults = gameResults
              .filter((item: { background_image?: string; id: number; name: string; released?: string; description_raw?: string }) => 
                item && item.background_image)
              .map((item: { background_image: string; id: number; name: string; released?: string; description_raw?: string }) => ({
                id: item.id.toString(),
                title: item.name || 'İsimsiz Oyun',
                image: item.background_image,
                type: 'game',
                year: item.released?.split('-')[0] || '',
                description: item.description_raw || ''
              }));
            
            if (filteredResults.length === 0) {
              setError(`"${debouncedSearch}" için oyun bulunamadı.`);
            }
          } catch (error) {
            console.error('Oyun arama hatası:', error);
            setError('Oyun araması sırasında bir hata oluştu.');
          }
          break;
        }
        case 'people': {
          try {
            const tmdbResults = await searchTMDB(debouncedSearch);
            filteredResults = tmdbResults
              .filter((item: TMDBItem) => item && item.media_type === 'person' && item.profile_path)
              .map((item: TMDBItem) => ({
                id: item.id.toString(),
                title: item.name || 'İsimsiz Kişi',
                image: `https://image.tmdb.org/t/p/w185${item.profile_path}`,
                type: 'person',
                description: item.known_for_department || ''
              }));
            
            if (filteredResults.length === 0) {
              setError(`"${debouncedSearch}" için kişi bulunamadı.`);
            }
          } catch (error) {
            console.error('Kişi arama hatası:', error);
            setError('Kişi araması sırasında bir hata oluştu.');
          }
          break;
        }
        case 'lists': {
          try {
            const listResults = await searchLists(debouncedSearch);
            
            if (!Array.isArray(listResults)) {
              console.error('Liste sonuçları bir dizi değil');
              setError('Liste sonuçları işlenirken bir hata oluştu.');
              filteredResults = [];
              break;
            }
            
            const filtered = listResults.map((item) => {
              try {
                // Liste bilgilerini güvenli bir şekilde işle
                const id = item?.id?.toString() || `list-${Date.now()}`;
                const title = item?.title || 'Liste';
                const description = item?.description || '';
                const createdAt = item?.created_at || new Date().toISOString();
                
                // Profil bilgilerini güvenli bir şekilde işle
                let avatar = '';
                let username = '';
                
                if (item?.profiles) {
                  if (Array.isArray(item.profiles)) {
                    // Eğer bir dizi ise ilk elemanı al
                    const profile = item.profiles[0];
                    avatar = profile?.avatar || '';
                    username = profile?.username || '';
                  } else if (typeof item.profiles === 'object' && item.profiles !== null) {
                    // Tek bir nesne ise ve null değilse doğrudan kullan
                    // TypeScript'e profiles'in bir nesne olduğunu belirtiyoruz
                    const profileObj = item.profiles as { avatar?: string; username?: string };
                    avatar = profileObj?.avatar || '';
                    username = profileObj?.username || '';
                  }
                }
                
                return {
                  id,
                  title,
                  image: avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=List',
                  type: 'list',
                  year: new Date(createdAt).getFullYear().toString(),
                  description,
                  username
                };
              } catch (itemError) {
                console.error('Liste öğesi işlenirken hata:', itemError);
                // Hata durumunda varsayılan bir liste nesnesi döndür
                return {
                  id: `list-error-${Date.now()}`,
                  title: 'Liste',
                  image: 'https://api.dicebear.com/7.x/initials/svg?seed=ListError',
                  type: 'list',
                  year: new Date().getFullYear().toString(),
                  description: '',
                  username: ''
                };
              }
            });
            
            filteredResults = filtered;
          } catch (error) {
            console.error('Liste arama hatası:', error);
            setError('Liste araması sırasında bir hata oluştu.');
            filteredResults = [];
          }
          break;
        }
        
        // Mekan araması
        case 'places': {
          try {
            const placeResults = await searchPlaces(debouncedSearch);
            
            if (!Array.isArray(placeResults)) {
              console.error('Mekan sonuçları bir dizi değil');
              setError('Mekan sonuçları işlenirken bir hata oluştu.');
              filteredResults = [];
              break;
            }
            
            filteredResults = placeResults.map((place) => ({
              id: place.id,
              title: place.name || 'Mekan',
              image: place.image || getDefaultPlaceImage(place.name || 'Mekan'),
              type: 'place',
              description: place.categories?.join(', ') || '',
              address: place.address,
              city: place.city,
              country: place.country,
              latitude: place.latitude,
              longitude: place.longitude
            }));
            
            if (filteredResults.length === 0) {
              setError(`"${debouncedSearch}" için mekan bulunamadı.`);
            }
          } catch (error) {
            console.error('Mekan arama hatası:', error);
            setError('Mekan araması sırasında bir hata oluştu.');
            filteredResults = [];
          }
          break;
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      filteredResults = [];
    } finally {
      setSearchResults(filteredResults);
      setIsSearching(false);
    }
  };

  // Her kategori için tip güvenliği sağlamak için any kullanıyoruz
  // ama her durumda try-catch ile güvenli bir şekilde işliyoruz
  const formatResult = (result: any): SearchResult | null => {
    switch (normalizedCategory) {
      case 'movies':
        return {
          id: result.id?.toString() || '',
          title: result.title || 'İsimsiz Film',
          image: result.poster_path
            ? `https://image.tmdb.org/t/p/w185${result.poster_path}`
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(result.title || 'Movie')}`,
          type: 'movie',
          year: result.release_date?.split('-')[0] || '',
          description: result.overview || ''
        };
      case 'series':
        return {
          id: result.id?.toString() || '',
          title: result.name || 'İsimsiz Dizi',
          image: result.poster_path
            ? `https://image.tmdb.org/t/p/w185${result.poster_path}`
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(result.name || 'Series')}`,
          type: 'series',
          year: result.first_air_date?.split('-')[0] || '',
          description: result.overview || ''
        };
      case 'games':
        return {
          id: result.id?.toString() || '',
          title: result.name || 'İsimsiz Oyun',
          image: result.background_image
            ? result.background_image
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(result.name || 'Game')}`,
          type: 'game',
          year: result.released?.split('-')[0] || '',
          description: result.description_raw || result.description || ''
        };
      case 'people':
        return {
          id: result.id?.toString() || '',
          title: result.name || 'İsimsiz Kişi',
          image: result.profile_path
            ? `https://image.tmdb.org/t/p/w185${result.profile_path}`
            : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(result.name || 'Person')}`,
          type: 'person',
          description: result.known_for_department || ''
        };
      case 'lists':
        try {
          return {
            id: result.id?.toString() || '',
            title: result.title || 'Liste',
            image: result.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(result.title || 'List')}`,
            type: 'list',
            year: result.year || new Date().getFullYear().toString(),
            description: result.description || '',
            username: result.username || ''
          };
        } catch (error) {
          console.error('Liste formatlanırken hata:', error);
          return {
            id: `list-error-${Date.now()}`,
            title: 'Liste',
            image: 'https://api.dicebear.com/7.x/initials/svg?seed=ListError',
            type: 'list',
            year: new Date().getFullYear().toString(),
            description: '',
            username: ''
          };
        }
      case 'videos':
        return {
          id: result.id,
          title: result.title,
          image: `https://img.youtube.com/vi/${result.id}/hqdefault.jpg`,
          type: 'video',
          description: result.description
        };
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={popupRef} className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">İçerik Ara</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        {/* Arama Sonuçları -- üstteki grid kaldırıldı */}

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <p>{error}</p>
            </div>
          )}
          
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={normalizedCategory === 'videos' ? 'YouTube video linkini yapıştırın' : 'Ara...'}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {searchResults.map((result) => {
                  // Eğer zaten formatlanmışsa tekrar formatResult çağırma
                  const item = result.image && result.title ? result : formatResult(result);
                  if (!item) return null;
                  const isAlreadyAdded = alreadyAddedItemIds.includes(item.id);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isAlreadyAdded) return;
                        if (item.type === 'list' && item.username) {
                          navigate(`/profile/${item.username}/list/${encodeURIComponent(item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          onClose();
                        } else {
                          onSelect(item);
                          onClose();
                        }
                      }}
                      className={`flex gap-3 p-2 bg-gray-50 rounded-lg ${isAlreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}`}
                      style={isAlreadyAdded ? { pointerEvents: 'none' } : {}}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-28 object-cover rounded"
                        onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title)}`; }}
                      />
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        {item.year && (
                          <p className="text-sm text-gray-500">{item.year}</p>
                        )}
                      </div>
                      {isAlreadyAdded && (
                        <span className="absolute top-2 right-2 bg-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded">Eklendi</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {searchQuery ? `${getCategoryTitle()} için sonuç bulunamadı` : 'Aramak istediğiniz içeriği yazın'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}