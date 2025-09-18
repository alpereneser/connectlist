import { supabaseBrowser } from './supabase-browser';

// API anahtarlarını dışa aktar
const TMDB_LANGUAGE = import.meta.env.VITE_TMDB_LANGUAGE || 'en-US';
const TMDB_ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN || '';
// Support README's API key name as a fallback
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyCEQZ1ri472vtTCiexDsriTKZTIPQoRJkY';
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || GOOGLE_API_KEY;
const NETLIFY_FUNCTION_ENDPOINT = import.meta.env.VITE_NETLIFY_FUNCTION_ENDPOINT || '/.netlify/functions/restaurants';

export { TMDB_LANGUAGE, TMDB_ACCESS_TOKEN, TMDB_API_KEY, RAWG_API_KEY, GOOGLE_BOOKS_API_KEY, NETLIFY_FUNCTION_ENDPOINT, GOOGLE_API_KEY };

// YouTube Music araması (YouTube Data API)
export async function searchYouTubeMusic(query: string) {
  try {
    if (!query || query.trim().length < 2) return [];
    const key = GOOGLE_API_KEY;
    const params = new URLSearchParams({
      key,
      q: query,
      part: 'snippet',
      type: 'video',
      maxResults: '20',
      videoCategoryId: '10' // Music
    });
    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
    const data = await res.json();
    const items = (data.items || []).map((it: any) => ({
      id: it.id?.videoId,
      title: it.snippet?.title,
      image: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url,
      channel: it.snippet?.channelTitle,
      publishedAt: it.snippet?.publishedAt
    })).filter((x: any) => x.id && x.title);
    return items;
  } catch (e) {
    console.error('YouTube music search error:', e);
    return [];
  }
}

// Kitap kapağı için varsayılan görsel URL'si oluştur
function getDefaultBookCover(title: string) {
  // Başlığı URL-safe hale getir ve encode et
  const encodedTitle = encodeURIComponent(title);
  // DiceBear'ın initials servisini kullan
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodedTitle}&backgroundColor=orange`;
}

// Film posteri için varsayılan görsel URL'si oluştur
function getDefaultMoviePoster(title: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}&backgroundColor=red`;
}

// Dizi posteri için varsayılan görsel URL'si oluştur
function getDefaultSeriesPoster(title: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}&backgroundColor=purple`;
}

// Oyun kapağı için varsayılan görsel URL'si oluştur
function getDefaultGameCover(title: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}&backgroundColor=green`;
}

// Kişi avatarı için varsayılan görsel URL'si oluştur
function getDefaultPersonAvatar(name: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=blue`;
}

// Mekan görselleri için varsayılan görsel URL'si oluştur
export function getDefaultPlaceImage(name: string) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=teal`;
}



// Takip işlemleri
export async function followUser(userId: string) {
  if (!userId) {
    console.warn("followUser: Geçersiz kullanıcı ID'si");
    return false;
  }

  try {
    // Önce oturum kontrolü yap
    const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
    if (sessionError) {
      console.error("Oturum bilgisi alınırken hata:", sessionError);
      return false;
    }
    
    const session = sessionData?.session;
    if (!session) {
      console.warn("followUser: Kullanıcı oturumu bulunamadı");
      return false;
    }

    // Kendini takip etmeyi engelle
    if (session.user.id === userId) {
      console.warn("followUser: Kullanıcı kendisini takip edemez");
      return false;
    }

    console.log("Takip işlemi başlatılıyor:", {
      follower_id: session.user.id,
      following_id: userId
    });

    // Önce takip durumunu kontrol et
    const { data: existingFollow, error: checkError } = await supabaseBrowser
      .from('follows')
      .select('*')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn("Takip durumu kontrol edilirken hata:", checkError);
      // Hata olsa bile devam et, en kötü ihtimalle duplicate kayıt hatası alırız
    }

    // Eğer zaten takip ediyorsa, başarılı olarak dön
    if (existingFollow) {
      console.log("Kullanıcı zaten takip ediliyor:", userId);
      // Bildirim yine de gönderilsin
      import('../lib/email-triggers').then(({ triggerFollowerNotification }) => {
        triggerFollowerNotification(userId, session.user.id);
      });
      return true;
    }

    console.log("Takip kaydı oluşturuluyor...");
    
    // Normal yöntemle dene
    const { error } = await supabaseBrowser
      .from('follows')
      .insert({
        follower_id: session.user.id,
        following_id: userId
      });

    if (error) {
      // Duplicate kayıt hatası (23505) olabilir, bu durumda zaten takip ediyoruz demektir
      if (error.code === '23505') {
        console.log("Kullanıcı zaten takip ediliyor (duplicate key):", userId);
        // Bildirim yine de gönderilsin
        import('../lib/email-triggers').then(({ triggerFollowerNotification }) => {
          triggerFollowerNotification(userId, session.user.id);
        });
        return true;
      }
      console.error("Takip edilirken hata:", error.message, error.details, error.hint);
      // Hata durumunda yine de UI'ı güncelle
      console.log("Hata olmasına rağmen takip başarılı kabul ediliyor (UI için)");
      import('../lib/email-triggers').then(({ triggerFollowerNotification }) => {
        triggerFollowerNotification(userId, session.user.id);
      });
      return true;
    }
    
    console.log("Takip işlemi başarılı!");
    // Takip başarılıysa bildirim gönder
    import('../lib/email-triggers').then(({ triggerFollowerNotification }) => {
      triggerFollowerNotification(userId, session.user.id);
    });
    return true;
  } catch (error) {
    console.error("Takip işlemi sırasında beklenmeyen hata:", error);
    // Hata durumunda yine de UI'ı güncelle
    console.log("Hata olmasına rağmen takip başarılı kabul ediliyor (UI için)");
    return true;
  }
}

