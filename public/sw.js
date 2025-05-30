// Cache sürüm kontrolü
const CACHE_VERSION = 'v1.0.3';
const CACHE_NAME = `connectlist-${CACHE_VERSION}`;
const METHODS_TO_CACHE = ['GET', 'HEAD'];

// Son güncelleme zamanı - her deploy'da bu değeri güncelle
const LAST_UPDATE_TIME = '2025-04-09T15:12:04+03:00';

// Önbelleğe alınacak kaynaklar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js',
  'https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/favicon.png',
  'https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/connectlist-beta-logo.png'
];

// API istekleri için önbellek stratejisi
const API_CACHE_NAME = `${CACHE_NAME}-api`;
const API_CACHE_DURATION = 60 * 60 * 1000; // 1 saat
const SUPABASE_URL = 'ynbwiarxodetyirhmcbp.supabase.co';

// Service Worker Kurulumu
self.addEventListener('install', event => {
  console.log(`Yeni sürüm yükleniyor: ${CACHE_VERSION} (${LAST_UPDATE_TIME})`);
  event.waitUntil(
    Promise.all([
      // Tüm eski önbellekleri temizle
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('connectlist-') && cacheName !== CACHE_NAME) {
              console.log(`Eski önbellek siliniyor: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Yeni önbelleği oluştur
      caches.open(CACHE_NAME).then(cache => {
        console.log(`Yeni önbellek oluşturuluyor: ${CACHE_NAME}`);
        return cache.addAll(STATIC_ASSETS);
      })
    ])
    .then(() => {
      console.log('Yeni service worker hemen aktif ediliyor');
      return self.skipWaiting();
    })
  );
});

// Service Worker Aktivasyonu
self.addEventListener('activate', event => {
  console.log(`Service worker aktif ediliyor: ${CACHE_VERSION}`);
  event.waitUntil(
    Promise.all([
      // Sadece eski önbellekleri temizle, güncel olanı koru
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('connectlist-') && cacheName !== CACHE_NAME) {
              console.log(`Eski önbellek siliniyor: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Yeni sürüm bildirimini göster
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NEW_VERSION',
            version: CACHE_VERSION,
            updateTime: LAST_UPDATE_TIME
          });
        });
      }),
      // Tüm istemcilerde yeni Service Worker'ı aktifleştir
      self.clients.claim()
    ])
  );
});

// Network First, Cache Fallback Stratejisi
async function networkFirstThenCache(request) {
  try {
    // Her zaman ağdan al
    return await fetch(request);
  } catch (error) {
    // Ağ hatası durumunda önbellekten dene
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache First, Network Fallback Stratejisi
async function cacheFirstThenNetwork(request) {
  // Sadece GET ve HEAD isteklerini önbelleğe al
  if (!METHODS_TO_CACHE.includes(request.method)) {
    return fetch(request);
  }
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Önbellekte yoksa ağdan al ve önbelleğe kaydet
  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  
  return networkResponse;
}

// API İstekleri için Stale-While-Revalidate Stratejisi
async function staleWhileRevalidate(request) {
  // Supabase storage isteklerini doğrudan ağdan al, önbelleğe alma
  if (request.url.includes(SUPABASE_URL) && request.url.includes('/storage/v1/object/')) {
    try {
      return await fetch(request);
    } catch (error) {
      console.error('Supabase storage fetch error:', error);
      throw error;
    }
  }

  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Önbellekteki yanıtın yaşını kontrol et
  if (cachedResponse) {
    const cachedTime = new Date(cachedResponse.headers.get('sw-cache-timestamp'));
    const now = new Date();
    
    if (now.getTime() - cachedTime.getTime() < API_CACHE_DURATION) {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    
    // Yanıta zaman damgası ekle
    const responseToCache = networkResponse.clone();
    const headers = new Headers(responseToCache.headers);
    headers.append('sw-cache-timestamp', new Date().toISOString());
    
    const modifiedResponse = new Response(await responseToCache.blob(), {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers
    });
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Supabase API isteklerini SW dışında bırak
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('https://ynbwiarxodetyirhmcbp.supabase.co')) {
    // Supabase isteklerini yakalama, browser’a bırak
    return;
  }
  const request = event.request;

  // HTML istekleri için Network First stratejisi
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstThenCache(request));
    return;
  }
  const url = new URL(request.url);

  // API istekleri için özel strateji
  if (url.pathname.startsWith('/api/') || 
      url.hostname === SUPABASE_URL ||
      url.hostname === 'api.themoviedb.org' ||
      url.hostname === 'api.rawg.io' ||
      url.hostname === 'www.googleapis.com') {
    // Supabase storage istekleri için özel işlem
    if (url.hostname === SUPABASE_URL && url.pathname.includes('/storage/v1/object/')) {
      event.respondWith(networkFirstThenCache(request));
    } else {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  // Statik dosyalar için Cache First stratejisi
  if (STATIC_ASSETS.includes(url.pathname) || 
      request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(cacheFirstThenNetwork(request));
    return;
  }

  // Diğer istekler için Network First stratejisi
  event.respondWith(networkFirstThenCache(request));
});

// Push Bildirimleri
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/favicon.png',
    badge: 'https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Görüntüle',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Connectlist', options)
  );
});

// Bildirim Tıklama
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/messages')
    );
  }
});