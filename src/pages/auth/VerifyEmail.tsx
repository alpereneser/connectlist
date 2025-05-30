import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/AuthLayout';
import { Mail, CheckCircle } from 'lucide-react';

export function VerifyEmail() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    // URL'den doğrulama durumunu kontrol et
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const type = params.get('type');
    
    if (error) {
      setVerificationStatus('error');
      setMessage(t('auth.verificationFailed'));
    } else if (type === 'signup' || type === 'recovery') {
      setVerificationStatus('success');
      setMessage(t('auth.verificationSuccess'));
      
      // 3 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } else if (location.state) {
      // Kayıt sayfasından gelen bilgileri al
      const { email: stateEmail, message: stateMessage } = location.state as { email?: string; message?: string };
      if (stateEmail) setEmail(stateEmail);
      if (stateMessage) setMessage(stateMessage);
    }
  }, [location, navigate, t]);

  return (
    <AuthLayout>
      <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border text-center">
        {verificationStatus === 'pending' && (
          <>
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-orange-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">{t('auth.verifyEmail')}</h2>
            <p className="text-gray-600 mb-6">
              {message || t('auth.verificationEmailSent')}
            </p>
            {email && (
              <p className="text-sm text-gray-500 mb-6">
                {t('auth.sentTo')}: <strong>{email}</strong>
              </p>
            )}
            <div className="text-sm text-gray-500">
              <p>{t('auth.checkSpam')}</p>
              <p className="mt-2">
                {t('auth.didntReceive')}{' '}
                <a
                  href="mailto:"
                  className="text-orange-500 hover:text-orange-600 underline"
                >
                  {t('auth.openEmailClient')}
                </a>
                {/* Orijinal try again linki:
                <button
                  onClick={() => navigate('/auth/login')}
                  className="text-orange-500 hover:text-orange-600"
                >
                  {t('auth.tryAgain')}
                </button> */}
              </p>
            </div>
          </>
        )}

        {verificationStatus === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">{t('auth.verificationSuccess')}</h2>
            <p className="text-gray-600 mb-6">
              {message || t('auth.accountVerified')}
            </p>
            <p className="text-sm text-gray-500">
              {t('auth.redirecting')}...
            </p>
          </>
        )}

        {verificationStatus === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-red-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">{t('auth.verificationFailed')}</h2>
            <p className="text-gray-600 mb-6">
              {message || t('auth.verificationError')}
            </p>
            <button
              onClick={() => navigate('/auth/login')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              {t('auth.backToLogin')}
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
