import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Tv, BookOpen, Users2, Youtube, Gamepad2, MapPin, Music, Search, X, AlertCircle } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { searchTMDB, searchGames, searchBooks, getVideoDetails, searchPlaces, getDefaultPlaceImage, searchYouTubeMusic } from '../lib/api';

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

interface CreateListStep1Props {
  category: string;
  selectedItems: ListItem[];
  onItemsChange: (items: ListItem[]) => void;
  onNext: () => void;
}

// API yanıt tipleri
interface TMDBMovie {
  id: number;
  title: string;
  media_type: string;
  poster_path: string | null;
  release_date?: string;
  overview?: string;
}

interface TMDBSeries {
  id: number;
  name: string;
  media_type: string;
  poster_path: string | null;
  first_air_date?: string;
  overview?: string;
}

interface TMDBPerson {
  id: number;
  name: string;
  media_type: string;
  profile_path: string | null;
  known_for_department?: string;
}

type TMDBItem = TMDBMovie | TMDBSeries | TMDBPerson;

interface BookVolumeInfo {
  title: string;
  description?: string;
  publishedDate?: string;
  imageLinks?: {
    thumbnail?: string;
  };
}

interface BookItem {
  id: string;
  volumeInfo: BookVolumeInfo;
}

interface GameItem {
  id: number;
  name: string;
  background_image?: string;
  released?: string;
  description_raw?: string;
  description?: string;
}

