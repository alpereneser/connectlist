// Netlify Function for Google Places Photo Proxy
const axios = require('axios');

// Google Places API anahtarı (Netlify ortam değişkenlerinden alınacak)
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Hata mesajları
const ERROR_MESSAGES = {
  MISSING_API_KEY: 'Google Places API anahtarı bulunamadı',
  INVALID_REQUEST: 'Geçersiz istek parametreleri',
  API_ERROR: 'Google Places API hatası'
};

// CORS yanıtlarını yöneten yardımcı fonksiyon
const createResponse = (statusCode, body, contentType = 'application/json', additionalHeaders = {}) => {
  const headers = {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  try {
    // API anahtarı kontrolü
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API anahtarı bulunamadı');
      return createResponse(500, { 
        status: 'ERROR',
        error: ERROR_MESSAGES.MISSING_API_KEY 
      });
    }

    // Query parametrelerini al
    const { photo_reference, maxwidth = '400', maxheight } = event.queryStringParameters || {};

    // Gerekli parametre kontrolü
    if (!photo_reference) {
      return createResponse(400, { 
        status: 'INVALID_REQUEST',
        error: 'photo_reference parametresi gereklidir' 
      });
    }

    // Google Places Photo API URL'si
    let photoUrl = `https://maps.googleapis.com/maps/api/place/photo`;
    
    // İstek parametreleri
    const params = new URLSearchParams({
      photo_reference,
      key: GOOGLE_PLACES_API_KEY,
      maxwidth
    });

    // İsteğe bağlı maxheight parametresi
    if (maxheight) {
      params.append('maxheight', maxheight);
    }

    // Fotoğrafı Google'dan al
    const response = await axios.get(photoUrl, {
      params,
      responseType: 'arraybuffer',
      timeout: 10000 // 10 saniye zaman aşımı
    }).catch(error => {
      console.error('Google Places Photo API hatası:', error.message);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    });

    // Yanıt başlıklarını al
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const contentLength = response.headers['content-length'];
    const imageData = Buffer.from(response.data, 'binary').toString('base64');

    // Base64 kodlanmış görseli döndür
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=604800', // 1 hafta önbellek
        'Access-Control-Allow-Origin': '*'
      },
      body: imageData,
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Beklenmeyen hata:', error);
    
    // Hata durumunda varsayılan bir görsel döndür
    return createResponse(200, 
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
      'image/png',
      { 'Cache-Control': 'no-cache' }
    );
  }
};
