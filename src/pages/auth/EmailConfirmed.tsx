import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/AuthLayout';
import { CheckCircle } from 'lucide-react';

export function EmailConfirmed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 5 saniye sonra giriş sayfasına yönlendir
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/auth/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">{t('auth.emailConfirmed')}</h2>
        <p className="text-gray-600 mb-6">
          {t('auth.emailConfirmedMessage')}
        </p>
        <button
          onClick={() => navigate('/auth/login')}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          {t('auth.goToLogin')}
        </button>
        <p className="text-sm text-gray-500 mt-4">
          {t('auth.redirectingIn')} {countdown} {t('auth.seconds')}...
        </p>
      </div>
    </AuthLayout>
  );
}