export function CreateListStep1({ category, selectedItems, onItemsChange, onNext }: CreateListStep1Props) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ListItem[]>([]);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const getIcon = () => {
    const iconMap: { [key: string]: any } = {
      movies: Film,
      series: Tv,
      books: BookOpen,
      games: Gamepad2,
      people: Users2,
      videos: Youtube,
      places: MapPin,
      music: Music
    };
    return iconMap[category || ''] || Film;
  };

  const Icon = getIcon();

  const handleSelectItem = (item: ListItem) => {
    const isAlreadySelected = selectedItems.some(selected => selected.id === item.id);
    if (!isAlreadySelected) {
      onItemsChange([...selectedItems, item]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    onItemsChange(selectedItems.filter(item => item.id !== itemId));
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let results: ListItem[] = [];

      switch (category) {
        case 'movies':
        case 'series':
        case 'people': {
          const type = category === 'people' ? 'person' : category === 'movies' ? 'movie' : 'tv';
          const tmdbResults = await searchTMDB(query, type);
          results = tmdbResults.map((item: TMDBItem) => {
            const isMovie = 'title' in item;
            const isSeries = 'name' in item;
            const isPerson = 'known_for_department' in item;
            
            return {
              id: item.id.toString(),
              title: isMovie ? item.title : isSeries ? item.name : item.name,
              image: item.poster_path || item.profile_path 
                ? `https://image.tmdb.org/t/p/w500${item.poster_path || item.profile_path}`
                : '/placeholder-image.jpg',
              type: isPerson ? 'person' as const : isMovie ? 'movie' as const : 'series' as const,
              year: isMovie ? item.release_date?.split('-')[0] : isSeries ? item.first_air_date?.split('-')[0] : undefined,
              description: isMovie ? item.overview : isSeries ? item.overview : undefined
            };
          });
          break;
        }
        case 'books': {
          const bookResults = await searchBooks(query);
          results = bookResults.map((book: BookItem) => ({
            id: book.id,
            title: book.volumeInfo.title,
            image: book.volumeInfo.imageLinks?.thumbnail || '/placeholder-book.jpg',
            type: 'book' as const,
            year: book.volumeInfo.publishedDate?.split('-')[0],
            description: book.volumeInfo.description
          }));
          break;
        }
        case 'games': {
          const gameResults = await searchGames(query);
          results = gameResults.map((game: GameItem) => ({
            id: game.id.toString(),
            title: game.name,
            image: game.background_image || '/placeholder-game.jpg',
            type: 'game' as const,
            year: game.released?.split('-')[0],
            description: game.description_raw || game.description
          }));
          break;
        }
        case 'videos': {
          if (query.includes('youtube.com') || query.includes('youtu.be')) {
            try {
              const videoDetails = await getVideoDetails(query);
              if (videoDetails) {
                results = [{
                  id: videoDetails.id,
                  title: videoDetails.title,
                  image: videoDetails.thumbnail,
                  type: 'video' as const,
                  description: videoDetails.description
                }];
              }
            } catch (error) {
              console.error('Video details error:', error);
              setErrorMessage(i18n.language === 'tr' 
                ? 'Video bilgileri alınamadı. Lütfen geçerli bir YouTube linki girin.'
                : 'Could not fetch video details. Please enter a valid YouTube link.');
              setShowErrorPopup(true);
            }
          }
          break;
        }
        case 'places': {
          const placeResults = await searchPlaces(query);
          results = await Promise.all(placeResults.map(async (place: any) => {
            const defaultImage = await getDefaultPlaceImage(place.place_id);
            return {
              id: place.place_id,
              title: place.name,
              image: defaultImage,
              type: 'place' as const,
              address: place.formatted_address,
              city: place.address_components?.find((comp: any) => 
                comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')
              )?.long_name,
              country: place.address_components?.find((comp: any) => 
                comp.types.includes('country')
              )?.long_name,
              latitude: place.geometry?.location?.lat,
              longitude: place.geometry?.location?.lng
            };
          }));
          break;
        }
        case 'music': {
          const musicResults = await searchYouTubeMusic(query);
          results = musicResults.map((music: any) => ({
            id: music.id,
            title: music.title,
            image: music.image,
            type: 'music' as const,
            description: music.channel
          }));
          break;
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Kategori değiştiğinde arama state'ini temizle
  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setShowErrorPopup(false);
    setErrorMessage('');
  }, [category]);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, category]);

  return (
    <>
      {/* Hata Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-semibold">Video Hatası</h3>
              </div>
              <p className="text-gray-600">{errorMessage}</p>
              <button
                onClick={() => setShowErrorPopup(false)}
                className="w-full mt-6 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[rgb(250,250,250)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-6">
            <Icon size={32} className="text-orange-500" />
            <h1 className="text-lg font-bold">
              {i18n.language === 'tr' ? 
                `${getCategoryTitle()} Seç` : 
                `Select ${getCategoryTitle()}`}
            </h1>
          </div>

          {/* Arama Bölümü */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {category === 'videos' ? t('listPreview.listDetails.youtubeLink') : t('listPreview.listDetails.searchContent')}
            </label>
            <div className="relative">
              <input
                type="text"
                ref={searchInputRef}
                onPaste={(e) => {
                  if (category === 'videos') {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    setSearchQuery(pastedText);
                  }
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                placeholder={category === 'videos'
                  ? t('listPreview.listDetails.youtubeLinkPlaceholder')
                  : category === 'places'
                    ? (i18n.language === 'tr' ? 'Mekan ara...' : 'Search places...')
                    : t('listPreview.listDetails.searchContentPlaceholder', { category: getCategoryTitle() })}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>

            {/* Arama Sonuçları */}
            {(isSearching || searchResults.length > 0) && (
              <div className="mt-4">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">
                      {i18n.language === 'tr' ? 'Aranıyor...' : 'Searching...'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto" ref={searchResultsRef}>
                    {searchResults.map((result) => {
                      const isSelected = selectedItems.some(selected => selected.id === result.id);
                      return (
                        <div
                          key={result.id}
                          onClick={() => { 
                            !isSelected && handleSelectItem(result); 
                          }}
                          className={`flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg ${
                            isSelected ? 'bg-gray-200 opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <img
                            src={result.image}
                            alt={result.title}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-16 object-cover rounded-md bg-gray-200"
                          />
                          <div className="text-left flex-1">
                            <h3 className="font-medium">{result.title}</h3>
                            {result.type === 'place' ? (
                              <div className="text-xs text-gray-500">
                                {result.city && <span>{result.city}</span>}
                                {result.city && result.country && <span>, </span>}
                                {result.country && <span>{result.country}</span>}
                              </div>
                            ) : result.year ? (
                              <p className="text-sm text-gray-500">{result.year}</p>
                            ) : null}
                            {result.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">{result.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-green-500 font-medium text-sm">
                              {i18n.language === 'tr' ? 'Seçildi' : 'Selected'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seçilen İçerikler */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">
                {i18n.language === 'tr' ? 'Seçilen İçerikler' : 'Selected Content'}
                {selectedItems.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">({selectedItems.length})</span>
                )}
              </h2>
            </div>
            
            {selectedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icon size={48} className="mx-auto mb-4 text-gray-300" />
                <p>{i18n.language === 'tr' ? 'Henüz içerik seçilmedi' : 'No content selected yet'}</p>
                <p className="text-sm mt-1">
                  {i18n.language === 'tr' ? 'Yukarıdan arama yaparak içerik ekleyin' : 'Search above to add content'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-48 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="relative">
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            loading="lazy"
                            decoding="async"
                            className="w-full h-32 object-cover rounded-md shadow-sm mb-3"
                          />
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="absolute top-1 right-1 text-white bg-black/50 hover:bg-red-500 p-1 rounded-full transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div>
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">{item.title}</h3>
                          {item.type === 'place' ? (
                            <div className="text-xs text-gray-500">
                              {item.city && <span>{item.city}</span>}
                              {item.city && item.country && <span>, </span>}
                              {item.country && <span>{item.country}</span>}
                            </div>
                          ) : item.year ? (
                            <p className="text-xs text-gray-500">{item.year}</p>
                          ) : null}
                          {item.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={onNext}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 font-medium"
                >
                  {i18n.language === 'tr' ? 'İleri' : 'Next'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}