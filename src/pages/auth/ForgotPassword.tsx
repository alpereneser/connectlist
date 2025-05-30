import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { forgotPasswordSchema } from '../../lib/schemas';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import { AuthLayout } from '../../components/AuthLayout';

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const { t } = useTranslation();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      // Supabase istemcisini doğrudan burada oluşturalım
      const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTQzMzMsImV4cCI6MjA1NjQ5MDMzM30.zwO86rBSmPBYCEmecINSQOHG-0e5_Tsb1ZLucR8QP6Q';
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      
      // Şifre sıfırlama e-postası gönder
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: 'https://connectlist.me/auth/reset-password'
      });
      
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(t('auth.resetPasswordError'));
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border text-center">
          <h2 className="text-2xl font-bold mb-4">{t('auth.passwordResetSent')}</h2>
          <div className="mb-6 text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">{t('auth.resetEmailSent')}</p>
          <p className="text-gray-600 mb-6">{t('auth.resetPasswordInstructions')}</p>
          <p className="text-gray-500 text-sm mb-6">{t('auth.checkSpamFolder')}</p>
          <Link
            to="/auth/login"
            className="block text-center text-sm text-gray-600 hover:text-gray-900"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-white md:p-8 p-4 md:rounded-lg md:shadow-sm md:border">
        <h2 className="text-2xl font-bold mb-4 md:mb-8">{t('auth.welcome')}</h2>
        <p className="text-gray-600 text-sm mb-8">{t('auth.welcomeMessage')}</p>
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6">
            {error}
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? t('auth.sending') : t('auth.resetPassword')}
          </button>
        </form>
        <Link
          to="/auth/login"
          className="block mt-4 text-center text-sm text-gray-600 hover:text-gray-900"
        >
          {t('auth.login')}
        </Link>
      </div>
    </AuthLayout>
  );
}