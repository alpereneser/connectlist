import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import fetch from 'node-fetch'; // node-fetch'i projenize eklemeniz gerekebilir: npm install node-fetch

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Google Places API key is not configured." }),
    };
  }

  // Client'tan gelen query parametrelerini alalım
  // Örneğin, client şöyle bir istek yapabilir: /.netlify/functions/google-places-proxy?endpoint=textsearch&query=restaurants+in+Istanbul
  const params = event.queryStringParameters;

  if (!params || !params.endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'endpoint' query parameter." }),
    };
  }

  const googleApiEndpoint = params.endpoint; // örn: 'textsearch', 'details', 'autocomplete'
  let apiUrl = '';

  // Google Places API'nin farklı endpoint'lerine göre URL oluştur
  // Güvenlik ve esneklik için bunu daha iyi yönetmek gerekebilir.
  // Şimdilik sadece textsearch ve details için basit bir örnek:
  if (googleApiEndpoint === 'textsearch' && params.query) {
    apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(params.query)}&key=${GOOGLE_PLACES_API_KEY}`;
    if (params.language) {
      apiUrl += `&language=${params.language}`;
    }
    // Diğer textsearch parametrelerini (location, radius, type vb.) de buraya ekleyebilirsiniz.
    // Örneğin: params.location, params.radius, params.type
    // if (params.location) apiUrl += `&location=${params.location}`;
    // if (params.radius) apiUrl += `&radius=${params.radius}`;
    // if (params.type) apiUrl += `&type=${params.type}`;

  } else if (googleApiEndpoint === 'details' && params.place_id) {
    apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${params.place_id}&key=${GOOGLE_PLACES_API_KEY}`;
    if (params.fields) {
      apiUrl += `&fields=${encodeURIComponent(params.fields)}`;
    }
    if (params.language) {
      apiUrl += `&language=${params.language}`;
    }
    // Oturum belirteci (session token) kullanıyorsanız, onu da ekleyin
    // if (params.sessiontoken) apiUrl += `&sessiontoken=${params.sessiontoken}`;

  } else if (googleApiEndpoint === 'autocomplete' && params.input) {
    apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(params.input)}&key=${GOOGLE_PLACES_API_KEY}`;
    if (params.types) apiUrl += `&types=${params.types}`;
    if (params.language) apiUrl += `&language=${params.language}`;
    if (params.location) apiUrl += `&location=${params.location}`;
    if (params.radius) apiUrl += `&radius=${params.radius}`;
    // Oturum belirteci (session token) kullanıyorsanız, onu da ekleyin
    // if (params.sessiontoken) apiUrl += `&sessiontoken=${params.sessiontoken}`;
  
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid or unsupported 'endpoint' or missing required parameters." }),
    };
  }
  
  // Client'tan gelen diğer tüm query parametrelerini Google API URL'sine ekleyelim
  // (endpoint, query, place_id, fields, language, input, types, location, radius hariç, çünkü onları yukarıda özel olarak ele aldık)
  Object.keys(params).forEach(key => {
    if (!['endpoint', 'query', 'place_id', 'fields', 'language', 'input', 'types', 'location', 'radius', 'key'].includes(key) && params[key]) {
      apiUrl += `&${key}=${encodeURIComponent(params[key]!)}`;
    }
  });


  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        // Önbellekleme başlıklarını burada ayarlayabilirsiniz (bir sonraki adım)
        // "Cache-Control": "public, max-age=3600" // Örnek: 1 saat önbellekle
      },
    };
  } catch (error) {
    console.error("Error fetching from Google Places API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch data from Google Places API." }),
    };
  }
};

export { handler };