export async function unfollowUser(userId: string) {
  if (!userId) {
    console.warn("unfollowUser: Geçersiz kullanıcı ID'si");
    return false;
  }

  try {
    // Önce oturum kontrolü yap
    const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
    if (sessionError) {
      console.error("Oturum bilgisi alınırken hata:", sessionError);
      return false;
    }
    
    const session = sessionData?.session;
    if (!session) {
      console.warn("unfollowUser: Kullanıcı oturumu bulunamadı");
      return false;
    }

    // Kendini takipten çıkarmayı engelle
    if (session.user.id === userId) {
      console.warn("unfollowUser: Kullanıcı kendisini takipten çıkaramaz");
      return false;
    }

    console.log("Takipten çıkarma işlemi başlatılıyor:", {
      follower_id: session.user.id,
      following_id: userId
    });

    // Önce takip durumunu kontrol et
    const { data: existingFollow, error: checkError } = await supabaseBrowser
      .from('follows')
      .select('*')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn("Takip durumu kontrol edilirken hata:", checkError);
      // Hata olsa bile devam et
    }

    // Eğer takip etmiyorsa, başarılı olarak dön
    if (!existingFollow) {
      console.log("Kullanıcı zaten takip edilmiyor:", userId);
      return true;
    }

    console.log("Takipten çıkarma işlemi yapılıyor...");
    const { error } = await supabaseBrowser
      .from('follows')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', userId);

    if (error) {
      console.error("Takipten çıkarılırken hata:", error.message, error.details, error.hint);
      // Hata durumunda yine de UI'ı güncelle
      console.log("Hata olmasına rağmen takipten çıkarma başarılı kabul ediliyor (UI için)");
      return true;
    }
    
    console.log("Takipten çıkarma işlemi başarılı!");
    return true;
  } catch (error) {
    console.error("Takipten çıkarma işlemi sırasında beklenmeyen hata:", error);
    // Hata durumunda yine de UI'ı güncelle
    console.log("Hata olmasına rağmen takipten çıkarma başarılı kabul ediliyor (UI için)");
    return true;
  }
}

export async function checkIfFollowing(userId: string) {
  if (!userId) {
    console.warn("checkIfFollowing: Geçersiz kullanıcı ID'si");
    return false;
  }

  try {
    // Önce oturum kontrolü yap
    const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
    if (sessionError) {
      console.error("Oturum bilgisi alınırken hata:", sessionError);
      return false;
    }
    
    const session = sessionData?.session;
    if (!session) {
      console.warn("checkIfFollowing: Kullanıcı oturumu bulunamadı");
      return false;
    }

    // Kendini takip etme durumunu kontrol et
    if (session.user.id === userId) {
      console.warn("checkIfFollowing: Kullanıcı kendisini takip edemez");
      return false;
    }

    console.log("Takip durumu kontrol ediliyor:", {
      follower_id: session.user.id,
      following_id: userId
    });

    const { data, error } = await supabaseBrowser
      .from('follows')
      .select('*')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 hatası "No rows found" anlamına gelir, bu durumda takip etmiyorsunuz
        console.log("Takip durumu: Takip edilmiyor (No rows found)");
        return false;
      } else {
        console.error("Takip durumu kontrol edilirken hata:", error);
        return false;
      }
    }

    console.log("Takip durumu sonucu:", !!data);
    return !!data;
  } catch (error) {
    console.error("Takip durumu kontrol edilirken beklenmeyen hata:", error);
    return false;
  }
}

export async function getFollowers(userId: string) {
  const { data, error } = await supabaseBrowser
    .from('follows')
    .select(`
      follower:profiles!follows_follower_id_fkey (
        id,
        username,
        full_name,
        avatar
      )
    `)
    .eq('following_id', userId);

  if (error) throw error;
  return data.map(item => item.follower);
}

export async function getFollowing(userId: string) {
  const { data, error } = await supabaseBrowser
    .from('follows')
    .select(`
      following:profiles!follows_following_id_fkey (
        id,
        username,
        full_name,
        avatar
      )
    `)
    .eq('follower_id', userId);

  if (error) throw error;
  return data.map(item => item.following);
}

// Kullanıcı arama fonksiyonu
export async function searchUsers(query: string) {
  const { data, error } = await supabaseBrowser
    .from('profiles')
    .select('id, username, full_name, avatar')
    .ilike('full_name', `%${query}%`)
    .limit(5);

  if (error) throw error;
  return data;
}

// Liste arama fonksiyonu
export async function searchLists(query: string) {
  try {
    const { data, error } = await supabaseBrowser
      .from('lists')
      .select(`
        id,
        title,
        description,
        category,
        created_at,
        likes_count,
        items_count,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar
        )
      `)
      .ilike('title', `%${query}%`)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    
    // Veriyi List tipine dönüştür
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      created_at: item.created_at,
      likes_count: item.likes_count,
      items_count: item.items_count,
      profiles: item.profiles
    }));
  } catch (error) {
    console.error('Error searching lists:', error);
    return [];
  }
}

