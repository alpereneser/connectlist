import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp, BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Uygulamanın Android geri tuşuyla çıkış yapacağı ana yolları tanımlayın.
// Bu yolları kendi uygulamanızın yapısına göre düzenleyin.
const EXIT_ON_BACK_PATHS = ['/', '/auth/login']; // Güncellenmiş yollar

export const useAndroidBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const platform = typeof Capacitor?.getPlatform === 'function' ? Capacitor.getPlatform() : 'web';

    if (platform !== 'android') {
      // Bu handler sadece Android platformunda çalışsın
      return;
    }

    const handleBackButton = (event: BackButtonListenerEvent) => {
      // Geri tuşu olayının varsayılan davranışını engelliyoruz,
      // çünkü yönlendirmeyi React Router ile veya uygulamayı kapatarak kendimiz yöneteceğiz.
      event.preventDefault();

      if (EXIT_ON_BACK_PATHS.includes(location.pathname)) {
        // Eğer mevcut yol, çıkış yapılacak yollardan biriyse uygulamayı kapat
        CapacitorApp.exitApp();
      } else {
        // Değilse, React Router geçmişinde bir önceki sayfaya git
        navigate(-1);
      }
    };

    // Geri tuşu olay dinleyicisini ekle
    const listener = CapacitorApp.addListener ? CapacitorApp.addListener('backButton', handleBackButton) : { remove: () => {} } as any;

    // Component unmount olduğunda veya bağımlılıklar değiştiğinde dinleyiciyi kaldır
    return () => {
      if (listener && typeof (listener as any).remove === 'function') {
        (listener as any).remove();
      }
    };
  }, [navigate, location.pathname]); // Hook'un yeniden çalışması için bağımlılıklar
};
