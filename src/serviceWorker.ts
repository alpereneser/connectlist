// Bu dosya TypeScript ile yazılmış olsa da, servis çalışanı olarak çalışması için
// JavaScript'e dönüştürülüp public klasörüne kopyalanması gerekiyor

// TypeScript'in servis çalışanı tiplerini tanımlaması için
declare const self: ServiceWorkerGlobalScope;

// Servis çalışanı sürümü - bu değeri her dağıtımda değiştirin
const VERSION = '1.0.2'; // Sürümü güncelledik

// Önbelleğe alınacak varlıklar
const CACHE_NAME = `connectlist-cache-${VERSION}`;

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html', // Çevrimdışı sayfası eklendi
  '/manifest.json', // Manifest eklendi
  '/favicon.svg',   // Favicon eklendi
  '/logo192.png',   // Ana ikon eklendi
  // '/logo512.png', // Varsa büyük ikon da eklenebilir
  // Ana CSS ve JS dosyalarınızın yollarını buraya ekleyebilirsiniz
  // Eğer vite-plugin-pwa kullanmıyorsanız ve dosya adları sabitse veya tahmin edilebiliyorsa
  // Örneğin: '/assets/index.css', '/assets/index.js'
  // Ancak bu genellikle build sırasında hash aldığı için zordur.
];

// Yükleme sırasında önbelleğe alınacak varlıklar
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  // Yeni servis çalışanının hemen etkinleştirilmesini sağla
  self.skipWaiting();
});

// Etkinleştirme sırasında eski önbellekleri temizle
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Service Worker: Deleting old cache', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Yeni servis çalışanının hemen kontrolü ele almasını sağla
  self.clients.claim();
});

// Ağ isteklerini yönet
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // API ve dinamik içerik istekleri için önbelleği atla (Supabase, Netlify Functions vb.)
  if (
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:' || // Tarayıcı eklenti isteklerini yoksay
    event.request.url.startsWith(self.location.origin + '/@vite/') || // Vite geliştirme sunucusu istekleri
    event.request.url.includes('/.netlify/functions/') || // Netlify fonksiyonları
    url.pathname.startsWith('/api/') || // Genel /api/ yolu (Supabase için zaten vardı)
    url.pathname.startsWith('/rest/') || // Supabase
    url.pathname.startsWith('/auth/') // Supabase auth
  ) {
    // Bu istekler için doğrudan ağı kullan, önbellekleme yapma
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML navigasyon istekleri için (Network first, then cache, then offline page)
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      event.request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Yanıt geçerliyse ve başarılıysa, önbelleğe al
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Ağ hatası oldu, önbellekten sunmayı dene
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Önbellekte de yoksa, çevrimdışı sayfasını sun
            return caches.match('/offline.html') as Promise<Response>;
          });
        })
    );
  } else if (event.request.method === 'GET') {
    // Diğer GET istekleri (CSS, JS, Resimler vb.) için (Cache first, then network)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Ağ hatası ve önbellekte de yoksa (örneğin, bir resim için),
          // isteğe bağlı olarak genel bir fallback resmi döndürebilirsiniz.
          // Şimdilik hata döndürmesine izin veriyoruz.
          // if (event.request.destination === 'image') {
          //   return caches.match('/placeholder-image.png');
          // }
          return new Response('Network error and not in cache', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
    );
  }
});