// TMDB API
export async function searchTMDB(query: string, type: string = 'multi') {
  const endpoint = type === 'multi' ? 'multi' : type === 'movie' ? 'movie' : type === 'tv' ? 'tv' : 'person';
  const base = `https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(query)}&language=${TMDB_LANGUAGE}&include_adult=false`;

  // Build headers and URL based on available credentials
  const useBearer = !!TMDB_ACCESS_TOKEN;
  const url = useBearer ? base : (TMDB_API_KEY ? `${base}&api_key=${encodeURIComponent(TMDB_API_KEY)}` : base);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (useBearer) headers['Authorization'] = `Bearer ${TMDB_ACCESS_TOKEN}`;

  if (!useBearer && !TMDB_API_KEY) {
    console.warn('TMDB credentials are missing. Set VITE_TMDB_ACCESS_TOKEN or VITE_TMDB_API_KEY in .env');
  }

  const response = await fetch(url, { headers, mode: 'cors' });
  
  try {
    const data = await response.json();
    // Poster veya profil resmi olmayan içerikleri filtrele
    const filteredResults = (data.results || []).filter((item: {
      media_type: string;
      poster_path: string | null;
      profile_path: string | null;
    }) => {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        return item.poster_path !== null;
      } else if (item.media_type === 'person') {
        return item.profile_path !== null;
      }
      return false;
    });
    return filteredResults;
  } catch (error) {
    console.error('Error parsing TMDB response:', error);
    return [];
  }
}

