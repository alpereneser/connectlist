import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';

function PrivacyPolicy() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Sayfa başlığını güncelle
    document.title = `${t('privacy.title')} - Connectlist`;
    
    // Sayfanın en üstüne kaydır
    window.scrollTo(0, 0);
  }, [t]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 pt-[75px] md:pt-[95px] pb-[100px] md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            <div className="flex items-center mb-6">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={t('common.back')}
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl md:text-3xl font-bold">{t('privacy.title')}</h1>
            </div>

            <div className="prose max-w-none">
              <h2>{t('privacy.introduction.title')}</h2>
              <p>{t('privacy.introduction.description')}</p>

              <h2>{t('privacy.dataCollection.title')}</h2>
              <p>{t('privacy.dataCollection.description')}</p>
              <ul>
                <li>{t('privacy.dataCollection.item1')}</li>
                <li>{t('privacy.dataCollection.item2')}</li>
                <li>{t('privacy.dataCollection.item3')}</li>
                <li>{t('privacy.dataCollection.item4')}</li>
                <li>{t('privacy.dataCollection.item5')}</li>
              </ul>

              <h2>{t('privacy.dataUse.title')}</h2>
              <p>{t('privacy.dataUse.description')}</p>
              <ul>
                <li>{t('privacy.dataUse.item1')}</li>
                <li>{t('privacy.dataUse.item2')}</li>
                <li>{t('privacy.dataUse.item3')}</li>
                <li>{t('privacy.dataUse.item4')}</li>
              </ul>

              <h2>{t('privacy.dataSharing.title')}</h2>
              <p>{t('privacy.dataSharing.description')}</p>
              <ul>
                <li>{t('privacy.dataSharing.item1')}</li>
                <li>{t('privacy.dataSharing.item2')}</li>
                <li>{t('privacy.dataSharing.item3')}</li>
              </ul>

              <h2>{t('privacy.cookies.title')}</h2>
              <p>{t('privacy.cookies.description')}</p>

              <h2>{t('privacy.security.title')}</h2>
              <p>{t('privacy.security.description')}</p>

              <h2>{t('privacy.userRights.title')}</h2>
              <p>{t('privacy.userRights.description')}</p>
              <ul>
                <li>{t('privacy.userRights.item1')}</li>
                <li>{t('privacy.userRights.item2')}</li>
                <li>{t('privacy.userRights.item3')}</li>
                <li>{t('privacy.userRights.item4')}</li>
              </ul>

              <h2>{t('privacy.changes.title')}</h2>
              <p>{t('privacy.changes.description')}</p>

              <h2>{t('privacy.contact.title')}</h2>
              <p>{t('privacy.contact.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { PrivacyPolicy };
