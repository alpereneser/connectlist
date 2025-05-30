import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Film, Tv, BookOpen, Users2, Youtube, Gamepad2, MapPin, Search, X, AlertCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { SubHeader } from '../components/SubHeader';
import { useDebounce } from '../hooks/useDebounce';
import { searchTMDB, searchGames, searchBooks, createList, getVideoDetails, searchPlaces } from '../lib/api';
import { countries, getCitiesByCountry, getDefaultPlaceImage } from '../lib/api-google-places';

const listSchema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter olmalıdır'),
  description: z.string().optional(),
});

type ListForm = z.infer<typeof listSchema>;

type ListItem = {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'video' | 'place';
  year?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export function CreateList() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<ListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<ListItem[]>([]);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Mekan araması için ülke ve şehir seçimi
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<{name: string}[]>([]);
  
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

  // Kategori places olduğunda ülke ve şehir seçimini göster
  useEffect(() => {
    if (category === 'places') {
      setShowLocationSelect(true);
    } else {
      setShowLocationSelect(false);
    }
  }, [category]);

  // Ülke seçildiğinde şehirleri getir
  useEffect(() => {
    const fetchCities = async () => {
      if (selectedCountry) {
        console.log(`Fetching cities for country: ${selectedCountry}`);
        const cities = await getCitiesByCountry(selectedCountry);
        setAvailableCities(cities);
        setSelectedCity(''); // Ülke değiştiğinde şehir seçimini sıfırla
      } else {
        setAvailableCities([]);
        setSelectedCity('');
      }
    };
    
    fetchCities();
  }, [selectedCountry]);

  // Arama işlemini gerçekleştiren fonksiyon
  const handleSearch = useCallback(async () => {
    // Video kategorisi için YouTube link kontrolü
    if (category === 'videos') {
      const videoId = debouncedSearch.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\s]{11})/)?.[1];

      if (videoId) {
        setIsSearching(true);
        setSearchResults([]);

        try {
          const videoDetails = await getVideoDetails(videoId);
          const videoItem: ListItem = {
            id: videoId,
            title: videoDetails.title,
            type: 'video',
            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            description: videoDetails.description,
            year: new Date().getFullYear().toString()
          };
          
          setSearchResults(prev => [...prev, videoItem]);
          
          if (!selectedItems.some(item => item.id === videoItem.id)) {
            setSelectedItems(prev => [...prev, videoItem]);
          }
          setSearchQuery(''); // Input'u temizle
        } catch (error) {
          console.error('Error fetching video details:', error);
          let message = 'Video detayları alınamadı. Lütfen geçerli bir YouTube linki girdiğinizden emin olun.';
          
          if (error instanceof Error) {
            if (error.message.includes('404')) {
              message = 'Video bulunamadı. Lütfen linki kontrol edin.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
              message = 'Bu video özel veya erişime kapalı. Lütfen başka bir video deneyin.';
            } else {
              message = error.message;
            }
          }
          
          setErrorMessage(message);
          setShowErrorPopup(true);
        } finally {
          setIsSearching(false);
        }
      } else if (!videoId && debouncedSearch.trim()) { // Sadece debouncedSearch boş değilse hata göster
        setErrorMessage('Lütfen geçerli bir YouTube video linki girin.');
        setShowErrorPopup(true);
      }
      return;
    }

    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    // Arama işlemi için timeout ayarla (5 saniye)
    const searchTimeout = setTimeout(() => {
      // 5 saniye içinde sonuç gelmezse arama işlemini iptal et
      if (isSearching) {
        console.log('Arama işlemi devam ediyor, otomatik olarak sonuçlar gösterilecek');
        // Burada hata mesajı göstermiyoruz, simülasyon sonuçları zaten gösterilecek
        setIsSearching(false);
      }
    }, 5000);

    try {
      switch (category) {
        case 'movies': {
          const tmdbResults = await searchTMDB(debouncedSearch);
          const movieResults = tmdbResults
            .filter((item: TMDBItem) => item && item.media_type === 'movie')
            .map((item: TMDBMovie) => {
              // Konsola poster_path değerini yazdır
              console.log('Film poster_path:', item.poster_path);
              
              return {
                id: item.id.toString(),
                title: item.title || 'İsimsiz Film',
                image: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.title || 'Film')}&backgroundColor=red`,
                type: 'movie',
                year: item.release_date?.split('-')[0] || '',
                description: item.overview || ''
              };
            });
          console.log('Bulunan filmler:', movieResults);
          setSearchResults(movieResults);
          break;
        }
        case 'series': {
          const tmdbResults = await searchTMDB(debouncedSearch);
          const seriesResults = tmdbResults
            .filter((item: TMDBItem) => item && item.media_type === 'tv')
            .map((item: TMDBSeries) => {
              // Konsola poster_path değerini yazdır
              console.log('Dizi poster_path:', item.poster_path);
              
              return {
                id: item.id.toString(),
                title: item.name || 'İsimsiz Dizi',
                image: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : 
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name || 'Dizi')}&backgroundColor=purple`,
                type: 'series',
                year: item.first_air_date?.split('-')[0] || '',
                description: item.overview || ''
              };
            });
          console.log('Bulunan diziler:', seriesResults);
          setSearchResults(seriesResults);
          break;
        }
        case 'books': {
          const bookResults = await searchBooks(debouncedSearch);
          const bookItems = bookResults
            .filter((item: BookItem) => item && item.volumeInfo)
            .map((item: BookItem) => {
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
            });
          console.log('Bulunan kitaplar:', bookItems);
          setSearchResults(bookItems);
          break;
        }
        case 'games': {
          const gameResults = await searchGames(debouncedSearch);
          const gameItems = gameResults
            .filter((item: GameItem) => item)
            .map((item: GameItem) => ({
              id: item.id.toString(),
              title: item.name || 'İsimsiz Oyun',
              image: item.background_image || (item.name ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=green` : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent('Oyun')}&backgroundColor=green`),
              type: 'game',
              year: item.released?.split('-')[0] || '',
              description: item.description_raw || item.description || ''
            }));
          console.log('Bulunan oyunlar:', gameItems);
          setSearchResults(gameItems);
          break;
        }
        case 'people': {
          const tmdbResults = await searchTMDB(debouncedSearch);
          const peopleResults = tmdbResults
            .filter((item: TMDBItem) => item && item.media_type === 'person')
            .map((item: TMDBPerson) => {
              // Konsola profile_path değerini yazdır
              console.log('Kişi profile_path:', item.profile_path);
              
              return {
                id: item.id.toString(),
                title: item.name || 'İsimsiz Kişi',
                image: item.profile_path ? `https://image.tmdb.org/t/p/w185${item.profile_path}` :
                       `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.name || 'Kişi')}&backgroundColor=blue`,
                type: 'person',
                description: item.known_for_department || ''
              };
            });
          console.log('Bulunan kişiler:', peopleResults);
          setSearchResults(peopleResults);
          break;
        }
        case 'places': {
          // Ülke ve şehir seçilmemişse arama yapma
          if (!selectedCountry && category === 'places') {
            setErrorMessage(t('common.errors.selectCountryCity'));
            setShowErrorPopup(true);
            setSearchResults([]);
            setIsSearching(false);
            return;
          }
          
          // Arama sorgusu boş değilse ve en az 2 karakter ise arama yap
          if (debouncedSearch.trim().length >= 2) {
            try {
              // lib/api.ts'deki searchPlaces fonksiyonunu kullan
              let placeQuery = debouncedSearch;
              const countryName = countries.find(c => c.code === selectedCountry)?.name || '';
              if (selectedCity && countryName) {
                placeQuery = `${debouncedSearch} ${selectedCity} ${countryName}`;
              } else if (countryName) {
                placeQuery = `${debouncedSearch} ${countryName}`;
              }
              console.log('Mekan araması için oluşturulan sorgu:', placeQuery);
              const placeResults = await searchPlaces(placeQuery, i18n.language); // searchPlaces çağrısı
              console.log('Bulunan mekanlar (searchPlaces):', placeResults);
              // searchPlaces zaten ListItem formatına yakın bir formatta dönüyor olmalı
              // Gerekirse burada ek map'leme yapılabilir.
              setSearchResults(placeResults.map((place: any) => ({
                id: place.id,
                title: place.name,
                image: place.image || getDefaultPlaceImage(place.name), // getDefaultPlaceImage fonksiyonu kullanıldı
                type: 'place',
                address: place.address,
                city: place.city,
                country: place.country,
                latitude: place.latitude,
                longitude: place.longitude,
                description: place.description
              })));
            } catch (error) {
              console.error('Mekan araması hatası:', error);
              setErrorMessage(t('common.errors.searchFailed'));
              setShowErrorPopup(true);
              setSearchResults([]);
            }
          } else {
            setSearchResults([]);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      // Timeout'u temizle
      clearTimeout(searchTimeout);
      setIsSearching(false);
    }
  }, [category, debouncedSearch, selectedCountry, selectedCity, selectedItems, getVideoDetails, searchTMDB, searchGames, searchBooks, t]);
  
  // useEffect ile arama işlemini yönet
  useEffect(() => {
    if (debouncedSearch) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, handleSearch]);
  
  // Önceden seçili içeriği kontrol et
  useEffect(() => {
    if (location.state?.type && location.state?.item) {
      const preselectedItem = {
        id: location.state.item.id,
        title: location.state.item.title,
        image: location.state.item.image,
        type: location.state.type,
        year: location.state.item.year,
        description: location.state.item.description
      };
      setSelectedItems([preselectedItem]);
    }
  }, [location.state]);

  const { register, handleSubmit, formState: { errors } } = useForm<ListForm>({
    resolver: zodResolver(listSchema),
  });

  // Popup dışına tıklandığında kapatma
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getCategoryIcon = () => {
    switch (category) {
      case 'movies': return Film;
      case 'series': return Tv;
      case 'books': return BookOpen;
      case 'games': return Gamepad2;
      case 'people': return Users2;
      case 'videos': return Youtube;
      case 'places': return MapPin;
      default: return Film;
    }
  };

  const getCategoryTitle = () => {
    const isTurkish = i18n.language === 'tr';
    
    switch (category) {
      case 'movies':
        return isTurkish ? 'Film' : 'Movie';
      case 'series':
        return isTurkish ? 'Dizi' : 'TV Series';
      case 'books':
        return isTurkish ? 'Kitap' : 'Book';
      case 'games':
        return isTurkish ? 'Oyun' : 'Game';
      case 'videos':
        return isTurkish ? 'Video' : 'Video';
      case 'places':
        return isTurkish ? 'Mekan' : 'Place';
      default:
        return isTurkish ? 'Bilinmeyen' : 'Unknown';
    }
  };

  // handleSelectItem fonksiyonu güncellendi: ListItem tipinde parametre alıyor
  const handleSelectItem = useCallback((newItem: ListItem) => { 
    console.log("Adding item to preview:", newItem); // Add logging here

    // Check if item is already selected
    if (!selectedItems.some(item => item.id === newItem.id)) {
      setSelectedItems(prevItems => [...prevItems, newItem]);
    }

    // Clear search and close results
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false); 
    if (searchInputRef.current) {
      searchInputRef.current.value = ''; // Clear input visually
    }

  }, [selectedItems]); // formatResult bağımlılıklardan kaldırıldı

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const onSubmit = async (data: ListForm) => {
    if (selectedItems.length === 0) {
      setErrorMessage('En az bir içerik seçmelisiniz');
      setShowErrorPopup(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Seçilen öğeleri temizle ve null/undefined değerleri kontrol et
      const cleanItems = selectedItems.map(item => ({
        external_id: item.id || '',
        title: item.title || '',
        image_url: item.image || '',
        type: item.type || 'movie',
        year: typeof item.year === 'string' ? item.year : undefined,
        description: typeof item.description === 'string' ? item.description : undefined,
      }));

      // Veri kontrolü yap
      if (!category) {
        throw new Error('Kategori belirtilmemiş');
      }

      if (!data.title || data.title.trim() === '') {
        throw new Error('Liste başlığı boş olamaz');
      }

      console.log('Gönderilecek veriler:', {
        title: data.title,
        description: data.description || '',
        category: category,
        items: cleanItems
      });

      const list = await createList({
        title: data.title,
        description: data.description || '',
        category: category,
        items: cleanItems,
      });

      if (!list || !list.id) {
        throw new Error('Liste oluşturuldu ancak ID alınamadı');
      }

      // Liste oluşturulduktan sonra doğrudan ListDetails sayfasına yönlendir
      // Oluşturulan listenin ID'sini state olarak gönderiyoruz
      navigate(`/list-details`, { 
        replace: true, 
        state: { 
          listId: list.id,
          newList: true // Yeni oluşturulan liste olduğunu belirtmek için
        } 
      });
    } catch (error) {
      console.error('Error creating list:', error);
      let errorMessage = 'Liste oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.';
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.';
        } else if (error.message.includes('404')) {
          errorMessage = 'API endpoint bulunamadı. Lütfen daha sonra tekrar deneyin.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        } else {
          errorMessage = `Hata: ${error.message}`;
        }
      }
      
      setErrorMessage(errorMessage);
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Icon = getCategoryIcon();

  if (selectedItems.length > 0) {
    console.log('Rendering List Preview with items:', selectedItems); 
  }

  return (
    <>
      <Header />
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
      <SubHeader />
      <div className="min-h-screen bg-[rgb(250,250,250)] pt-[119px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-8 mt-[25px]">
            <Icon size={32} className="text-orange-500" />
            <h1 className="text-[15px] font-bold">
              {i18n.language === 'tr' ? 
                `Yeni ${getCategoryTitle()} Listesi Oluştur` : 
                `Create New ${getCategoryTitle()} List`}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sol Kolon - Form */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-[135px]">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {i18n.language === 'tr' ? 'Liste Başlığı' : 'List Title'}
                    </label>
                    <input
                      type="text"
                      {...register('title')}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder={i18n.language === 'tr' ? 'Listeye bir başlık verin' : 'Give your list a title'}
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {i18n.language === 'tr' ? 'Liste Açıklaması' : 'List Description'}
                    </label>
                    <textarea
                      {...register('description')}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder={i18n.language === 'tr' ? 'Listeniz hakkında kısa bir açıklama yazın' : 'Write a short description about your list'}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Ülke ve şehir seçimi - Sadece places kategorisi için gösterilir */}
                  {showLocationSelect && (
                    <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700">{t('common.locationSelection')}</h3>
                      
                      {/* Ülke Seçimi */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('common.country')}
                        </label>
                        <select
                          value={selectedCountry}
                          onChange={(e) => setSelectedCountry(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">{t('common.selectCountry')}</option>
                          {countries.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Şehir Seçimi - Sadece ülke seçildiğinde gösterilir */}
                      {selectedCountry && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('common.city')}
                          </label>
                          <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="">{t('common.selectCity')}</option>
                            {availableCities.map(city => (
                              <option key={city.name} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder={category === 'videos'
                          ? t('listPreview.listDetails.youtubeLinkPlaceholder')
                          : category === 'places'
                            ? t('listPreview.listDetails.searchPlacesPlaceholder', { city: selectedCity || t('common.selectedLocation') })
                            : t('listPreview.listDetails.searchContentPlaceholder', { category: getCategoryTitle() })}
                      />
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    {category === 'videos' && (
                      <p className="text-sm text-gray-500 mt-2 mb-4">
                        {t('listPreview.listDetails.youtubeLinkExample')}
                      </p>
                    )}

                    {/* Arama Durumu */}
                    {isSearching && (
                      <div className="mt-2 p-3 text-center text-blue-500">
                        {t('listPreview.listDetails.searching')}
                      </div>
                    )}
                    
                    {/* Arama Sonuçları */}
                    {!isSearching && searchResults.length > 0 && (
                      <div 
                        ref={searchResultsRef}
                        className="mt-2 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
                      >
                        {searchResults.map((result) => {
                          const isSelected = selectedItems.some(selected => selected.id === result.id);
                          return (
                            <div
                              key={result.id}
                              // Pass the formatted 'result' directly to handleSelectItem
                              onClick={() => { 
                                console.log('Search result item clicked:', result); 
                                !isSelected && handleSelectItem(result); 
                              }}
                              className={`flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-100 transition-colors ${isSelected ? 'bg-gray-200 opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <img
                                src={result.image}
                                alt={result.title}
                                loading="lazy"
                                decoding="async"
                                className="w-12 h-16 object-cover rounded-md bg-gray-200"
                              />
                              <div className="text-left">
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    {isSubmitting ? 
                      (i18n.language === 'tr' ? 'Oluşturuluyor...' : 'Creating...') : 
                      (i18n.language === 'tr' ? 'Liste Oluştur' : 'Create List')
                    }
                  </button>
                </form>
              </div>
            </div>

            {/* Sağ Kolon - Önizleme */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">{i18n.language === 'tr' ? 'Önizleme' : 'Preview'}</h2>
              
              {selectedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {i18n.language === 'tr' ? 'Henüz içerik eklenmedi' : 'No content added yet'}
                </div>
              ) : selectedItems.length > 0 ? (
                <div className="space-y-4">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-24 object-cover rounded-md shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">{item.title}</h3>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1 hover:bg-gray-100 rounded-full"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        {item.type === 'place' ? (
                          <div className="text-xs text-gray-500">
                            {item.city && <span>{item.city}</span>}
                            {item.city && item.country && <span>, </span>}
                            {item.country && <span>{item.country}</span>}
                          </div>
                        ) : item.year ? (
                          <p className="text-sm text-gray-500">{item.year}</p>
                        ) : null}
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {t('listPreview.listDetails.searchAndSelect')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}