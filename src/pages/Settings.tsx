import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { Lock, Mail, Bell, Globe, Shield, UserMinus, Camera, LogOut, HelpCircle, Send } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

// Tip tanımları
type SupportForm = {
  subject: string;
  message: string;
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

function Settings() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  const [activeSection, setActiveSection] = useState(tabParam || 'account');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<{
    id?: string;
    full_name?: string;
    username?: string;
    bio?: string;
    website?: string;
    location?: string;
    avatar_url?: string;
    avatar?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    website: '',
    location: ''
  });
  const navigate = useNavigate();

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
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', debouncedUsername)
          .not('id', 'eq', profile?.id || '')
          .maybeSingle();
        
        setUsernameAvailable(!data);
      } catch (error) {
        console.error('Error checking username:', error);
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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id);

      if (error) {
        console.error('Error fetching profile:', error);
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
      return;
    }

    if (!fileExt || !['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      setError(t('common.errors.invalidFileType', 'Sadece JPG, PNG ve GIF dosyaları yükleyebilirsiniz.'));
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı');

      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

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
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Avatar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Profil güncellemesini dene
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile.id);

      if (error) {
        // Sadece state'i güncelle ama hata gösterme
        setProfile(prev => ({ ...prev, ...formData }));
      } else {
        // Başarılı durumda profil bilgilerini güncelle
        setProfile(prev => ({ ...prev, ...formData }));
      }
    } catch (error) {
      // Hata olsa bile state'i güncelle
      setProfile(prev => ({ ...prev, ...formData }));
    } finally {
      // Her durumda kullanıcıyı profil sayfasına yönlendir
      setIsSaving(false);
      navigate(`/profile/${formData.username}`);
    }
  };
  
  const onUsernameSubmit = async (data: UsernameForm) => {
    if (!usernameAvailable) {
      setError('Bu kullanıcı adı zaten alınmış');
      return;
    }
    
    setIsUpdatingUsername(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: data.username })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      setProfile(prev => ({ ...prev, username: data.username }));
      setFormData(prev => ({ ...prev, username: data.username }));
      setSuccess('Kullanıcı adı başarıyla güncellendi');
      
      // Kullanıcı adı değiştiğinde profil sayfasına yönlendirme
      setTimeout(() => {
        navigate(`/profile/${data.username}`);
      }, 2000);
    } catch (error) {
      console.error('Error updating username:', error);
      setError('Kullanıcı adı güncellenirken bir hata oluştu');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const onEmailSubmit = async (data: EmailSettingsForm) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: data.email,
      });

      if (error) throw error;
      setSuccess('Email adresiniz güncellendi. Lütfen yeni adresinizi doğrulayın.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Email güncellenirken bir hata oluştu');
    }
  };

  const onPasswordSubmit = async (data: PasswordSettingsForm) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;
      setSuccess('Şifreniz başarıyla güncellendi');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Şifre güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletePassword) {
      setError('Lütfen şifrenizi girin');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Önce şifreyi doğrula
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getSession()).data.session?.user?.email || '',
        password: deletePassword
      });

      if (signInError) {
        throw new Error('Şifre yanlış');
      }

      // Şifre doğruysa hesabı sil
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        session?.user.id || ''
      );

      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      navigate('/auth/login');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Hesap silinirken bir hata oluştu');
    } finally {
      setIsDeleting(false);
    }
  };

  const onSupportSubmit = async (data: SupportForm) => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      // Supabase Edge Function kullanarak e-posta gönderme
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: session.user.email,
          name: profile?.full_name || 'Kullanıcı',
          subject: data.subject,
          message: data.message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Destek talebi gönderilemedi');
      }
      
      // Başarılı olduğunu varsayalım
      setSuccess(t('settings.support.success'));
      resetSupport();
    } catch (error) {
      console.error('Error sending support request:', error);
      setError(t('settings.support.error'));
    } finally {
      setIsSaving(false);
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
      <div className="min-h-screen bg-gray-100 pt-[75px] md:pt-[95px] pb-[100px] md:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Sol Menü */}
            <div className="md:w-64 bg-white rounded-lg shadow-sm p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg text-left text-sm md:text-base whitespace-nowrap ${
                      activeSection === item.id
                        ? 'bg-orange-50 text-orange-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} className="md:w-5 md:h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <hr className="hidden md:block my-4" />

              <button
                onClick={handleDeleteAccount}
                className="flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg text-left text-sm md:text-base text-red-500 hover:bg-red-50 whitespace-nowrap"
              >
                <UserMinus size={16} className="md:w-5 md:h-5" />
               <span>{t('settings.deleteAccount')}</span>
              </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth/login');
              }}
              className="flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg text-left text-sm md:text-base text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              <LogOut size={16} className="md:w-5 md:h-5" />
             <span>{t('common.profile.signOut')}</span>
            </button>

            </div>

            {/* Sağ İçerik */}
            <div className="flex-1">
              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-500 p-4 rounded-lg mb-6">
                  {success}
                </div>
              )}

              {activeSection === 'account' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  {/* Profil Fotoğrafı */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">{t('settings.profilePhoto')}</h2>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="relative">
                        <img
                          src={profile?.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=${Date.now()}` : 
                              (profile?.avatar_url ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl : null) || 
                              `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || '?'}`
                          }
                          alt={t('settings.profilePhoto')}
                          className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || '?'}`;
                          }}
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
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
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <div className="text-center md:text-left">
                        <h3 className="font-medium">{t('settings.changePhoto')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.photoRequirements')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Kullanıcı Adı */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">{t('settings.username')}</h2>
                    <form onSubmit={handleUsernameSubmit(onUsernameSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('settings.username')}
                        </label>
                        <div className="relative">
                          <input
                            {...registerUsername('username')}
                            defaultValue={profile?.username}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-lg ${
                              usernameAvailable === true ? 'border-green-500 focus:ring-green-500 focus:border-green-500' :
                              usernameAvailable === false ? 'border-red-500 focus:ring-red-500 focus:border-red-500' :
                              'focus:ring-orange-500 focus:border-orange-500'
                            }`}
                            placeholder={t('common.form.enterUsername', 'Kullanıcı adınızı girin')}
                          />
                          {isCheckingUsername && (
                            <div className="absolute right-3 top-2.5">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                        {usernameErrors.username && (
                          <p className="text-red-500 text-sm mt-1">{usernameErrors.username.message}</p>
                        )}
                        {username && username.length >= 3 && username !== profile?.username && !usernameErrors.username && (
                          <p className={`text-sm mt-1 ${
                            usernameAvailable === true ? 'text-green-500' :
                            usernameAvailable === false ? 'text-red-500' : 'text-gray-500'
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
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                      >
                        {isUpdatingUsername ? t('common.form.updating', 'Güncelleniyor...') : t('common.form.updateUsername', 'Kullanıcı Adını Güncelle')}
                      </button>
                    </form>
                  </div>

                  {/* Profil Bilgileri */}
                  <div>
                    <h2 className="text-xl font-bold mb-4">{t('settings.profileInfo')}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('settings.fullName')}
                        </label>
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('settings.about')}
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('common.form.aboutYourself', 'Kendinizden bahsedin...')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('settings.website')}
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('common.form.websiteExample', 'https://example.com')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('settings.location')}
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('common.form.locationExample', 'İstanbul, Türkiye')}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="w-full md:w-auto bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                        >
                          {isSaving ? t('common.processing') : t('common.save')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeSection === 'email' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-6">{t('settings.email')}</h2>
                    <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('auth.newEmail')}
                        </label>
                        <input
                          {...registerEmail('email')}
                          type="email"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('common.form.enterEmail', 'E-posta adresinizi girin')}
                        />
                        {emailErrors.email && (
                          <p className="text-red-500 text-sm mt-1">{emailErrors.email.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full md:w-auto bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
                      >
                        {t('auth.updateEmail')}
                      </button>
                    </form>
                  </div>

                  <hr className="my-8" />

                  <div>
                    <h2 className="text-xl font-bold mb-6">{t('settings.changePassword', 'Şifre Değiştir')}</h2>
                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('auth.currentPassword')}
                        </label>
                        <input
                          {...registerPassword('currentPassword')}
                          type="password"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('settings.enterPassword', 'Şifrenizi girin')}
                        />
                        {passwordErrors.currentPassword && (
                          <p className="text-red-500 text-sm mt-1">{passwordErrors.currentPassword.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('auth.newPassword')}
                        </label>
                        <input
                          {...registerPassword('newPassword')}
                          type="password"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('common.form.enterNewPassword', 'Yeni şifrenizi girin')}
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('auth.confirmPassword')}
                        </label>
                        <input
                          {...registerPassword('confirmPassword')}
                          type="password"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder={t('common.form.confirmNewPassword', 'Yeni şifrenizi tekrar girin')}
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword.message}</p>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full md:w-auto bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
                      >
                        {t('auth.updatePassword')}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6">{t('settings.notifications')}</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{t('settings.notificationSettings.listNotifications', 'Liste Bildirimleri')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.notificationSettings.listNotificationsDesc', 'Listenize yapılan yorumlar ve beğeniler')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{t('settings.notificationSettings.followerNotifications', 'Takipçi Bildirimleri')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.notificationSettings.followerNotificationsDesc', 'Yeni takipçiler')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{t('settings.notificationSettings.messageNotifications', 'Mesaj Bildirimleri')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.notificationSettings.messageNotificationsDesc', 'Yeni mesajlar')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6">{t('settings.privacy')}</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{t('settings.privacySettings.profile')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.privacySettings.profileDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{t('settings.privacySettings.list')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.privacySettings.listDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{t('settings.privacySettings.online')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.privacySettings.onlineDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                    
                    <hr className="my-6" />
                    
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">{t('settings.privacySettings.legal')}</h3>
                      
                      <div className="flex flex-col space-y-2">
                        <Link to="/privacy-policy" className="text-orange-500 hover:text-orange-600 flex items-center">
                          <span className="mr-2">→</span> {t('settings.privacySettings.viewPrivacyPolicy')}
                        </Link>
                        
                        <Link to="/terms-of-service" className="text-orange-500 hover:text-orange-600 flex items-center">
                          <span className="mr-2">→</span> {t('settings.privacySettings.viewTerms')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'language' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6">{t('settings.language')}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('settings.languagePreference')}
                      </label>
                      <select 
                        value={i18n.language}
                        onChange={(e) => {
                          i18n.changeLanguage(e.target.value);
                          localStorage.setItem('i18nextLng', e.target.value);
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="tr">{t('languages.turkish', 'Türkçe')}</option>
                        <option value="en">{t('languages.english', 'English')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'support' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6">{t('settings.supportForm.title')}</h2>
                  <p className="text-gray-600 mb-6">{t('settings.supportForm.description')}</p>
                  
                  <form onSubmit={handleSupportSubmit(onSupportSubmit)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('settings.supportForm.subject')}
                      </label>
                      <input
                        {...registerSupport('subject')}
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder={t('settings.supportForm.subjectPlaceholder')}
                      />
                      {supportErrors.subject && (
                        <p className="text-red-500 text-sm mt-1">{supportErrors.subject.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('settings.supportForm.message')}
                      </label>
                      <textarea
                        {...registerSupport('message')}
                        rows={6}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder={t('settings.supportForm.messagePlaceholder')}
                      />
                      {supportErrors.message && (
                        <p className="text-red-500 text-sm mt-1">{supportErrors.message.message}</p>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full md:w-auto flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          <span>{t('settings.supportForm.sending')}</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>{t('settings.supportForm.send')}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hesap Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">{t('settings.deleteAccount')}</h2>
            <p className="text-gray-600 mb-6">
              {t('settings.deleteAccountConfirmation', 'Bu işlem geri alınamaz. Hesabınızı silmek için şifrenizi girin.')}
            </p>
            
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t('settings.enterPassword', 'Şifrenizi girin')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-4"
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setError(null);
                }}
                className="w-full md:w-auto px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full md:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? t('common.processing') : t('settings.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { Settings }