import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { detectUserLocation } from './locationDetector';
import tr from './locales/tr.json';
import en from './locales/en.json';

export { i18n };

i18n
  .use(LanguageDetector)
  .use({
    type: 'languageDetector',
    async: true,
    init: () => {},
    detect: async (callback) => {
      // Önce localStorage'da kaydedilmiş bir dil tercihi var mı kontrol et
      const savedLanguage = localStorage.getItem('i18nextLng');
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      
      // Kaydedilmiş tercih yoksa IP bazlı tespit yap
      try {
        const detectedLanguage = await detectUserLocation();
        console.log('Tespit edilen dil:', detectedLanguage);
        callback(detectedLanguage);
      } catch (error) {
        console.error('IP bazlı dil tespiti yapılamadı:', error);
        // Hata durumunda tarayıcı dilini kullan
        callback(navigator.language.split('-')[0]);
      }
    },
    cacheUserLanguage: (lng) => {
      localStorage.setItem('i18nextLng', lng);
    }
  })
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en }
    },
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['customDetector', 'querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;