// RAWG API
export async function searchGames(query: string) {
  try {
    // İngilizce sonuçlar için locale=en-US parametresi eklendi
    const response = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&locale=en-US`,
      {
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      }
    );
    
    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    return [];
  }
}

// Google Books API
export async function searchBooks(query: string) {
  try {
    // Arama sorgusu boş ise boş dizi döndür
    if (!query.trim()) {
      return [];
    }

    // Arama sorgusu için maksimum sonuç sayısını belirle
    const maxResults = 20;
    
    // API çağrısını yap - İngilizce sonuçlar için langRestrict=en parametresi eklendi
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&langRestrict=en&key=${GOOGLE_BOOKS_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // API yanıtında items yoksa boş dizi döndür
    if (!data.items || !Array.isArray(data.items)) {
      console.log('Google Books API sonuç bulunamadı:', data);
      return [];
    }
    
    // Kitapları işle ve döndür
    return data.items.map((item: {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        imageLinks?: {
          thumbnail?: string;
        };
        categories?: string[];
      }
    } | null) => {
      if (!item || !item.volumeInfo) {
        console.warn('Geçersiz kitap verisi:', item);
        return null;
      }
      
      // Kitap bilgilerini al
      const volumeInfo = item.volumeInfo;
      
      // Resim URL'sini güvenli bir şekilde al
      if (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) {
        // HTTP URL'lerini HTTPS'e dönüştür
        if (volumeInfo.imageLinks.thumbnail.startsWith('http:')) {
          volumeInfo.imageLinks.thumbnail = volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
        }
      } else {
        // Resim yoksa, varsayılan bir resim ekle
        if (!volumeInfo.imageLinks) {
          volumeInfo.imageLinks = {};
        }
        volumeInfo.imageLinks.thumbnail = getDefaultBookCover(volumeInfo.title || 'İsimsiz Kitap');
      }
      
      // Kitap nesnesini olduğu gibi döndür
      return item;
    }).filter((item: {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        imageLinks?: {
          thumbnail?: string;
        };
        categories?: string[];
      }
    } | null) => item !== null);
  } catch (error: unknown) {
    console.error('Google Books API hatası:', error);
    return [];
  }
}

// Google Places API Fonksiyonları (Netlify Proxy üzerinden)
export async function searchGooglePlaces(query: string, language: string = 'tr', otherParams: Record<string, string> = {}) {
  const params = new URLSearchParams({
    endpoint: 'textsearch',
    query: query,
    language: language,
    ...otherParams
  });
  const response = await fetch(`${NETLIFY_FUNCTION_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch places and could not parse error' }));
    console.error("Error searching places:", errorData);
    throw new Error(errorData.message || 'Failed to fetch places');
  }
  return response.json();
}

export async function getGooglePlaceDetails(placeId: string, fields: string, language: string = 'tr', sessiontoken?: string) {
  const params = new URLSearchParams({
    endpoint: 'details',
    place_id: placeId,
    fields: fields,
    language: language,
  });
  if (sessiontoken) {
    params.append('sessiontoken', sessiontoken);
  }
  const response = await fetch(`${NETLIFY_FUNCTION_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch place details and could not parse error' }));
    console.error("Error fetching place details:", errorData);
    throw new Error(errorData.message || 'Failed to fetch place details');
  }
  return response.json();
}

export async function getGooglePlaceAutocomplete(input: string, language: string = 'tr', otherParams: Record<string, string> = {}) {
  const params = new URLSearchParams({
    endpoint: 'autocomplete',
    input: input,
    language: language,
    ...otherParams
  });
  const response = await fetch(`${NETLIFY_FUNCTION_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch place autocomplete and could not parse error' }));
    console.error("Error fetching place autocomplete:", errorData);
    throw new Error(errorData.message || 'Failed to fetch place autocomplete');
  }
  return response.json();
}

// Details API functions
export async function getMovieDetails(id: string) {
  try {
    // First try to get from database
    const { data: existingMovie, error: dbError } = await supabaseBrowser
      .from('movie_details')
      .select('*')
      .eq('id', id)
      .single();

    if (!dbError && existingMovie) {
      return existingMovie;
    }

    // If not in database, fetch from TMDB API and save
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?append_to_response=credits&language=${TMDB_LANGUAGE}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch from TMDB API');
    }
    
    const movieData = await response.json();

    // Save to database
    const { data: savedMovie, error: saveError } = await supabaseBrowser
      .from('movie_details')
      .insert({
        id: movieData.id.toString(),
        title: movieData.title,
        overview: movieData.overview,
        poster_path: movieData.poster_path || getDefaultMoviePoster(movieData.title),
        backdrop_path: movieData.backdrop_path,
        release_date: movieData.release_date,
        runtime: movieData.runtime,
        vote_average: movieData.vote_average,
        vote_count: movieData.vote_count,
        genres: movieData.genres,
        cast_members: movieData.credits.cast,
        crew_members: movieData.credits.crew
      })
      .select()
      .single();

    if (saveError) throw saveError;
    return savedMovie;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
}

export async function getSeriesDetails(id: string) {
  try {
    // First try to get from database
    const { data: existingSeries, error: dbError } = await supabaseBrowser
      .from('series_details')
      .select('*')
      .eq('id', id)
      .single();

    if (!dbError && existingSeries) {
      return existingSeries;
    }

    // If not in database, fetch from TMDB API and save
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?append_to_response=credits&language=${TMDB_LANGUAGE}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch from TMDB API');
    }
    
    const seriesData = await response.json();

    // Save to database
    const { data: savedSeries, error: saveError } = await supabaseBrowser
      .from('series_details')
      .insert({
        id: seriesData.id.toString(),
        title: seriesData.name,
        overview: seriesData.overview,
        poster_path: seriesData.poster_path || getDefaultSeriesPoster(seriesData.name),
        backdrop_path: seriesData.backdrop_path,
        first_air_date: seriesData.first_air_date,
        last_air_date: seriesData.last_air_date,
        number_of_seasons: seriesData.number_of_seasons,
        number_of_episodes: seriesData.number_of_episodes,
        vote_average: seriesData.vote_average,
        vote_count: seriesData.vote_count,
        genres: seriesData.genres,
        cast_members: seriesData.credits.cast,
        crew_members: seriesData.credits.crew,
        seasons: seriesData.seasons
      })
      .select()
      .single();

    if (saveError) throw saveError;
    return savedSeries;
  } catch (error) {
    console.error('Error fetching series details:', error);
    throw error;
  }
}

export async function getGameDetails(id: string) {
  try {
    // First try to get from database with upsert approach
    const { data: existingGame, error: fetchError } = await supabaseBrowser
      .from('game_details')
      .select('*')
      .eq('id', id)
      .single();

    if (!fetchError && existingGame) {
      return existingGame;
    }

    // If not in database, fetch from RAWG API
    const response = await fetch(
      `https://api.rawg.io/api/games/${id}?key=${RAWG_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch from RAWG API');
    }
    
    const gameData = await response.json();

    try {
      // Upsert to database - RLS politikasını ihlal ediyorsa, sessizce devam et
      const { data: savedGame, error: upsertError } = await supabaseBrowser
        .from('game_details')
        .upsert({
          id: gameData.id.toString(),
          name: gameData.name,
          description: gameData.description_raw || gameData.description,
          released: gameData.released || null,
          background_image: gameData.background_image || getDefaultGameCover(gameData.name),
          metacritic: gameData.metacritic,
          rating: gameData.rating,
          ratings_count: gameData.ratings_count,
          platforms: gameData.platforms || [],
          genres: gameData.genres || [],
          developers: gameData.developers || [],
          publishers: gameData.publishers || [],
          esrb_rating: gameData.esrb_rating?.name
        })
        .select()
        .single();

      if (!upsertError && savedGame) {
        return savedGame;
      }
    } catch (upsertError) {
      // Veritabanına kaydetme hatası olursa, API'den gelen veriyi doğrudan döndür
      console.warn('Oyun detayları veritabanına kaydedilemedi, API verisi kullanılıyor:', upsertError);
    }

    // Veritabanına kaydetme başarısız olsa bile, API'den gelen veriyi kullan
    return {
      id: gameData.id.toString(),
      name: gameData.name,
      description: gameData.description_raw || gameData.description,
      released: gameData.released || null,
      background_image: gameData.background_image || getDefaultGameCover(gameData.name),
      metacritic: gameData.metacritic,
      rating: gameData.rating,
      ratings_count: gameData.ratings_count,
      platforms: gameData.platforms || [],
      genres: gameData.genres || [],
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
      esrb_rating: gameData.esrb_rating?.name
    };
  } catch (error) {
    console.error('Error fetching game details:', error);
    throw error;
  }
}

export async function getPersonDetails(id: string) {
  try {
    // First try to get from database
    const { data: existingPerson } = await supabaseBrowser
      .from('person_details')
      .select('*')
      .eq('id', id)
      .single();

    if (existingPerson) {
      return existingPerson;
    }

    // If not in database, fetch from TMDB API and save
    const response = await fetch(
      `https://api.themoviedb.org/3/person/${id}?append_to_response=movie_credits,tv_credits&language=${TMDB_LANGUAGE}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const personData = await response.json();

    // Save to database
    const { data: savedPerson, error: saveError } = await supabaseBrowser
      .from('person_details')
      .insert({
        id: personData.id.toString(),
        name: personData.name,
        biography: personData.biography,
        birthday: personData.birthday,
        deathday: personData.deathday,
        place_of_birth: personData.place_of_birth,
        profile_path: personData.profile_path || getDefaultPersonAvatar(personData.name),
        known_for_department: personData.known_for_department,
        also_known_as: personData.also_known_as,
        movie_credits: personData.movie_credits,
        tv_credits: personData.tv_credits
      })
      .select()
      .single();

    if (saveError) throw saveError;
    return savedPerson;
  } catch (error) {
    console.error('Error fetching person details:', error);
    throw error;
  }
}

export async function getBookDetails(id: string) {
  try {
    // First try to get from database
    const { data: existingBook } = await supabaseBrowser
      .from('book_details')
      .select('*')
      .eq('id', id)
      .single();

    if (existingBook) {
      return existingBook;
    }

    // If not in database, fetch from Google Books API and save
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${id}?key=${GOOGLE_BOOKS_API_KEY}`
    );
    const bookData = await response.json();

    // Save to database
    const { data: savedBook, error: saveError } = await supabaseBrowser
      .from('book_details')
      .insert({
        id: bookData.id,
        title: bookData.volumeInfo.title,
        image_links: {
          thumbnail: bookData.volumeInfo.imageLinks?.thumbnail || getDefaultBookCover(bookData.volumeInfo.title),
          small: bookData.volumeInfo.imageLinks?.small || getDefaultBookCover(bookData.volumeInfo.title),
          medium: bookData.volumeInfo.imageLinks?.medium || getDefaultBookCover(bookData.volumeInfo.title),
          large: bookData.volumeInfo.imageLinks?.large || getDefaultBookCover(bookData.volumeInfo.title)
        },
        authors: bookData.volumeInfo.authors,
        publisher: bookData.volumeInfo.publisher,
        published_date: bookData.volumeInfo.publishedDate || null,
        description: bookData.volumeInfo.description,
        page_count: bookData.volumeInfo.pageCount,
        categories: bookData.volumeInfo.categories,
        language: bookData.volumeInfo.language,
        preview_link: bookData.volumeInfo.previewLink,
        info_link: bookData.volumeInfo.infoLink
      })
      .select()
      .single();

    if (saveError) throw saveError;
    return savedBook;
  } catch (error) {
    console.error('Error fetching book details:', error);
    throw error;
  }
}
// Liste API functions
export async function createList(data: {
  title: string;
  description: string;
  category: string;
  items: Array<{
    external_id: string;
    title: string;
    image_url: string;
    type: string;
    year?: string;
    description?: string;
  }>;
}) {
  // Tarayıcı ortamında supabaseBrowser kullan
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  
  if (!session) {
    throw new Error('Oturum bulunamadı');
  }

  const { data: list, error: listError } = await supabaseBrowser
    .from('lists')
    .insert({
      title: data.title,
      description: data.description || '',
      category: data.category,
      user_id: session.user.id,
    })
    .select()
    .single();

  if (listError) throw listError;

  const items = data.items.map((item, index) => ({
    list_id: list.id,
    external_id: item.external_id,
    title: item.title,
    image_url: item.image_url,
    type: item.type,
    year: item.year,
    description: item.description,
    position: index + 1,
  }));

  const { error: itemsError } = await supabaseBrowser
    .from('list_items')
    .insert(items);

  if (itemsError) throw itemsError;

  return list;
}

export async function getListDetails(id: string) {
  const [{ data: list, error: listError }, { data: items, error: itemsError }] = await Promise.all([
    supabaseBrowser
      .from('lists')
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar
        )
      `)
      .eq('id', id)
      .single(),
    supabaseBrowser
      .from('list_items')
      .select('*')
      .eq('list_id', id)
      .order('position')
  ]);

  if (listError) throw listError;
  if (itemsError) throw itemsError;

  return { list, items };
}

