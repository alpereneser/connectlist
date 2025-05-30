// Netlify Function for Google Places API Proxy
const axios = require('axios');

// Google Places API anahtarı (Netlify ortam değişkenlerinden alınacak)
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Hata ayıklama için API anahtarının ilk birkaç karakterini logla
console.log(`Google Places API Key is ${GOOGLE_PLACES_API_KEY ? 'set' : 'not set'}`);

// API istekleri için temel URL
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Hata mesajları
const ERROR_MESSAGES = {
  MISSING_API_KEY: 'Google Places API anahtarı bulunamadı',
  INVALID_REQUEST: 'Geçersiz istek parametreleri',
  API_ERROR: 'Google Places API hatası',
  RATE_LIMIT: 'Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.'
};

// CORS yanıtlarını yöneten yardımcı fonksiyon
const createResponse = (statusCode, body, additionalHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...additionalHeaders
  };

  return {
    statusCode,
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
};

exports.handler = async function(event, context) {
  // OPTIONS isteği için yanıt (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'CORS preflight successful' });
  }

  // Log the incoming request
  console.log('Received request:', {
    httpMethod: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers
  });

  try {
    // API anahtarı kontrolü
    if (!GOOGLE_PLACES_API_KEY) {
      const errorMsg = 'Google Places API anahtarı bulunamadı';
      console.error(errorMsg);
      return createResponse(500, { 
        status: 'ERROR',
        error: ERROR_MESSAGES.MISSING_API_KEY 
      });
    }

    // Query parametrelerini al
    const params = event.queryStringParameters || {};
    const { query, country, city } = params;

    // Gerekli parametre kontrolü
    if (!query) {
      const errorMsg = 'Sorgu parametresi gereklidir';
      console.error(errorMsg);
      return createResponse(400, { 
        status: 'INVALID_REQUEST',
        error: errorMsg
      });
    }

    // Arama sorgusunu oluştur - daha iyi sonuçlar için formatı değiştirelim
    let searchQuery = query;
    
    // Şehir ve ülke bilgisini ayrı parametreler olarak gönderelim
    // Google Places API'nin kendi lokasyon biasing özelliğini kullanalım

    console.log(`Searching Places API with query: ${searchQuery}`);

    // Google Places API'ye istek gönder
    const apiUrl = `${PLACES_API_URL}/textsearch/json`;
    
    // İstek parametrelerini oluştur
    const requestParams = {
      query: searchQuery,
      key: GOOGLE_PLACES_API_KEY,
      language: 'tr', // Dil ayarı
      region: country || 'tr', // Varsayılan bölge Türkiye
      type: 'establishment' // Daha iyi sonuçlar için
    };
    
    // Hata ayıklama bilgileri
    console.log('Google Places API isteği:', {
      query: searchQuery,
      country,
      city,
      hasApiKey: !!GOOGLE_PLACES_API_KEY
    });
    
    console.log('Sending request to Google Places API:', {
      url: apiUrl,
      params: {
        ...requestParams,
        key: '[REDACTED]' // API anahtarını loglardan gizle
      }
    });

    const response = await axios.get(apiUrl, {
      params: requestParams,
      timeout: 8000, // 8 saniye zaman aşımı
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error('Google Places API hatası:', error.message);
      if (error.response) {
        console.error('API yanıtı (hata):', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('API isteği gönderilemedi:', error.request);
      }
      throw new Error(ERROR_MESSAGES.API_ERROR);
    });
    
    // API yanıtını işle
    const { status, results = [], error_message } = response.data;
    
    // Hata kontrolü
    if (status !== 'OK') {
      console.error('Google Places API hatası:', status, error_message);
      return createResponse(200, {
        status: 'ERROR',
        error: error_message || 'Mekanlar alınamadı',
        results: []
      });
    }
    
    // Başarılı yanıtı logla
    console.log(`Başarılı yanıt. ${results.length} sonuç bulundu.`);
    
    // API'den dönen veriyi logla
    console.log('Google Places API response:', {
      status: status, // 'data.status' yerine 'status' kullanıldı
      resultsCount: results.length,
      firstResult: results[0] ? {
        name: results[0].name,
        place_id: results[0].place_id,
        types: results[0].types
      } : 'No results'
    });

    // Sonuçları işle ve formatla
    const formattedResults = results.map(place => {
      // Görsel URL'si oluştur (API anahtarı olmadan)
      let imageUrl = '';
      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        // Görsel URL'si için ayrı bir fonksiyon çağrısı yapılacak
        imageUrl = `/.netlify/functions/google-places-photo?photo_reference=${photoReference}`;
      } else {
        // Varsayılan görsel
        imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(place.name || 'place')}`;
      }

      // Şehir ve ülke bilgisini adres bilgisinden çıkar
      let extractedCity = city || '';
      let extractedCountry = country || '';

      if (place.formatted_address) {
        const addressParts = place.formatted_address.split(',').map(part => part.trim());
        if (!city && addressParts.length > 1) {
          extractedCity = addressParts[addressParts.length - 2];
        }
        if (!country && addressParts.length > 0) {
          extractedCountry = addressParts[addressParts.length - 1];
        }
      }

      // Google Maps link oluştur
      const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;

      return {
        id: place.place_id,
        title: place.name,
        image: imageUrl,
        type: 'place',
        address: place.formatted_address,
        city: extractedCity,
        country: extractedCountry,
        latitude: place.geometry?.location.lat,
        longitude: place.geometry?.location.lng,
        rating: place.rating,
        reviews: place.user_ratings_total,
        placeTypes: place.types,
        mapsUrl: mapsUrl
      };
    });

    const responseData = {
      status: 'OK',
      results: formattedResults,
      metadata: {
        totalResults: formattedResults.length,
        query: searchQuery,
        location: city ? `${city}, ${country || ''}`.trim() : ''
      }
    };

    return createResponse(200, responseData);
  } catch (error) {
    console.error('Beklenmeyen hata:', {
      message: error.message,
      stack: error.stack,
      ...(error.response && {
        response: {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        }
      })
    });
    
    // Hata türüne göre uygun yanıt döndür
    const statusCode = (error.response && error.response.status) || 500;
    const errorMessage = error.message || 'Beklenmeyen bir hata oluştu';
    
    return createResponse(statusCode, {
      status: 'ERROR',
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.stack,
        originalError: error
      })
    });
  }
};
