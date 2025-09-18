import { z } from 'zod';
import i18next from 'i18next';

// i18n çevirilerini kullanarak dinamik hata mesajları oluşturan yardımcı fonksiyon
const t = (key: string) => i18next.t(key);

// Şemaları oluşturan fonksiyonlar - dil değiştiğinde güncellenecek
export const getLoginSchema = () => z.object({
  email: z.string().email(t('validation.invalidEmail')),
  password: z.string().min(6, t('validation.passwordMinLength')),
});

export const getRegisterSchema = () => z.object({
  username: z.string()
    .min(3, t('validation.usernameMinLength'))
    .max(30, t('validation.usernameMaxLength'))
    .regex(/^[a-zA-Z0-9_çöışüğÇÖİŞÜĞ]+$/, t('validation.usernameFormat')),
  fullName: z.string().min(2, t('validation.fullNameMinLength')),
  email: z.string().email(t('validation.invalidEmail')),
  password: z.string().min(6, t('validation.passwordMinLength')),
  confirmPassword: z.string().min(6, t('validation.passwordMinLength')),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('validation.passwordsDoNotMatch'),
  path: ['confirmPassword'],
});

export const getForgotPasswordSchema = () => z.object({
  email: z.string().email(t('validation.invalidEmail')),
});

// Geriye dönük uyumluluk için eski şemaları da tanımlayalım
export const loginSchema = getLoginSchema();
export const registerSchema = getRegisterSchema();
export const forgotPasswordSchema = getForgotPasswordSchema();