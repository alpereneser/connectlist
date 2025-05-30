import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

export function InstallPrompt() {
  const [installable, setInstallable] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // PWA yüklenebilirlik kontrolü
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setInstallable(true);
      
      // Kullanıcı daha önce prompt'u görmemiş mi kontrol et
      const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
      if (!hasSeenPrompt) {
        // İlk kez gösteriyoruz, biraz bekleyelim
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // 3 saniye sonra göster
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // PWA yükleme durumunu kontrol et
    window.addEventListener('appinstalled', () => {
      setInstallable(false);
      window.deferredPrompt = null;
      setShowPrompt(false);
      localStorage.setItem('hasInstalledPWA', 'true');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) return;
    
    try {
      await window.deferredPrompt.prompt();
      const choiceResult = await window.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('Kullanıcı uygulamayı yükledi');
      } else {
        console.log('Kullanıcı uygulamayı yüklemeyi reddetti');
      }
      
      // Prompt'u kullandık, artık null yapabiliriz
      window.deferredPrompt = null;
      setInstallable(false);
    } catch (error) {
      console.error('Yükleme hatası:', error);
    }
    
    // Prompt'u gösterdiğimizi kaydet
    localStorage.setItem('hasSeenInstallPrompt', 'true');
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  if (!showPrompt || !installable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-80 bg-white rounded-lg shadow-lg z-50 p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">Connectlist'i Yükle</h3>
        <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <p className="text-gray-600 text-sm mb-3">
        Daha iyi bir deneyim için Connectlist'i ana ekranınıza ekleyin.
      </p>
      <div className="flex justify-end gap-2">
        <button 
          onClick={handleClose}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Daha Sonra
        </button>
        <button 
          onClick={handleInstall}
          className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Yükle
        </button>
      </div>
    </div>
  );
}