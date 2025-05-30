import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';

function TermsOfService() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.language;

  useEffect(() => {
    // Sayfa başlığını güncelle
    document.title = `${t('terms.title')} - Connectlist`;
    
    // Sayfanın en üstüne kaydır
    window.scrollTo(0, 0);
  }, [t, currentLanguage]); // Dil değiştiğinde içeriği güncelle

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
              <h1 className="text-2xl md:text-3xl font-bold">{t('terms.title')}</h1>
            </div>

            <div className="prose max-w-none">
              <h2>{t('terms.introduction.title')}</h2>
              <p>{t('terms.introduction.description')}</p>

              <h2>{t('terms.acceptance.title')}</h2>
              <p>{t('terms.acceptance.description')}</p>

              <h2>{t('terms.eligibility.title')}</h2>
              <p>{t('terms.eligibility.description')}</p>

              <h2>{t('terms.account.title')}</h2>
              <p>{t('terms.account.description')}</p>
              <ul>
                <li>{t('terms.account.item1')}</li>
                <li>{t('terms.account.item2')}</li>
                <li>{t('terms.account.item3')}</li>
              </ul>

              <h2>{t('terms.userContent.title')}</h2>
              <p>{t('terms.userContent.description')}</p>
              <ul>
                <li>{t('terms.userContent.item1')}</li>
                <li>{t('terms.userContent.item2')}</li>
                <li>{t('terms.userContent.item3')}</li>
                <li>{t('terms.userContent.item4')}</li>
              </ul>

              <h2>{t('terms.prohibited.title')}</h2>
              <p>{t('terms.prohibited.description')}</p>
              <ul>
                <li>{t('terms.prohibited.item1')}</li>
                <li>{t('terms.prohibited.item2')}</li>
                <li>{t('terms.prohibited.item3')}</li>
                <li>{t('terms.prohibited.item4')}</li>
                <li>{t('terms.prohibited.item5')}</li>
                <li>{t('terms.prohibited.item6')}</li>
              </ul>

              <h2>{t('terms.intellectual.title')}</h2>
              <p>{t('terms.intellectual.description')}</p>

              <h2>{t('terms.termination.title')}</h2>
              <p>{t('terms.termination.description')}</p>

              <h2>{t('terms.disclaimer.title')}</h2>
              <p>{t('terms.disclaimer.description')}</p>

              <h2>{t('terms.limitation.title')}</h2>
              <p>{t('terms.limitation.description')}</p>

              <h2>{t('terms.governing.title')}</h2>
              <p>{t('terms.governing.description')}</p>

              <h2>{t('terms.changes.title')}</h2>
              <p>{t('terms.changes.description')}</p>

              <h2>{t('terms.contact.title')}</h2>
              <p>{t('terms.contact.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { TermsOfService };
