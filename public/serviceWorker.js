// Bu servis çalışanı, uygulamanın her zaman en son sürümünün kullanılmasını sağlar
// Kullanıcılar Ctrl+Shift+R yapmadan güncellemeleri görebilecekler

// Servis çalışanı sürümü - bu değeri her dağıtımda değiştirin
const VERSION = '1.0.0';

// Önbelleğe alınacak varlıklar
const CACHE_NAME = `connectlist-cache-${VERSION}`;

// Yükleme sırasında önbelleğe alınacak varlıklar
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Uygulamanın temel dosyalarını önbelleğe al
      return cache.addAll([
        '/',
        '/index.html'
      ]);
    })
  );
  // Yeni servis çalışanının hemen etkinleştirilmesini sağla
  self.skipWaiting();
});

// Etkinleştirme sırasında eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Yeni servis çalışanının hemen kontrolü ele almasını sağla
  self.clients.claim();
});

// Ağ isteklerini yönet
self.addEventListener('fetch', (event) => {
  // Supabase isteklerini Service Worker'dan hariç tut
  if (event.request.url.includes('supabase.co')) {
    // Supabase isteklerini doğrudan ağa yönlendir, Service Worker araya girmesin
    return;
  }
  
  // HTML istekleri için her zaman ağdan al ve önbelleği güncelle
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(event.request).then((response) => {
        // Geçerli yanıtları önbelleğe al
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response;
      }).catch(() => {
        // Ağ bağlantısı yoksa önbellekten sun
        return caches.match(event.request);
      })
    );
  } else {
    // Diğer istekler için önce ağı dene, sonra önbelleği
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Statik varlıkları önbelleğe al
          if (response.ok && event.request.method === 'GET') {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Ağ bağlantısı yoksa önbellekten sun
          return caches.match(event.request);
        })
    );
  }
});
