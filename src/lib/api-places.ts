// Foursquare API fonksiyonları

// Arama önbelleği - kredi kullanımını azaltmak için
const searchCache: Record<string, { timestamp: number, results: any[] }> = {};

// Önbellek süresi (24 saat - milisaniye cinsinden)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Mekan için varsayılan görsel oluştur
export function getDefaultPlaceImage(name: string) {
  // Mekan adının tamamının yazdığı gri zeminli bir görsel döndür
  
  // Mekan adını kısaltma (20 karakterden uzunsa)
  const displayName = name.length > 20 ? name.substring(0, 20) + '...' : name;
  
  // Placeholder.com servisini kullanarak mekan adının tamamının yazdığı bir görsel oluştur
  // 300x300 boyutunda gri (#808080) arka plan, beyaz yazı rengi
  return `https://placehold.co/300x300/808080/FFF?text=${encodeURIComponent(displayName)}`;
}

// Mekan araması yap
export async function searchPlaces(query: string, near?: string) {
  try {
    // Önbellek anahtarı oluştur
    const cacheKey = `${query}_${near || ''}`;
    
    // Önbellekte bu arama var mı kontrol et
    if (searchCache[cacheKey] && 
        (Date.now() - searchCache[cacheKey].timestamp) < CACHE_DURATION) {
      console.log('Önbellekten mekan araması sonuçları kullanılıyor:', query);
      return searchCache[cacheKey].results;
    }
    
    // Önbellekte yoksa veya süresi dolmuşsa, API'den al
    const baseUrl = 'https://api.foursquare.com/v3/places/search';
    
    // API anahtarını import et
    const FOURSQUARE_API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;
    
    // Query parametrelerini oluştur
    const params = new URLSearchParams();
    // Arama sorgusunu normalize et (boşlukları ve özel karakterleri koruyarak)
    params.append('query', query.trim());
    if (near) params.append('near', near);
    params.append('limit', '50'); // Daha fazla sonuç getir
    // Arama hassasiyetini artırmak için fuzzy_match parametresini ekle
    params.append('fuzzy_match', 'true');
    // Sonuçları sıralamak için sort parametresini ekle
    params.append('sort', 'relevance');
    // Dil desteği ekle
    params.append('locale', 'tr,en');
    
    console.log('Mekan araması yapılıyor (API):', query);
    
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': FOURSQUARE_API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Foursquare API error: ${response.status}`, await response.text());
      // Hata durumunda örnek veri döndür
      return getMockPlaces();
    }
    
    const data = await response.json();
    console.log('Foursquare API yanıtı:', data);
    
    // Sonuçları işle ve döndür
    if (!data.results || !Array.isArray(data.results)) {
      console.error('Unexpected Foursquare API response format:', data);
      return getMockPlaces();
    }
    
    // Önce her mekan için fotoğraf bilgilerini alalım (kredi tasarrufu için optimize edilmiş)
    const placesWithPhotos = await Promise.all(data.results.map(async (place: any) => {
      try {
        // Fotoğraf önbelleği anahtarı
        const photoCacheKey = `photo_${place.fsq_id}`;
        
        // Önbellekte fotoğraf var mı kontrol et
        if (searchCache[photoCacheKey] && 
            (Date.now() - searchCache[photoCacheKey].timestamp) < CACHE_DURATION) {
          console.log('Önbellekten fotoğraf kullanılıyor:', place.name);
          return searchCache[photoCacheKey].results[0];
        }
        
        // Mekan fotoğraflarını almak için ayrı bir istek yapalım
        const photosEndpoint = `https://api.foursquare.com/v3/places/${place.fsq_id}/photos`;
        const photoResponse = await fetch(photosEndpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': FOURSQUARE_API_KEY
          }
        });
        
        let photoUrl = '';
        if (photoResponse.ok) {
          const photos = await photoResponse.json();
          if (photos && photos.length > 0) {
            photoUrl = photos[0].prefix + 'original' + photos[0].suffix;
          }
        }
        
        const placeData = {
          id: place.fsq_id,
          name: place.name,
          address: place.location?.formatted_address || '',
          city: place.location?.locality || '',
          country: place.location?.country || '',
          categories: place.categories?.map((cat: any) => cat.name) || [],
          image: photoUrl || getDefaultPlaceImage(place.name),
          latitude: place.geocodes?.main?.latitude,
          longitude: place.geocodes?.main?.longitude
        };
        
        // Fotoğraf bilgisini önbelleğe kaydet
        searchCache[photoCacheKey] = {
          timestamp: Date.now(),
          results: [placeData]
        };
        
        return placeData;
      } catch (error) {
        console.error(`Error fetching photos for place ${place.name}:`, error);
        return {
          id: place.fsq_id,
          name: place.name,
          address: place.location?.formatted_address || '',
          city: place.location?.locality || '',
          country: place.location?.country || '',
          categories: place.categories?.map((cat: any) => cat.name) || [],
          image: getDefaultPlaceImage(place.name),
          latitude: place.geocodes?.main?.latitude,
          longitude: place.geocodes?.main?.longitude
        };
      }
    }));
    
    // Arama sonuçlarını önbelleğe kaydet
    searchCache[cacheKey] = {
      timestamp: Date.now(),
      results: placesWithPhotos
    };
    
    return placesWithPhotos;
  } catch (error) {
    console.error('Error searching places:', error);
    return getMockPlaces();
  }
}

