import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { detectUserLocation } from '../i18n/locationDetector';

export function Footer() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  
  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  // Otomatik dil tespiti için fonksiyon
  const autoDetectLanguage = async () => {
    try {
      const detectedLang = await detectUserLocation();
      i18n.changeLanguage(detectedLang);
      localStorage.setItem('i18nextLng', detectedLang);
    } catch (error) {
      console.error('Otomatik dil tespiti yapılamadı:', error);
    }
  };

  return (
    <footer className="h-[25px] bg-white border-t border-gray-200 flex items-center justify-between px-4 text-sm text-gray-500 mt-auto">
      <div className="flex items-center gap-3">
        <span>connectlist</span>
        <Link to="/settings?tab=support" className="hover:text-orange-500">
          {t('footer.support')}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={autoDetectLanguage} 
          className="flex items-center justify-center text-gray-500 hover:text-orange-500 text-xs"
          title="Otomatik Dil Tespiti / Auto Language Detection"
        >
          🌐
        </button>
        <button 
          onClick={() => changeLanguage('tr')} 
          className={`flex items-center justify-center ${i18n.language === 'tr' ? 'text-orange-500' : 'text-gray-500'} text-xs`}
        >
          TR
        </button>
        <button 
          onClick={() => changeLanguage('en')} 
          className={`flex items-center justify-center ${i18n.language === 'en' ? 'text-orange-500' : 'text-gray-500'} text-xs`}
        >
          EN
        </button>
      </div>
    </footer>
  );
}