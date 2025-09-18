// Bu servis çalışanı, uygulamanın her zaman en son sürümünün kullanılmasını sağlar
// Kullanıcılar Ctrl+Shift+R yapmadan güncellemeleri görebilecekler

// Servis çalışanı sürümü - bu değeri her dağıtımda değiştirin
const VERSION = '1.1.0';

// Önbellek isimleri
const CACHE_NAME = `connectlist-cache-${VERSION}`;
const STATIC_CACHE = `connectlist-static-${VERSION}`;
const DYNAMIC_CACHE = `connectlist-dynamic-${VERSION}`;

// Önbelleğe alınacak temel varlıklar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Yükleme sırasında önbelleğe alınacak varlıklar
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Offline sayfasını oluştur
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.add('/offline.html').catch(() => {
          // Offline sayfası yoksa basit bir HTML oluştur
          const offlineResponse = new Response(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Çevrimdışı - Connectlist</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .container { max-width: 400px; margin: 50px auto; text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .icon { font-size: 48px; margin-bottom: 20px; }
                h1 { color: #333; margin-bottom: 10px; }
                p { color: #666; margin-bottom: 20px; }
                .retry-btn { background: #f97316; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
                .retry-btn:hover { background: #ea580c; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📱</div>
                <h1>Çevrimdışısınız</h1>
                <p>İnternet bağlantınızı kontrol edin ve tekrar deneyin.</p>
                <button class="retry-btn" onclick="window.location.reload()">Tekrar Dene</button>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
          return cache.put('/offline.html', offlineResponse);
        });
      })
    ])
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
          .filter((name) => !name.includes(VERSION))
          .map((name) => caches.delete(name))
      );
    })
  );
  // Yeni servis çalışanının hemen kontrolü ele almasını sağla
  self.clients.claim();
});

// Ağ isteklerini yönet
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Supabase isteklerini Service Worker'dan hariç tut
  if (url.hostname.includes('supabase.co')) {
    return;
  }
  
  // Chrome extension isteklerini hariç tut
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // HTML navigation istekleri için Network First stratejisi
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Önce dinamik önbellekten dene
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Son çare olarak offline sayfasını göster
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // Statik varlıklar için Cache First stratejisi
  if (request.method === 'GET' && 
      (url.pathname.endsWith('.js') || 
       url.pathname.endsWith('.css') || 
       url.pathname.endsWith('.png') || 
       url.pathname.endsWith('.jpg') || 
       url.pathname.endsWith('.jpeg') || 
       url.pathname.endsWith('.svg') || 
       url.pathname.endsWith('.ico') ||
       url.pathname.includes('/assets/'))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const clonedResponse = response.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, clonedResponse);
                });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // API istekleri için Network First stratejisi
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Diğer GET istekleri için Network First
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Background sync için event listener
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Offline sırasında yapılan işlemleri senkronize et
      console.log('Background sync triggered')
    );
  }
});

// Push notification için event listener
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Görüntüle',
          icon: '/favicon.png'
        },
        {
          action: 'close',
          title: 'Kapat',
          icon: '/favicon.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click için event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
