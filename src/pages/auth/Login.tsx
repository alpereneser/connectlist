import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginSchema } from '../../lib/schemas';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/AuthLayout';
import { useEffect } from 'react';
import { createBrowserClient } from '../../lib/supabase-browser';
import { DEFAULT_HOME_CATEGORY } from '../../constants/categories';

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Kayıtlı e-posta adresini localStorage'dan al
    const savedEmail = localStorage.getItem('rememberedEmail');
    const wasRemembered = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && wasRemembered) {
      setValue('email', savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginForm) => {
    try {
      // Her oturum açma işlemi için yeni bir Supabase istemcisi oluştur
      const supabaseClient = createBrowserClient();
      
      // Oturum açma işlemi
      const { error: authError } = await supabaseClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Eğer "Beni Hatırla" seçiliyse, e-posta adresini localStorage'a kaydet
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        // Seçili değilse localStorage'dan temizle
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }

      if (authError) throw authError;
      
      // Başarılı giriş sonrası anasayfaya yönlendir ve listeleri sondan başa (desc) yüklemek için state gönder
      navigate('/', {
        replace: true,
        state: {
          refresh: true,
          sortDirection: 'desc',
          category: DEFAULT_HOME_CATEGORY
        }
      });
    } catch (error) {
      setAuthError(t('auth.invalidCredentials'));
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border">
        <h2 className="text-2xl font-bold mb-4 md:mb-8">{t('auth.welcome')}</h2>
        <p className="text-gray-600 text-sm mb-8">{t('auth.welcomeMessage')}</p>
        {authError && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6">
            {authError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-gray-400"
              placeholder={t('auth.email')}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder:text-gray-400"
              placeholder={t('auth.password')}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                data-component-name="Login"
              />
              <span className="ml-2 text-gray-600">{t('auth.rememberMe')}</span>
            </label>
            <Link to="/auth/forgot-password" className="text-sm text-gray-600 hover:text-gray-900">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>
        <Link
          to="/auth/register"
          className="block mt-4 text-center text-sm text-gray-600 hover:text-gray-900"
        >
          {t('auth.register')}
        </Link>
      </div>
    </AuthLayout>
  );
}