export async function updateList(id: string, data: {
  title: string;
  description: string;
  items: Array<{
    external_id: string;
    title: string;
    image_url: string;
    type: string;
    year?: string;
    description?: string;
  }>;
}) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  
  if (!session) {
    throw new Error('Oturum bulunamadı');
  }

  // Önce liste bilgilerini güncelle ve öğe sayısını güncelle
  const { error: listError } = await supabaseBrowser
    .from('lists')
    .update({
      title: data.title,
      description: data.description,
      items_count: data.items.length, // Öğe sayısını güncelle
      updated_at: new Date().toISOString() // Güncelleme tarihini yenile
    })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (listError) throw listError;

  // Mevcut liste öğelerini sil
  const { error: deleteError } = await supabaseBrowser
    .from('list_items')
    .delete()
    .eq('list_id', id);

  if (deleteError) throw deleteError;

  // Tüm öğeleri ekle (yeni eklenenler dahil)
  const items = data.items.map((item, index) => ({
    list_id: id,
    external_id: item.external_id,
    title: item.title,
    image_url: item.image_url,
    type: item.type,
    year: item.year,
    description: item.description,
    position: index + 1,
  }));

  const { error: itemsError } = await supabaseBrowser
    .from('list_items')
    .insert(items);

  if (itemsError) throw itemsError;

  return { success: true };
}

export async function deleteList(id: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  
  if (!session) {
    throw new Error('Oturum bulunamadı');
  }

  // Önce liste öğelerini sil
  const { error: itemsError } = await supabaseBrowser
    .from('list_items')
    .delete()
    .eq('list_id', id);

  if (itemsError) throw itemsError;

  // Sonra listeyi sil
  const { error: listError } = await supabaseBrowser
    .from('lists')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (listError) throw listError;

  return { success: true };
}

export async function likeList(listId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { error } = await supabaseBrowser
    .from('list_likes')
    .insert({
      list_id: listId,
      user_id: session.user.id
    });

  if (error) throw error;
}

// Ülkeler listesi
export const countries = [
  { code: 'TR', name: 'Türkiye' },
  { code: 'US', name: 'Amerika Birleşik Devletleri' },
  { code: 'GB', name: 'Birleşik Krallık' },
  { code: 'DE', name: 'Almanya' },
  { code: 'FR', name: 'Fransa' },
  { code: 'IT', name: 'İtalya' },
  { code: 'ES', name: 'İspanya' },
  { code: 'NL', name: 'Hollanda' },
  { code: 'RU', name: 'Rusya' },
  { code: 'JP', name: 'Japonya' },
  { code: 'CN', name: 'Çin' },
  { code: 'IN', name: 'Hindistan' },
  { code: 'BR', name: 'Brezilya' },
  { code: 'CA', name: 'Kanada' },
  { code: 'AU', name: 'Avustralya' },
];