// Mekan detaylarını getir
export async function getPlaceDetails(id: string) {
  try {
    const baseUrl = `https://api.foursquare.com/v3/places/${id}`;
    
    // API anahtarını import et
    const FOURSQUARE_API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;
    
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': FOURSQUARE_API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Foursquare API error: ${response.status}`, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    // Fotoğrafları al
    const photosResponse = await fetch(`${baseUrl}/photos`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': FOURSQUARE_API_KEY
      }
    });
    
    let photos = [];
    if (photosResponse.ok) {
      const photosData = await photosResponse.json();
      photos = photosData.map((photo: any) => ({
        url: photo.prefix + 'original' + photo.suffix
      }));
    }
    
    // İpuçlarını al
    const tipsResponse = await fetch(`${baseUrl}/tips`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': FOURSQUARE_API_KEY
      }
    });
    
    let tips = [];
    if (tipsResponse.ok) {
      const tipsData = await tipsResponse.json();
      tips = tipsData.map((tip: any) => ({
        text: tip.text,
        created_at: tip.created_at
      }));
    }
    
    return {
      id: data.fsq_id,
      name: data.name,
      description: '',
      address: data.location?.formatted_address || '',
      city: data.location?.locality || '',
      country: data.location?.country || '',
      categories: data.categories?.map((cat: any) => cat.name) || [],
      rating: data.rating,
      photos: photos.length > 0 ? photos : [{ url: getDefaultPlaceImage(data.name) }],
      tips,
      latitude: data.geocodes?.main?.latitude,
      longitude: data.geocodes?.main?.longitude,
      tel: data.tel,
      website: data.website,
      hours: data.hours?.display || '',
      price: data.price ? '₺'.repeat(data.price) : ''
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

// Mock veri
function getMockPlaces() {
  return [
    {
      id: 'mock1',
      name: 'Köfteci Yusuf',
      address: 'Atatürk Caddesi',
      city: 'İstanbul',
      country: 'Türkiye',
      categories: ['Restoran', 'Köfte'],
      image: getDefaultPlaceImage('Köfteci Yusuf'),
      latitude: 41.0082,
      longitude: 28.9784
    },
    {
      id: 'mock2',
      name: 'Köfteci Ramiz',
      address: 'İstiklal Caddesi',
      city: 'İstanbul',
      country: 'Türkiye',
      categories: ['Restoran', 'Köfte'],
      image: getDefaultPlaceImage('Köfteci Ramiz'),
      latitude: 41.0342,
      longitude: 28.9833
    }
  ];
}
