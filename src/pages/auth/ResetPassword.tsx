import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { createBrowserClient } from '../../lib/supabase-browser';
import { AuthLayout } from '../../components/AuthLayout';

// Şifre sıfırlama şemasını oluşturan fonksiyon - dil değiştiğinde güncellenecek
const getResetPasswordSchema = (t: TFunction) => z.object({
  password: z.string()
    .min(8, { message: t('validation.passwordMin8') })
    .regex(/[a-z]/, { message: t('validation.passwordLowercase') })
    .regex(/[A-Z]/, { message: t('validation.passwordUppercase') })
    .regex(/[0-9]/, { message: t('validation.passwordNumber') }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: t('validation.passwordsDoNotMatch'),
  path: ['confirmPassword']
});

export function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validResetLink, setValidResetLink] = useState(false);
  
  // Dinamik olarak şema oluşturuyoruz, böylece dil değiştiğinde çeviriler de güncellenir
  const resetPasswordSchema = getResetPasswordSchema(t);
  type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // URL'den hash parametresini kontrol et
    const checkResetLink = async () => {
      try {
        // Supabase istemcisini oluştur
        const supabase = createBrowserClient();
        
        // URL'den hash parametresini kontrol et
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const type = params.get('type');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        // Eğer token'lar varsa, oturumu ayarla
        if (accessToken && refreshToken) {
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (sessionError) {
              console.error('Session error:', sessionError);
              throw sessionError;
            }
            
            // Oturum başarıyla ayarlandı
            setValidResetLink(true);
            setLoading(false);
            return;
          } catch (sessionError) {
            console.error('Error setting session:', sessionError);
            // Oturum ayarlama hatası durumunda aşağıdaki kontrollere devam et
          }
        }
        
        // Mevcut oturumu kontrol et
        const { data: { session } } = await supabase.auth.getSession();
        
        // Eğer oturum varsa veya type parametresi recovery ise geçerli bir bağlantı
        if (session || type === 'recovery') {
          setValidResetLink(true);
          setLoading(false);
        } else {
          setError("Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş");
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking reset link:', error);
        setError("Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş");
        setLoading(false);
      }
    };
    
    checkResetLink();
  }, [t]);

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setError(null);
      
      // Supabase istemcisini oluştur
      const supabase = createBrowserClient();
      
      // URL'den access_token ve refresh_token parametrelerini al
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      // Eğer token'lar varsa, oturumu ayarla
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
      }
      
      // Şifreyi güncelle
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) throw error;
      
      setSuccess(true);
      
      // 3 saniye sonra giriş sayfasına yönlendir
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      setError("Şifre sıfırlama sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!validResetLink) {
    return (
      <AuthLayout>
        <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border text-center">
          <h2 className="text-2xl font-bold mb-4">Geçersiz Sıfırlama Bağlantısı</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Yeni Bağlantı İste
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border text-center">
          <h2 className="text-2xl font-bold mb-4">Şifre Sıfırlama Başarılı</h2>
          <p className="text-gray-600 mb-6">Şifreniz başarıyla değiştirildi</p>
          <p className="text-sm text-gray-500">Giriş sayfasına yönlendiriliyor...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border">
        <h2 className="text-2xl font-bold mb-4 md:mb-8">Şifremi Sıfırla</h2>
        <p className="text-gray-600 text-sm mb-8">Yeni şifrenizi aşağıya girin</p>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-gray-400"
              placeholder="Yeni Şifre"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          
          <div>
            <input
              {...register('confirmPassword')}
              type="password"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-gray-400"
              placeholder="Yeni Şifre Tekrar"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sıfırlanıyor..." : "Şifremi Sıfırla"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
