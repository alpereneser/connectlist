import { z } from 'zod';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useForm } from 'react-hook-form';
import { useDebounce } from '../hooks/useDebounce';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Bell, Shield, Globe, UserMinus, HelpCircle, LogOut, Camera, Send, Moon, Sun } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '../components/Header';
import { AvatarCropper } from '../components/AvatarEditor';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

// Type definitions
type Profile = {
  id?: string;
  full_name: string;
  username: string;
  bio: string;
  website: string;
  location: string;
  avatar?: string;
  avatar_url?: string;
  list_notifications?: boolean;
  follower_notifications?: boolean;
  message_notifications?: boolean;
  private_profile?: boolean;
  private_lists?: boolean;
  show_online_status?: boolean;
};

type EmailSettingsForm = {
  email: string;
};

type PasswordSettingsForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type UsernameForm = {
  username: string;
};

type SupportForm = {
  subject: string;
  message: string;
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const navigate = useNavigate();
  const [announceText, setAnnounceText] = useState('');
  // Active section state for settings navigation (fixes ReferenceError)
  const [activeSection, setActiveSection] = useState<'language' | 'support' | 'account' | 'notifications' | 'privacy' | 'security' | 'email'>('account');
  // Local state for delete account modal and password input
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  // Username availability + saving/deleting flags
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Unified local form state used when fetching profile
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: '',
    location: ''
  });

  // Notification & Privacy settings state
  type NotificationSettings = {
    list_notifications: boolean;
    follower_notifications: boolean;
    message_notifications: boolean;
  };
  type PrivacySettings = {
    private_profile: boolean;
    private_lists: boolean;
    show_online_status: boolean;
  };
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    list_notifications: true,
    follower_notifications: true,
    message_notifications: true,
  });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    private_profile: false,
    private_lists: false,
    show_online_status: true,
  });
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    username: '',
    bio: '',
    website: '',
    location: ''
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>('');
  const [success, setSuccess] = useState<string | null>('');

  // Screen Reader Announcements
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceText(message);
    setTimeout(() => setAnnounceText(''), 1000);
  }, []);

  // Dinamik validasyon şemalarını oluştur
  const emailSchema = z.object({
    email: z.string().email(t('validation.invalidEmail', 'Geçersiz e-posta adresi'))
  });

  const passwordSchema = z.object({
    currentPassword: z.string().min(6, t('validation.passwordMinLength', 'Şifre en az 6 karakter olmalıdır')),
    newPassword: z.string().min(6, t('validation.passwordMinLength', 'Şifre en az 6 karakter olmalıdır')),
    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('validation.passwordsDoNotMatch', 'Şifreler eşleşmiyor'),
    path: ["confirmPassword"]
  });

  const usernameSchema = z.object({
    username: z.string()
      .min(3, t('validation.usernameMinLength', 'Kullanıcı adı en az 3 karakter olmalıdır'))
      .max(30, t('validation.usernameMaxLength', 'Kullanıcı adı en fazla 30 karakter olabilir'))
      .regex(/^[a-zA-Z0-9_]+$/, t('validation.usernameFormat', 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir'))
  });

  const supportSchema = z.object({
    subject: z.string().min(3, t('validation.subjectMinLength', 'Konu en az 3 karakter olmalıdır')),
    message: z.string().min(10, t('validation.messageMinLength', 'Mesaj en az 10 karakter olmalıdır'))
  });

  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSchema),
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors } } = useForm<PasswordSettingsForm>({
    resolver: zodResolver(passwordSchema),
  });
  
  const { 
    register: registerUsername, 
    handleSubmit: handleUsernameSubmit, 
    formState: { errors: usernameErrors },
    watch: watchUsername
  } = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: ''
    }
  });

  const { 
    register: registerSupport, 
    handleSubmit: handleSupportSubmit, 
    formState: { errors: supportErrors },
    reset: resetSupport
  } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
  });
  
  const username = watchUsername('username');
  const debouncedUsername = useDebounce(username, 500);
  
  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3 || debouncedUsername === profile?.username) {
        setUsernameAvailable(null);
        return;
      }
      
      setIsCheckingUsername(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', debouncedUsername)
          .not('id', 'eq', profile?.id || '')
          .maybeSingle();
        
        setUsernameAvailable(!data);
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setIsCheckingUsername(false);
      }
    };
    
    checkUsernameAvailability();
  }, [debouncedUsername, profile?.id, profile?.username]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id);

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
        setFormData({
          full_name: data[0].full_name || '',
          username: data[0].username || '',
          bio: data[0].bio || '',
          website: data[0].website || '',
          location: data[0].location || ''
        });
        
        // Load notification settings
        setNotificationSettings({
          list_notifications: data[0].list_notifications ?? true,
          follower_notifications: data[0].follower_notifications ?? true,
          message_notifications: data[0].message_notifications ?? true
        });
        
        // Load privacy settings
        setPrivacySettings({
          private_profile: data[0].private_profile ?? false,
          private_lists: data[0].private_lists ?? false,
          show_online_status: data[0].show_online_status ?? true
        });
      }
    };

    fetchProfile();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      setError(t('common.errors.fileTooLarge', 'Dosya boyutu 5MB\'dan küçük olmalıdır.'));
      triggerHaptic('heavy');
      return;
    }

    if (!fileExt || !['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      setError(t('common.errors.invalidFileType', 'Sadece JPG, PNG ve GIF dosyaları yükleyebilirsiniz.'));
      triggerHaptic('heavy');
      return;
    }

    // Dosyayı seç ve kırpma modalını aç
    setSelectedAvatarFile(file);
    setShowAvatarCropper(true);
    setError(null);
    triggerHaptic('light');
  };

  const handleAvatarSave = async (croppedImageBlob: Blob) => {
    try {
      setIsUploadingAvatar(true);
      setShowAvatarCropper(false);
      setError(null);
      triggerHaptic('light');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı');

      const fileExt = selectedAvatarFile?.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar: publicUrl,
          avatar_url: fileName
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar: publicUrl }));
      setSuccess('Profil fotoğrafı başarıyla güncellendi');
      announceToScreenReader('Profil fotoğrafı güncellendi');
      triggerHaptic('medium');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Avatar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      triggerHaptic('heavy');
    } finally {
      setIsUploadingAvatar(false);
      setSelectedAvatarFile(null);
    }
  };

  const handleAvatarCancel = () => {
    setShowAvatarCropper(false);
    setSelectedAvatarFile(null);
  };

  const handleProfileUpdate = async () => {
    if (!profile?.id) {
      setError('Profil bilgisi bulunamadı');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    triggerHaptic('light');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => ({ ...prev, ...formData }));
      setSuccess('Profil bilgileri başarıyla güncellendi');
      announceToScreenReader('Profil bilgileri güncellendi');
      triggerHaptic('medium');
      
      // Başarılı güncelleme sonrası profil sayfasına yönlendir
      setTimeout(() => {
        navigate(`/profile/${formData.username}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Profil güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
      triggerHaptic('heavy');
    } finally {
      setIsSaving(false);
    }
  };
  
  const onUsernameSubmit = async (data: UsernameForm) => {
    if (!usernameAvailable) {
      setError('Bu kullanıcı adı zaten alınmış');
      triggerHaptic('heavy');
      return;
    }
    
    if (!profile?.id) {
      setError('Profil bilgisi bulunamadı');
      return;
    }
    
    setIsUpdatingUsername(true);
    setError(null);
    setSuccess(null);
    triggerHaptic('light');
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: data.username })
        .eq('id', profile.id);
      
      if (updateError) throw updateError;
      
      setProfile(prev => ({ ...prev, username: data.username }));
      setFormData(prev => ({ ...prev, username: data.username }));
      setSuccess('Kullanıcı adı başarıyla güncellendi');
      announceToScreenReader('Kullanıcı adı güncellendi');
      triggerHaptic('medium');
      
      // Kullanıcı adı değiştiğinde profil sayfasına yönlendirme
      setTimeout(() => {
        navigate(`/profile/${data.username}`);
      }, 2000);
    } catch (err) {
      console.error('Error updating username:', err);
      setError('Kullanıcı adı güncellenirken bir hata oluştu');
      triggerHaptic('heavy');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const onEmailSubmit = async (data: EmailSettingsForm) => {
    triggerHaptic('light');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: data.email,
      });

      if (updateError) throw updateError;
      setSuccess('Email adresiniz güncellendi. Lütfen yeni adresinizi doğrulayın.');
      announceToScreenReader('Email adresi güncellendi');
      triggerHaptic('medium');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email güncellenirken bir hata oluştu';
      setError(errorMessage);
      triggerHaptic('heavy');
    }
  };

  const onPasswordSubmit = async (data: PasswordSettingsForm) => {
    triggerHaptic('light');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;
      setSuccess('Şifreniz başarıyla güncellendi');
      announceToScreenReader('Şifre güncellendi');
      triggerHaptic('medium');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Şifre güncellenirken bir hata oluştu';
      setError(errorMessage);
      triggerHaptic('heavy');
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(true);
    triggerHaptic('medium');
  };

  const confirmDelete = async () => {
    if (!deletePassword) {
      setError('Lütfen şifrenizi girin');
      triggerHaptic('heavy');
      return;
    }

    setIsDeleting(true);
    setError(null);
    triggerHaptic('light');

    try {
      // Önce şifreyi doğrula - mevcut kullanıcının email'ini al
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error('Oturum bilgisi bulunamadı');
      }

      // Şifreyi doğrula
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: deletePassword
      });

      if (signInError) {
        throw new Error('Şifre yanlış');
      }

      // Profil verilerini sil (CASCADE ile ilişkili veriler de silinecek)
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id);

      if (deleteProfileError) {
        console.error('Profile deletion error:', deleteProfileError);
      }

      // Kullanıcı hesabını sil (RLS politikası ile kendi hesabını silebilir)
      const { error: deleteUserError } = await supabase.rpc('delete_user_account');

      if (deleteUserError) {
        console.error('User deletion error:', deleteUserError);
        // Eğer RPC fonksiyonu yoksa, sadece çıkış yap
      }

      await supabase.auth.signOut();
      announceToScreenReader('Hesap başarıyla silindi');
      navigate('/auth/login');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Hesap silinirken bir hata oluştu';
      setError(errorMessage);
      triggerHaptic('heavy');
    } finally {
      setIsDeleting(false);
    }
  };

  const onSupportSubmit = async (data: SupportForm) => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    triggerHaptic('light');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı');

      // Netlify Functions + Mailtrap üzerinden ilet
      const recipients = [
        'support@connectlist.me',
        'alperen@connectlist.me',
        'tuna@connectlist.me'
      ];

      const subject = `[Support] ${data.subject}`;
      const html = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2 style=\"margin:0 0 12px;\">Yeni Destek Talebi</h2>
          <p style=\"margin:4px 0;\"><strong>İsim:</strong> ${profile?.full_name || 'Kullanıcı'}</p>
          <p style=\"margin:4px 0;\"><strong>E-posta:</strong> ${session.user.email}</p>
          <p style=\"margin:4px 0 12px;\"><strong>Kullanıcı adı:</strong> ${profile?.username || '-'}</p>
          <hr style=\"border:none; border-top:1px solid #e2e8f0; margin:12px 0;\"/>
          <p style=\"white-space: pre-wrap; margin:12px 0;\">${data.message}</p>
        </div>
      `;
      const text = `Yeni Destek Talebi\nİsim: ${profile?.full_name || 'Kullanıcı'}\nE-posta: ${session.user.email}\nKullanıcı adı: ${profile?.username || '-'}\n----\n${data.message}`;

      const response = await fetch('/.netlify/functions/mailtrap-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: recipients.join(','),
          subject,
          html,
          text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any).error || 'Destek talebi gönderilemedi');
      }

      setSuccess(t('settings.support.success'));
      announceToScreenReader('Destek talebi gönderildi');
      triggerHaptic('medium');
      resetSupport();
    } catch (err) {
      console.error('Error sending support request:', err);
      setError(t('settings.support.error'));
      triggerHaptic('heavy');
    } finally {
      setIsSaving(false);
    }
  };

  // Notification settings update
  const updateNotificationSettings = async (key: keyof NotificationSettings, value: boolean) => {
    if (!profile?.id) return;
    
    triggerHaptic('light');
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', profile.id);
        
      if (updateError) throw updateError;
      announceToScreenReader(`${key} ayarı güncellendi`);
    } catch (err) {
      console.error('Error updating notification settings:', err);
      // Revert on error
      setNotificationSettings(notificationSettings);
      triggerHaptic('heavy');
    }
  };

  // Privacy settings update
  const updatePrivacySettings = async (key: keyof PrivacySettings, value: boolean) => {
    if (!profile?.id) return;
    
    triggerHaptic('light');
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', profile.id);
        
      if (updateError) throw updateError;
      announceToScreenReader(`${key} ayarı güncellendi`);
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      // Revert on error
      setPrivacySettings(privacySettings);
      triggerHaptic('heavy');
    }
  };

  const menuItems = [
   { id: 'account', label: t('settings.account'), icon: Lock },
   { id: 'email', label: t('settings.email'), icon: Mail },
   { id: 'notifications', label: t('settings.notifications'), icon: Bell },
   { id: 'privacy', label: t('settings.privacy'), icon: Shield },
   { id: 'language', label: t('settings.language'), icon: Globe },
   { id: 'support', label: t('settings.support'), icon: HelpCircle },
  ];

  return (
    <>
      <Header />
      {/* Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announceText}
      </div>
      
      <div className="min-h-screen bg-gray-50" style={{
        paddingTop: 'calc(var(--safe-area-inset-top) + var(--header-height) - 35px)',
        paddingBottom: 'calc(var(--safe-area-inset-bottom) + var(--bottom-menu-height))'
      }}>
        <div className="max-w-5xl mx-auto px-2 md:px-6 lg:px-8 pt-0 pb-2 md:py-8">
          <div className="flex flex-col md:flex-row gap-2 md:gap-8">
            {/* Mobile Tab Navigation */}
            <div className="md:hidden bg-white rounded-xl shadow-sm p-2 mb-2 sticky z-10" style={{ top: 'calc(var(--safe-area-inset-top) + var(--header-height))' }}>
              <div className="flex gap-1 overflow-x-auto scrollbar-hide justify-center">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as 'language' | 'support' | 'account' | 'notifications' | 'privacy' | 'security' | 'email');
                        triggerHaptic('light');
                        announceToScreenReader(`${item.label} sekmesine geçildi`);
                      }}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${
                      activeSection === item.id
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      aria-pressed={activeSection === item.id}
                      aria-label={`${item.label} ${t('settings.title')}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:block md:w-64 bg-white rounded-xl shadow-sm p-6 h-fit sticky top-8">
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as 'language' | 'support' | 'account' | 'notifications' | 'privacy' | 'security' | 'email');
                        triggerHaptic('light');
                        announceToScreenReader(`${item.label} sekmesine geçildi`);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all ${
                        activeSection === item.id
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                      aria-pressed={activeSection === item.id}
                      aria-label={`${item.label} ${t('settings.title')}`}
                  >
                      <Icon size={20} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

                <hr className="my-6 border-gray-200" />

              <button
                onClick={handleDeleteAccount}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium text-red-600 hover:bg-red-50 transition-all"
                  aria-label={t('settings.deleteAccount')}
              >
                  <UserMinus size={20} aria-hidden="true" />
               <span>{t('settings.deleteAccount')}</span>
              </button>

            <button
              onClick={async () => {
                    triggerHaptic('medium');
                    announceToScreenReader('Çıkış yapılıyor...');
                await supabase.auth.signOut();
                navigate('/auth/login');
              }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium text-gray-700 hover:bg-gray-50 transition-all"
                  aria-label={t('common.profile.signOut')}
            >
                  <LogOut size={20} aria-hidden="true" />
             <span>{t('common.profile.signOut')}</span>
            </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs">!</span>
                  </div>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  <span className="text-sm font-medium">{success}</span>
                </div>
              )}

              {activeSection === 'account' && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  {/* Profil Fotoğrafı */}
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">{t('settings.profilePhoto')}</h2>
                    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="relative">
                        <img
                          src={profile?.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=${Date.now()}` : 
                              (profile?.avatar_url ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl : null) || 
                              `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || '?'}&backgroundColor=f97316&textColor=ffffff`
                          }
                          alt={t('settings.profilePhoto')}
                          className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover object-center border-4 border-white shadow-lg bg-gray-100"
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || '?'}&backgroundColor=f97316&textColor=ffffff`;
                          }}
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 hover:opacity-100 active:opacity-100 transition-opacity"
                        >
                          <Camera size={24} className="text-white" />
                          <input
                            type="file"
                            id="avatar-upload"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            disabled={isUploadingAvatar}
                            className="hidden"
                          />
                        </label>
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                          <Camera size={14} className="text-white" />
                      </div>
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 mb-1">{t('settings.changePhoto')}</h3>
                        <p className="text-xs md:text-sm text-gray-500">{t('settings.photoRequirements')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Kullanıcı Adı */}
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">{t('settings.username')}</h2>
                    <div className="bg-gray-50 rounded-xl p-4">
                    <form onSubmit={handleUsernameSubmit(onUsernameSubmit)} className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('settings.username')}
                        </label>
                        <div className="relative">
                          <input
                            {...registerUsername('username')}
                            defaultValue={profile?.username}
                            type="text"
                              className={`w-full px-4 py-3 border-2 rounded-xl text-base font-medium transition-all ${
                                usernameAvailable === true ? 'border-green-400 bg-green-50 focus:ring-green-500 focus:border-green-500' :
                                usernameAvailable === false ? 'border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500' :
                                'border-gray-200 bg-white focus:ring-orange-500 focus:border-orange-500'
                            }`}
                            placeholder={t('common.form.enterUsername', 'Kullanıcı adınızı girin')}
                          />
                          {isCheckingUsername && (
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                            </div>
                          )}
                            {usernameAvailable === true && (
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              </div>
                            )}
                            {usernameAvailable === false && (
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✕</span>
                                </div>
                              </div>
                            )}
                        </div>
                        {usernameErrors.username && (
                            <p className="text-red-600 text-sm mt-2 font-medium">{usernameErrors.username.message}</p>
                        )}
                        {username && username.length >= 3 && username !== profile?.username && !usernameErrors.username && (
                            <p className={`text-sm mt-2 font-medium ${
                              usernameAvailable === true ? 'text-green-600' :
                              usernameAvailable === false ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {isCheckingUsername ? t('common.form.checkingUsername', 'Kullanıcı adı kontrol ediliyor...') :
                             usernameAvailable === true ? t('common.form.usernameAvailable', 'Bu kullanıcı adı kullanılabilir') :
                             usernameAvailable === false ? t('common.form.usernameTaken', 'Bu kullanıcı adı zaten alınmış') : ''}
                          </p>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isUpdatingUsername || !usernameAvailable || username === profile?.username || !username}
                          className="w-full md:w-auto px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isUpdatingUsername ? t('common.form.updating', 'Güncelleniyor...') : t('common.form.updateUsername', 'Kullanıcı Adını Güncelle')}
                      </button>
                    </form>
                    </div>
                  </div>

                  {/* Profil Bilgileri */}
                  <div>
                    <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">{t('settings.profileInfo')}</h2>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('settings.fullName')}
                        </label>
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('settings.about')}
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                          placeholder={t('common.form.aboutYourself', 'Kendinizden bahsedin...')}
                        />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('settings.website')}
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('common.form.websiteExample', 'https://example.com')}
                        />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('settings.location')}
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('common.form.locationExample', 'İstanbul, Türkiye')}
                        />
                      </div>
                        <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                            className="w-full bg-orange-500 text-white px-6 py-3 font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {isSaving ? t('common.processing') : t('common.save')}
                        </button>
                      </div>
                    </form>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'email' && (
                <div className="space-y-4">
                  {/* Email Güncelleme */}
                  <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">{t('settings.email')}</h2>
                    <div className="bg-gray-50 rounded-xl p-4">
                    <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('auth.newEmail')}
                        </label>
                        <input
                          {...registerEmail('email')}
                          type="email"
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('common.form.enterEmail', 'E-posta adresinizi girin')}
                        />
                        {emailErrors.email && (
                            <p className="text-red-600 text-sm mt-2 font-medium">{emailErrors.email.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                          className="w-full bg-orange-500 text-white px-6 py-3 font-semibold rounded-xl hover:bg-orange-600 transition-all"
                      >
                        {t('auth.updateEmail')}
                      </button>
                    </form>
                    </div>
                  </div>

                  {/* Şifre Değiştirme */}
                  <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">{t('settings.changePassword', 'Şifre Değiştir')}</h2>
                    <div className="bg-gray-50 rounded-xl p-4">
                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('auth.currentPassword')}
                        </label>
                        <input
                          {...registerPassword('currentPassword')}
                          type="password"
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('settings.enterPassword', 'Şifrenizi girin')}
                        />
                        {passwordErrors.currentPassword && (
                            <p className="text-red-600 text-sm mt-2 font-medium">{passwordErrors.currentPassword.message}</p>
                        )}
                      </div>

                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('auth.newPassword')}
                        </label>
                        <input
                          {...registerPassword('newPassword')}
                          type="password"
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('common.form.enterNewPassword', 'Yeni şifrenizi girin')}
                        />
                        {passwordErrors.newPassword && (
                            <p className="text-red-600 text-sm mt-2 font-medium">{passwordErrors.newPassword.message}</p>
                        )}
                      </div>

                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('auth.confirmPassword')}
                        </label>
                        <input
                          {...registerPassword('confirmPassword')}
                          type="password"
                            className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('common.form.confirmNewPassword', 'Yeni şifrenizi tekrar girin')}
                        />
                        {passwordErrors.confirmPassword && (
                            <p className="text-red-600 text-sm mt-2 font-medium">{passwordErrors.confirmPassword.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                          className="w-full bg-orange-500 text-white px-6 py-3 font-semibold rounded-xl hover:bg-orange-600 transition-all"
                      >
                        {t('auth.updatePassword')}
                      </button>
                    </form>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold mb-6 text-gray-900">{t('settings.notifications')}</h2>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Bell size={18} className="text-orange-600" />
                      </div>
                            <h3 className="font-semibold text-gray-900">{t('settings.notificationSettings.listNotifications', 'Liste Bildirimleri')}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-13">{t('settings.notificationSettings.listNotificationsDesc', 'Listenize yapılan yorumlar ve beğeniler')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={notificationSettings.list_notifications}
                            onChange={(e) => updateNotificationSettings('list_notifications', e.target.checked)}
                            aria-label={t('settings.notificationSettings.listNotifications')}
                          />
                          <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Bell size={18} className="text-blue-600" />
                      </div>
                            <h3 className="font-semibold text-gray-900">{t('settings.notificationSettings.followerNotifications', 'Takipçi Bildirimleri')}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-13">{t('settings.notificationSettings.followerNotificationsDesc', 'Yeni takipçiler')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={notificationSettings.follower_notifications}
                            onChange={(e) => updateNotificationSettings('follower_notifications', e.target.checked)}
                            aria-label={t('settings.notificationSettings.followerNotifications')}
                          />
                          <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Bell size={18} className="text-green-600" />
                      </div>
                            <h3 className="font-semibold text-gray-900">{t('settings.notificationSettings.messageNotifications', 'Mesaj Bildirimleri')}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-13">{t('settings.notificationSettings.messageNotificationsDesc', 'Yeni mesajlar')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={notificationSettings.message_notifications}
                            onChange={(e) => updateNotificationSettings('message_notifications', e.target.checked)}
                            aria-label={t('settings.notificationSettings.messageNotifications')}
                          />
                          <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold mb-6 text-gray-900">{t('settings.privacy')}</h2>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Shield size={18} className="text-purple-600" />
                      </div>
                            <h3 className="font-semibold text-gray-900">{t('settings.privacySettings.profile')}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-13">{t('settings.privacySettings.profileDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={privacySettings.private_profile}
                            onChange={(e) => updatePrivacySettings('private_profile', e.target.checked)}
                            aria-label={t('settings.privacySettings.profile')}
                          />
                          <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Shield size={18} className="text-indigo-600" />
                      </div>
                            <h3 className="font-semibold text-gray-900">{t('settings.privacySettings.list')}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-13">{t('settings.privacySettings.listDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={privacySettings.private_lists}
                            onChange={(e) => updatePrivacySettings('private_lists', e.target.checked)}
                            aria-label={t('settings.privacySettings.list')}
                          />
                          <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <Shield size={18} className="text-emerald-600" />
                      </div>
                            <h3 className="font-semibold text-gray-900">{t('settings.privacySettings.online')}</h3>
                          </div>
                          <p className="text-sm text-gray-600 ml-13">{t('settings.privacySettings.onlineDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={privacySettings.show_online_status}
                            onChange={(e) => updatePrivacySettings('show_online_status', e.target.checked)}
                            aria-label={t('settings.privacySettings.online')}
                          />
                          <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4">{t('settings.privacySettings.legal')}</h3>
                      
                      <div className="space-y-3">
                        <Link to="/privacy-policy" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Shield size={16} className="text-orange-600" />
                          </div>
                          <span className="font-medium text-gray-900">{t('settings.privacySettings.viewPrivacyPolicy')}</span>
                          <span className="ml-auto text-orange-500">→</span>
                        </Link>
                        
                        <Link to="/terms-of-service" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <Shield size={16} className="text-red-600" />
                          </div>
                          <span className="font-medium text-gray-900">{t('settings.privacySettings.viewTerms')}</span>
                          <span className="ml-auto text-orange-500">→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'language' && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-bold mb-6 text-gray-900">{t('settings.language')}</h2>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        {t('settings.languagePreference')}
                      </label>
                      <div className="space-y-3">
                        <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          i18n.language === 'tr' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="language"
                            value="tr"
                            checked={i18n.language === 'tr'}
                        onChange={(e) => {
                              triggerHaptic('light');
                          setLanguage(e.target.value);
                              announceToScreenReader('Dil Türkçe olarak değiştirildi');
                        }}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <Globe size={16} className="text-red-600" />
                    </div>
                            <div>
                              <div className="font-semibold text-gray-900">{t('languages.turkish', 'Türkçe')}</div>
                              <div className="text-sm text-gray-500">Turkish</div>
                  </div>
                          </div>
                          {i18n.language === 'tr' && (
                            <div className="ml-auto w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </label>
                        
                        <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          i18n.language === 'en' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="language"
                            value="en"
                            checked={i18n.language === 'en'}
                            onChange={(e) => {
                              triggerHaptic('light');
                              setLanguage(e.target.value);
                              announceToScreenReader('Language changed to English');
                            }}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Globe size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{t('languages.english', 'English')}</div>
                              <div className="text-sm text-gray-500">İngilizce</div>
                            </div>
                          </div>
                          {i18n.language === 'en' && (
                            <div className="ml-auto w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Dark Mode Toggle */}
                  <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900">{t('settings.appearance', 'Görünüm')}</h2>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {theme === 'dark' ? (
                              <Moon size={16} className="text-gray-600" />
                            ) : (
                              <Sun size={16} className="text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {theme === 'dark' ? t('settings.darkMode', 'Karanlık Mod') : t('settings.lightMode', 'Açık Mod')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {t('settings.themeDescription', 'Uygulamanın görünümünü değiştirin')}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            toggleTheme();
                          }}
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                          style={{
                            backgroundColor: theme === 'dark' ? '#f97316' : '#d1d5db'
                          }}
                        >
                          <span
                            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                            style={{
                              transform: theme === 'dark' ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'support' && (
                <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle size={32} className="text-orange-600" />
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{t('settings.supportForm.title')}</h2>
                    <p className="text-gray-600 text-sm">{t('settings.supportForm.description')}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <form onSubmit={handleSupportSubmit(onSupportSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('settings.supportForm.subject')}
                      </label>
                      <input
                        {...registerSupport('subject')}
                        type="text"
                          className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder={t('settings.supportForm.subjectPlaceholder')}
                      />
                      {supportErrors.subject && (
                          <p className="text-red-600 text-sm mt-2 font-medium">{supportErrors.subject.message}</p>
                      )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('settings.supportForm.message')}
                      </label>
                      <textarea
                        {...registerSupport('message')}
                        rows={6}
                          className="w-full px-4 py-3 border-2 border-gray-200 bg-white rounded-xl text-base font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                        placeholder={t('settings.supportForm.messagePlaceholder')}
                      />
                      {supportErrors.message && (
                          <p className="text-red-600 text-sm mt-2 font-medium">{supportErrors.message.message}</p>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSaving}
                        className="w-full flex items-center justify-center gap-3 bg-orange-500 text-white px-6 py-3 font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                          <span>{t('settings.supportForm.sending')}</span>
                        </>
                      ) : (
                        <>
                            <Send size={18} />
                          <span>{t('settings.supportForm.send')}</span>
                        </>
                      )}
                    </button>
                  </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hesap Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 pb-4 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserMinus size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('settings.deleteAccount')}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
              {t('settings.deleteAccountConfirmation')}
            </p>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 pb-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs">!</span>
                  </div>
                  <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('settings.enterPassword', 'Şifrenizi girin')}
                </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t('settings.enterPassword', 'Şifrenizi girin')}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  autoFocus
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting || !deletePassword}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>{t('common.processing')}</span>
                    </>
                  ) : (
                    <>
                      <UserMinus size={18} />
                      <span>{t('settings.deleteAccount')}</span>
                    </>
                  )}
                </button>
                
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setError(null);
                    triggerHaptic('light');
                }}
                  className="w-full px-4 py-3 text-gray-600 font-semibold hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all"
              >
                {t('common.cancel')}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Kırpma Modalı */}
      {showAvatarCropper && selectedAvatarFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg md:max-w-xl max-h-[92vh] overflow-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('avatar.title', 'Profil Fotoğrafını Düzenle')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('avatar.subtitle', 'Fotoğrafınızı istediğiniz gibi kırpın ve boyutlandırın')}</p>
            </div>
            <div className="p-4">
              <AvatarCropper
                 image={selectedAvatarFile}
                 onSave={handleAvatarSave}
                 onCancel={handleAvatarCancel}
               />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { Settings }