// Şehirleri getiren fonksiyon
export const getCitiesByCountry = async (countryCode: string): Promise<{ name: string }[]> => {
  try {
    // Ülkeye göre popüler şehirleri döndür
    const citiesByCountry: Record<string, { name: string }[]> = {
      'TR': [
        { name: 'İstanbul' },
        { name: 'Ankara' },
        { name: 'İzmir' },
        { name: 'Antalya' },
        { name: 'Bursa' },
        { name: 'Adana' },
      ],
      'US': [
        { name: 'New York' },
        { name: 'Los Angeles' },
        { name: 'Chicago' },
        { name: 'Houston' },
        { name: 'Phoenix' },
        { name: 'Philadelphia' },
      ],
      'GB': [
        { name: 'London' },
        { name: 'Birmingham' },
        { name: 'Manchester' },
        { name: 'Glasgow' },
        { name: 'Liverpool' },
        { name: 'Edinburgh' },
      ],
      'DE': [
        { name: 'Berlin' },
        { name: 'Hamburg' },
        { name: 'Munich' },
        { name: 'Cologne' },
        { name: 'Frankfurt' },
        { name: 'Stuttgart' },
      ],
      'FR': [
        { name: 'Paris' },
        { name: 'Marseille' },
        { name: 'Lyon' },
        { name: 'Toulouse' },
        { name: 'Nice' },
        { name: 'Nantes' },
      ],
      'RU': [
        { name: 'Moscow' },
        { name: 'Saint Petersburg' },
        { name: 'Novosibirsk' },
        { name: 'Yekaterinburg' },
        { name: 'Kazan' },
        { name: 'Nizhny Novgorod' },
      ],
      'JP': [
        { name: 'Tokyo' },
        { name: 'Osaka' },
        { name: 'Kyoto' },
        { name: 'Yokohama' },
        { name: 'Nagoya' },
        { name: 'Sapporo' },
      ],
      'CN': [
        { name: 'Beijing' },
        { name: 'Shanghai' },
        { name: 'Guangzhou' },
        { name: 'Shenzhen' },
        { name: 'Chengdu' },
        { name: 'Hangzhou' },
      ],
      'IN': [
        { name: 'Mumbai' },
        { name: 'Delhi' },
        { name: 'Bangalore' },
        { name: 'Hyderabad' },
        { name: 'Chennai' },
        { name: 'Kolkata' },
      ],
      'BR': [
        { name: 'São Paulo' },
        { name: 'Rio de Janeiro' },
        { name: 'Brasília' },
        { name: 'Salvador' },
        { name: 'Fortaleza' },
        { name: 'Belo Horizonte' },
      ],
      'CA': [
        { name: 'Toronto' },
        { name: 'Montreal' },
        { name: 'Vancouver' },
        { name: 'Calgary' },
        { name: 'Edmonton' },
        { name: 'Ottawa' },
      ],
      'AU': [
        { name: 'Sydney' },
        { name: 'Melbourne' },
        { name: 'Brisbane' },
        { name: 'Perth' },
        { name: 'Adelaide' },
        { name: 'Gold Coast' },
      ],
      'IT': [
        { name: 'Rome' },
        { name: 'Milan' },
        { name: 'Naples' },
        { name: 'Turin' },
        { name: 'Palermo' },
        { name: 'Genoa' },
      ],
      'ES': [
        { name: 'Madrid' },
        { name: 'Barcelona' },
        { name: 'Valencia' },
        { name: 'Seville' },
        { name: 'Zaragoza' },
        { name: 'Málaga' },
      ],
      'NL': [
        { name: 'Amsterdam' },
        { name: 'Rotterdam' },
        { name: 'The Hague' },
        { name: 'Utrecht' },
        { name: 'Eindhoven' },
        { name: 'Tilburg' },
      ],
    };

    return citiesByCountry[countryCode] || [];
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
};

export async function unlikeList(listId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { error } = await supabaseBrowser
    .from('list_likes')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

export async function checkIfLiked(listId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) return false;

  const { data } = await supabaseBrowser
    .from('list_likes')
    .select('*')
    .eq('list_id', listId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  return !!data;
}

export async function getLists(category?: string, page: number = 0, limit: number = 5, sortDirection: 'asc' | 'desc' = 'desc') {
  console.log(`[api.ts] getLists called with: category='${category}', page=${page}, limit=${limit}, sortDirection='${sortDirection}'`);
  let query = supabaseBrowser
    .from('lists')
    .select(`
      *,
      profiles:user_id (
        username,
        full_name,
        avatar
      )
    `);
  
  const ascending = sortDirection === 'asc';
  // Sıralama yönüne göre sırala: updated_at öncelikli, sonra created_at ve id aynı yönde
  query = query.order('updated_at', { ascending }).order('created_at', { ascending }).order('id', { ascending });
  
  if (category) {
    // Kategori filtrelemesi yap
    // Tüm kategoriler için doğru filtreleme yap
    query = query.eq('category', category);
  }

  // Sadece public listeleri göster
  query = query.eq('is_public', true);

  // Sayfalama: order ve filtrelerden sonra uygulansın
  query = query.range(page * limit, (page + 1) * limit - 1);

  const { data: lists, error: listsError } = await query;
  console.log(`[api.ts] Supabase query returned ${lists ? lists.length : 0} lists for category '${category}', page ${page}. Raw data:`, lists);

  if (listsError) throw listsError;
  if (!lists || lists.length === 0) return [];

  const listIds = lists.map(list => list.id);

  if (listIds.length === 0) return lists;

  const { data: items, error: itemsError } = await supabaseBrowser
    .from('list_items')
    .select('*')
    .in('list_id', listIds)
    .order('position');

  if (itemsError) throw itemsError;
  if (!items) return lists.map(list => ({ ...list, items: [] }));

  // Her liste için öğeleri grupla
  const itemsByList = items.reduce((acc, item) => {
    if (!acc[item.list_id]) {
      acc[item.list_id] = [];
    }
    acc[item.list_id].push(item);
    return acc;
  }, {});

  return lists.map(list => ({
    ...list,
    items: itemsByList[list.id] || []
  }));
}

export async function getUserLists(userId: string, page: number = 0, limit: number = 10) {
  const start = page * limit;
  const end = start + limit - 1;

  const { data: lists, error: listsError } = await supabaseBrowser
    .from('lists')
    .select(`
      *,
      profiles:user_id (
        username,
        full_name,
        avatar
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (listsError) throw listsError;

  const listIds = lists.map(list => list.id);
  const { data: items, error: itemsError } = await supabaseBrowser
    .from('list_items')
    .select('*')
    .in('list_id', listIds)
    .order('position');

  if (itemsError) throw itemsError;

  const itemsByList = items.reduce((acc, item) => {
    if (!acc[item.list_id]) {
      acc[item.list_id] = [];
    }
    acc[item.list_id].push(item);
    return acc;
  }, {});

  return lists.map(list => ({
    ...list,
    items: itemsByList[list.id] || []
  }));
}

// Mekan araması yap (Google Places API - Text Search New)
export async function searchPlaces(query: string, language: string = 'tr') {
  try {
    console.log('Google Places API ile mekan araması yapılıyor:', query, 'Dil:', language);
    
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyCEQZ1ri472vtTCiexDsriTKZTIPQoRJkY',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.addressComponents'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: language,
        maxResultCount: 20
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error [searchPlaces]: ${response.status}`, errorText);
      throw new Error(`Google Places API error [searchPlaces]: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Google Places API yanıtı [searchPlaces]:', data);

    if (!data.places || !Array.isArray(data.places)) {
      console.log('No places found in Google Places API response [searchPlaces]:', data);
      return [];
    }

    return data.places.map((place: any) => {
      // Google Places API'den fotoğraf URL'i oluştur
      let imageUrl = getDefaultPlaceImage(place.displayName?.text || place.name || 'Place');
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        imageUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyCEQZ1ri472vtTCiexDsriTKZTIPQoRJkY'}`;
      }
      
      let city = '';
      let country = '';
      
      // Google Places API address components'tan şehir ve ülke bilgisini al
      if (place.addressComponents) {
        const cityComponent = place.addressComponents.find((c: any) => 
          c.types.includes('locality') || c.types.includes('administrative_area_level_2')
        );
        if (cityComponent) city = cityComponent.longText;
        
        const countryComponent = place.addressComponents.find((c: any) => c.types.includes('country'));
        if (countryComponent) country = countryComponent.longText;
      }
      
      // Eğer şehir bilgisi yoksa formatted_address'ten çıkarmaya çalış
      if (!city && place.formattedAddress) {
        const parts = place.formattedAddress.split(',');
        if (parts.length >= 2) {
          city = parts[parts.length - 2].trim();
        }
        if (!country && parts.length >= 1) {
          country = parts[parts.length - 1].trim();
        }
      }

      return {
        id: place.id,
        name: place.displayName?.text || place.name || 'Unknown Place',
        address: place.formattedAddress || '',
        city: city,
        country: country,
        image: imageUrl,
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        rating: place.rating || 0,
        user_ratings_total: place.userRatingCount || 0,
        description: place.types ? place.types.join(', ') : undefined
      };
    });
  } catch (error) {
    console.error('Error searching places via Google Places API:', error);
    return [];
  }
}

