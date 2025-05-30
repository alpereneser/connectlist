const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export async function registerServiceWorker() {
  try {
    // Development ortamında Service Worker'ı devre dışı bırak
    if (!import.meta.env.PROD) {
      console.debug('Service Worker is not supported on StackBlitz');
      return null;
    }

    // Service Worker'ı kaydet
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);

    // PWA yükleme olayını dinle
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
    });

    // PWA yükleme durumunu dinle
    window.addEventListener('appinstalled', () => {
      window.deferredPrompt = null;
      console.log('PWA installed successfully');
    });

    // Push bildirimleri için izin kontrolü
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Push subscription oluştur
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
        return subscription;
      }
    }

    return null;
  } catch (error) {
    // Service Worker hatalarını sessizce yakala
    console.debug('Service Worker registration failed:', error);
    return null;
  }
}

// Base64 string'i Uint8Array'e çevir
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}