import { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n';
import { detectUserLocation } from '../i18n/locationDetector';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(localStorage.getItem('i18nextLng') || 'tr');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageState(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  useEffect(() => {
    const initializeLanguage = async () => {
      setIsLoading(true);
      
      // Önce localStorage'da kaydedilmiş bir dil tercihi var mı kontrol et
      const storedLang = localStorage.getItem('i18nextLng');
      
      if (storedLang) {
        setLanguage(storedLang);
      } else {
        // Kaydedilmiş tercih yoksa IP bazlı tespit yap
        try {
          console.log('IP bazlı dil tespiti yapılıyor...');
          const detectedLang = await detectUserLocation();
          console.log('Tespit edilen dil:', detectedLang);
          
          // Tespit edilen dili ayarla
          if (detectedLang) {
            setLanguage(detectedLang);
          } else {
            // Tespit başarısız olursa tarayıcı diline bak
            const browserLang = navigator.language.split('-')[0].toLowerCase();
            setLanguage(browserLang === 'tr' ? 'tr' : 'en');
          }
        } catch (error) {
          console.error('IP bazlı dil tespiti yapılamadı:', error);
          // Hata durumunda tarayıcı diline bak
          const browserLang = navigator.language.split('-')[0].toLowerCase();
          setLanguage(browserLang === 'tr' ? 'tr' : 'en');
        }
      }
      setIsLoading(false);
    };
    
    initializeLanguage();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {isLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
        </div>
      ) : (
        children
      )}
    </LanguageContext.Provider>
  );
}