// Mekan detaylarını getir (Google Places API - Place Details)
export async function getPlaceDetails(placeId: string, language: string = 'tr') {
  try {
    const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key is not configured');
      return null;
    }

    const fields = 'place_id,name,formatted_address,address_components,geometry,vicinity,photos,rating,user_ratings_total,types,url,opening_hours,website,formatted_phone_number';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=${language}&key=${GOOGLE_PLACES_API_KEY}`;

    console.log('Google Places API ile mekan detayları getiriliyor:', placeId, 'Dil:', language);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error [getPlaceDetails]: ${response.status}`, errorText);
      throw new Error(`Google Places API error [getPlaceDetails]: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Google Places API yanıtı [getPlaceDetails]:', data);

    if (data.status !== 'OK') {
      console.error('Unexpected Google Places API response status [getPlaceDetails]:', data.status, data.error_message);
      return null;
    }

    const place = data.result;
    if (!place) {
      console.error('No result found in Google Places API response [getPlaceDetails]:', data);
      return null;
    }

    // Google Places API fotoğraf URL'lerini oluştur
    const photoUrls = place.photos?.map((photo: any) => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
    ) || [];

    let city = '';
    let country = '';
    if (place.address_components) {
      const cityComponent = place.address_components.find((c: any) => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
      if (cityComponent) city = cityComponent.long_name;
      const countryComponent = place.address_components.find((c: any) => c.types.includes('country'));
      if (countryComponent) country = countryComponent.long_name;
    }
    if (!city && place.formatted_address){
        const parts = place.formatted_address.split(',');
        if(parts.length >=2 && parts[parts.length-2]) city = parts[parts.length-2].trim();
        if(parts.length >=1 && !country && parts[parts.length-1]) country = parts[parts.length-1].trim();
    }

    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || '',
      city: city,
      country: country,
      image: photoUrls.length > 0 ? photoUrls[0] : getDefaultPlaceImage(place.name),
      photos: photoUrls,
      latitude: place.geometry?.location?.lat,
      longitude: place.geometry?.location?.lng,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types || [],
      url: place.url, // Google Maps URL'i
      opening_hours: place.opening_hours?.weekday_text, // Haftalık çalışma saatleri
      website: place.website,
      phone: place.formatted_phone_number,
      description: place.editorial_summary?.overview || (place.types ? place.types.join(', ') : undefined)
      // Diğer detaylar eklenebilir: reviews, price_level vb.
    };

  } catch (error) {
    console.error('Error fetching place details via Google Places (Netlify Proxy):', error);
    return null; // Hata durumunda null döndür
  }
}

// YouTube URL'den video ID'sini çıkarır
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Eğer sadece video ID verilmişse
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return url;
  }
  
  return null;
}

// YouTube video detaylarını getirir
export async function getVideoDetails(input: string) {
  try {
    // URL'den video ID'sini çıkar
    const videoId = extractVideoId(input);
    if (!videoId) {
      throw new Error('Geçersiz YouTube video ID\'si');
    }

    // Önce oEmbed API'sini kullan (API anahtarı gerektirmez)
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!oembedResponse.ok) {
      if (oembedResponse.status === 404) {
        throw new Error('Video bulunamadı');
      } else if (oembedResponse.status === 401 || oembedResponse.status === 403) {
        throw new Error('Video özel veya erişime kapalı');
      } else {
        throw new Error('Video detayları alınamadı');
      }
    }

    const oembedData = await oembedResponse.json();

    return {
      id: videoId,
      title: oembedData.title,
      description: oembedData.author_name,
      publishedAt: new Date().toISOString(),
      channelTitle: oembedData.author_name,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Video detayları alınamadı');
  }
}

// Bildirim işlemleri
export async function markAllNotificationsAsRead() {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { error } = await supabaseBrowser.rpc('mark_notifications_as_read', {
    user_id_param: session.user.id
  });

  if (error) throw error;
  return true;
}

export async function markNotificationAsRead(notificationId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { error } = await supabaseBrowser.rpc('mark_notification_as_read', {
    notification_id_param: notificationId
  });

  if (error) throw error;
  return true;
}

export async function deleteNotification(notificationId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { error } = await supabaseBrowser.rpc('delete_notification', {
    notification_id_param: notificationId
  });

  if (error) throw error;
  return true;
}

export async function deleteAllNotifications() {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { error } = await supabaseBrowser.rpc('delete_all_notifications');

  if (error) throw error;
  return true;
}

// Mesajlaşma işlemleri
export async function checkMutualFollow(userId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) return false;

  const { data, error } = await supabaseBrowser.rpc('are_mutual_followers', {
    user1_id: session.user.id,
    user2_id: userId
  });

  if (error) {
    console.error('Error checking mutual follow:', error);
    return false;
  }

  return data;
}

export async function startConversation(userId: string) {
  try {
    const { data, error } = await supabaseBrowser.rpc('start_conversation', { user2_id: userId });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Konuşma başlatma hatası:', error);
    throw error;
  }
}

export async function markMessagesAsRead(conversationId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { data: messages, error } = await supabaseBrowser.rpc('mark_messages_as_read', {
    conversation_id_param: conversationId
  });

  if (error) {
    console.error('Error marking messages as read:', error);
    throw new Error('Mesajlar okundu olarak işaretlenirken bir hata oluştu');
  }

  return messages;
}

export async function sendMessage(conversationId: string, text: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  try {
    // Mesajı ekleyelim ve ID'sini alalım
    const { data: insertedMessage, error: insertError } = await supabaseBrowser
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        text: text,
        encrypted_text: text, // Şifrelemesiz basit metin
        encryption_key_id: null, // Şifrelemesiz
        is_read: false
      })
      .select('id, created_at, sender_id, text, is_read')
      .single();

    if (insertError) {
      console.error('Mesaj eklenirken hata:', insertError);
      throw insertError;
    }

    if (!insertedMessage) {
      throw new Error('Mesaj eklenemedi');
    }

    // Konuşmayı güncelle
    const { error: updateError } = await supabaseBrowser
      .from('conversations')
      .update({
        last_message_text: text,
        last_message_at: insertedMessage.created_at
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Konuşma güncellenirken hata:', updateError);
      throw updateError;
    }

    return insertedMessage;

  } catch (error) {
    console.error('Mesaj gönderilirken hata:', error);
    throw error;
  }
}

export async function deleteMessage(messageId: string) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  try {
  const { data: msg, error: fetchError } = await supabaseBrowser
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (fetchError) throw fetchError;
  if (!msg) throw new Error('Mesaj bulunamadı');

  // Yalnızca kendi mesajını silebilirsin
  if (msg.sender_id !== session.user.id) {
    throw new Error('Yalnızca kendi mesajlarınızı silebilirsiniz');
  }

  // Mesajı sil
  const { error: deleteError } = await supabaseBrowser
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', session.user.id);

  if (deleteError) throw deleteError;

  // Konuşmanın son mesajını güncelle
  const { data: lastMessages, error: lastErr } = await supabaseBrowser
    .from('messages')
    .select('text, created_at')
    .eq('conversation_id', msg.conversation_id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (lastErr) throw lastErr;

  const latest = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null;

  const { error: convUpdateErr } = await supabaseBrowser
    .from('conversations')
    .update({
      last_message_text: latest ? latest.text : null,
      last_message_at: latest ? latest.created_at : null
    })
    .eq('id', msg.conversation_id);

  if (convUpdateErr) throw convUpdateErr;

  return true;
} catch (error) {
  console.error('Mesaj silinirken hata:', error);
  throw error;
}
}
