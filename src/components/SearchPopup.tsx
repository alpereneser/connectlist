import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDebounce } from '../hooks/useDebounce';
import { searchTMDB, searchGames, searchBooks, getVideoDetails, searchLists, searchYouTubeMusic } from '../lib/api';
import { searchPlaces, getDefaultPlaceImage } from '../lib/api-places';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
    username?: string;
    address?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  category: string;
  alreadyAddedItemIds?: string[]; // Listede zaten olanlar
}

type SearchResult = {
  id: string;
  title: string;
  image: string;
  type: string;
  year?: string;
  description?: string;
  username?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export function SearchPopup({ isOpen, onClose, onSelect, category, alreadyAddedItemIds = [] }: SearchPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useClickOutside(popupRef, onClose);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Mobile UX improvements
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Auto-focus on mobile and keyboard management
  useEffect(() => {
    if (isOpen && isMobile && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        // Add keyboard handling
        document.body.classList.add('keyboard-stable');
      }, 100);
    }
    
    // Cleanup on close
    if (!isOpen) {
      document.body.classList.remove('keyboard-stable', 'keyboard-open');
    }
    
    return () => {
      if (isOpen) {
        document.body.classList.remove('keyboard-stable', 'keyboard-open');
      }
    };
  }, [isOpen, isMobile]);
  
  // Touch handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    
    const deltaY = touchStart.y - touchEnd.y;
    
    // Swipe down to close on mobile
    if (deltaY < -100 && isMobile) {
      onClose();
    }
  };
  
  // Kategori değerini normalize et
  const normalizedCategory = useMemo(() => {
    // Eğer kategori zaten doğru formatta ise (movies, series, books, games, videos, lists, places, musics, all)
    // olduğu gibi kullan
    if (['movies', 'series', 'books', 'games', 'videos', 'lists', 'places', 'musics', 'all'].includes(category)) {
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
      // case 'person': return 'people'; // people kategorisi kaldırıldı
      case 'video': return 'videos';
      case 'list': return 'lists';
      case 'place': return 'places';
      case 'music': return 'musics';
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
      case 'movies': return t('common.categories.movies');
      case 'series': return t('common.categories.series');
      case 'books': return t('common.categories.books');
      case 'games': return t('common.categories.games');
      // case 'people': return t('common.categories.people'); // people kaldırıldı
      case 'videos': return t('common.categories.videos');
      case 'lists': return t('search.categories.lists');
      case 'places': return t('common.categories.places');
      case 'musics': return t('common.categories.musics');
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
            
            // Kişiler (ALL görünümünde hariç tutuldu)
            // const peopleResults: SearchResult[] = tmdbResults
            //   .filter((item: TMDBItem) => item && item.media_type === 'person' && item.profile_path)
            //   .map((item: TMDBItem) => ({
            //     id: item.id.toString(),
            //     title: item.name || 'İsimsiz Kişi',
            //     image: `https://image.tmdb.org/t/p/w185${item.profile_path}`,
            //     type: 'person',
            //     description: item.known_for_department || ''
            //   }));
            
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
            }).filter((item: SearchResult | null): item is SearchResult => item !== null);
            
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
            
            // Tüm sonuçları birleştir (peopleResults hariç)
            filteredResults = [...movieResults, ...seriesResults, ...bookItems, ...gameItems];
          } catch (error) {
            console.error('Genel arama hatası:', error);
            setError('Arama sırasında bir hata oluştu.');
          }
          break;
        }
        // Film araması
        case 'movies': {
          try {
            const tmdbResults = await searchTMDB(debouncedSearch, 'movie');
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
            const tmdbResults = await searchTMDB(debouncedSearch, 'tv');
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
        
        // Müzik araması
        case 'musics': {
          try {
            const musicResults = await searchYouTubeMusic(debouncedSearch);
            
            if (!Array.isArray(musicResults)) {
              console.error('Müzik sonuçları bir dizi değil');
              setError('Müzik sonuçları işlenirken bir hata oluştu.');
              filteredResults = [];
              break;
            }
            
            filteredResults = musicResults.map((music) => ({
              id: music.id || `music-${Date.now()}-${Math.random()}`,
              title: music.title || 'İsimsiz Müzik',
              image: music.thumbnail || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(music.title || 'Müzik')}&backgroundColor=green`,
              type: 'music',
              description: music.artist || '',
              year: music.duration || ''
            }));
            
            if (filteredResults.length === 0) {
              setError(`"${debouncedSearch}" için müzik bulunamadı.`);
            }
          } catch (error) {
            console.error('Müzik arama hatası:', error);
            setError('Müzik araması sırasında bir hata oluştu.');
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
      case 'places':
        return {
          id: result.id?.toString() || '',
          title: result.name || result.title || 'Mekan',
          image: result.image || getDefaultPlaceImage(result.name || result.title || 'Mekan'),
          type: 'place',
          description: result.categories?.join(', ') || result.description || '',
          address: result.address,
          city: result.city,
          country: result.country,
          latitude: result.latitude,
          longitude: result.longitude
        };
      case 'musics':
        return {
          id: result.id?.toString() || '',
          title: result.name || result.title || 'Müzik',
          image: result.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(result.name || result.title || 'Music')}&backgroundColor=green`,
          type: 'music',
          year: result.year || '',
          description: result.description || ''
        };
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
          <div 
            ref={popupRef} 
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Mobile handle */}
            <div className="flex justify-center py-3 border-b border-gray-200">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('common.searchContent')}</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium">Arama Hatası</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}
              
              <div className="relative mb-4">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={normalizedCategory === 'videos' ? t('createList.pasteYouTubeLink') : t('common.search')}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent mb-3" />
                    <p className="text-gray-600 text-sm">Aranıyor...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((result) => {
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
                          className={`flex gap-4 p-4 bg-gray-50 rounded-xl ${isAlreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer active:scale-95'} transition-all`}
                          style={isAlreadyAdded ? { pointerEvents: 'none' } : {}}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-20 object-cover rounded-lg"
                            onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title)}`; }}
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-lg mb-1">{item.title}</h3>
                            {item.year && (
                              <p className="text-sm text-gray-500">{item.year}</p>
                            )}
                          </div>
                          {isAlreadyAdded && (
                            <span className="px-3 py-1 bg-gray-200 text-gray-500 text-sm rounded-full">Eklendi</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    {searchQuery ? (
                      <div>
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-2 text-gray-900">Sonuç bulunamadı</h3>
                        <p className="text-gray-500 mb-2">
                          "{searchQuery}" için {getCategoryTitle().toLowerCase()} bulunamadı.
                        </p>
                        <p className="text-sm text-gray-400">
                          Farklı anahtar kelimeler deneyin.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-2 text-gray-900">Arama yapın</h3>
                        <p className="text-gray-500">
                          {getCategoryTitle()} aramak için yukarıdaki kutucuğa yazın.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Desktop modal */}
      {!isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div ref={popupRef} className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('common.searchContent')}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Arama Hatası</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
              
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={normalizedCategory === 'videos' ? t('createList.pasteYouTubeLink') : t('common.search')}
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {isSearching ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mb-2" />
                  <p className="text-gray-600 text-sm">Aranıyor...</p>
                </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((result) => {
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
                          className={`flex gap-4 p-4 bg-gray-50 rounded-xl ${isAlreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer active:scale-95'} transition-all`}
                          style={isAlreadyAdded ? { pointerEvents: 'none' } : {}}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-20 object-cover rounded-lg"
                            onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title)}`; }}
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-lg mb-1">{item.title}</h3>
                            {item.year && (
                              <p className="text-sm text-gray-500">{item.year}</p>
                            )}
                          </div>
                          {isAlreadyAdded && (
                            <span className="px-3 py-1 bg-gray-200 text-gray-500 text-sm rounded-full">Eklendi</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="text-center py-8">
                  {searchQuery ? (
                    <div>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-medium mb-2 text-gray-900">Sonuç bulunamadı</h3>
                      <p className="text-gray-500 text-sm mb-2">
                        "{searchQuery}" için {getCategoryTitle().toLowerCase()} bulunamadı.
                      </p>
                      <p className="text-xs text-gray-400">
                        Farklı anahtar kelimeler deneyin.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-medium mb-2 text-gray-900">Arama yapın</h3>
                      <p className="text-gray-500 text-sm">
                        {getCategoryTitle()} aramak için yukarıdaki kutucuğa yazın.
                      </p>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}