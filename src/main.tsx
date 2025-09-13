import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import i18n from './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';

// Dil ayarlarını başlangıçta kontrol eden bileşen
function LanguageInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      // --- GEÇİCİ TEST: IP Bazlı Tespit Devre Dışı --- 
      // Sabit bir dil kullan (veya localStorage'dan al)
      const savedLanguage = localStorage.getItem('i18nextLng');
      const initialLang = savedLanguage || 'tr'; // Varsayılan 'tr'
      if (i18n.language !== initialLang) {
        i18n.changeLanguage(initialLang);
        if (!savedLanguage) {
             localStorage.setItem('i18nextLng', initialLang);
        }
      }
      console.log('Dil tespiti geçici olarak devre dışı, kullanılan dil:', initialLang);
      // -----------------------------------------------

      setIsInitialized(true); // Dil tespitini beklemeden başlat
    };
    
    initializeLanguage();
  }, []);
  
  // Dil yüklenene kadar bir yükleme göstergesi göster
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return null; // Dil yüklendikten sonra hiçbir şey gösterme
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika
      gcTime: 1000 * 60 * 30, // 30 dakika (eski adı cacheTime idi)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

// Kaydedilmiş dili yükle
const savedLanguage = localStorage.getItem('i18nextLng');
if (savedLanguage) {
  i18n.changeLanguage(savedLanguage);
}

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <LanguageInitializer />
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);

// Otomatik güncelleme için bileşen
// Service Worker'ları kullanmadığımız için AutoUpdater bileşenini kaldırdık

// Service Worker'ları tamamen kaldırdık
// Bu, Supabase bağlantı sorunlarını çözmek için gerekli

// Production'da (canlı alan adı) PWA deneyimi için Service Worker kaydı
if (
  'serviceWorker' in navigator &&
  window.location.hostname.endsWith('connectlist.me')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // sessiz hata
      });
  });
}
