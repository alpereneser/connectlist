import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { Bell, BellOff, Loader2 } from 'lucide-react';

interface EmailPreferencesProps {
  userId: string;
}

interface EmailPreferences {
  id: string;
  user_id: string;
  new_follower: boolean;
  list_item_added: boolean;
  list_liked: boolean;
  new_comment: boolean;
  comment_reply: boolean;
  new_message: boolean;
  created_at: string;
  updated_at: string;
}

export function EmailPreferences({ userId }: EmailPreferencesProps) {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    async function fetchPreferences() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_email_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          const isNotFound = error.code === 'PGRST116' || error.code === 'PGRST102' || error.details?.includes('No rows found');
          if (isNotFound) {
            const defaultPreferences: Omit<EmailPreferences, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<EmailPreferences, 'id' | 'created_at' | 'updated_at'>> = {
              user_id: userId,
              new_follower: true,
              list_item_added: true,
              list_liked: true,
              new_comment: true,
              comment_reply: true,
              new_message: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { data: inserted, error: insertError } = await supabase
              .from('user_email_preferences')
              .insert(defaultPreferences)
              .select()
              .single();

            if (insertError) {
              console.error('Varsayılan tercihler oluşturulurken hata oluştu:', insertError);
              setError(t('settings.emailPreferences.loadError'));
            } else if (inserted) {
              setPreferences(inserted as EmailPreferences);
            }
          } else {
            console.error('Tercihler yüklenirken hata oluştu:', error);
            setError(t('settings.emailPreferences.loadError'));
          }
        } else if (data) {
          // Eksik alan varsa true'ya tamamla
          const normalised: EmailPreferences = {
            ...data,
            new_follower: data.new_follower ?? true,
            list_item_added: data.list_item_added ?? true,
            list_liked: data.list_liked ?? true,
            new_comment: data.new_comment ?? true,
            comment_reply: data.comment_reply ?? true,
            new_message: data.new_message ?? true,
          };
          setPreferences(normalised);
        }
      } catch (err) {
        console.error('Beklenmeyen hata:', err);
        setError(t('settings.emailPreferences.loadError'));
      } finally {
        setLoading(false);
      }
    }
    
    fetchPreferences();
  }, [userId, t]);

  const updatePreference = async (key: keyof EmailPreferences, value: boolean) => {
    if (!preferences) return;
    
    try {
      setUpdating(key);
      setError(null);
      setSuccess(null);
      
      // Optimistik güncelleme
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);
      
      const { error } = await supabase
        .from('user_email_preferences')
        .update({ 
          [key]: value,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
      if (error) {
        console.error('Tercih güncellenirken hata oluştu:', error);
        setError(t('settings.emailPreferences.updateError'));
        // Hata durumunda eski değere geri dön
        setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
      } else {
        setSuccess(t('settings.emailPreferences.updateSuccess'));
        // 3 saniye sonra başarı mesajını kaldır
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
      setError(t('settings.emailPreferences.updateError'));
      // Hata durumunda eski değere geri dön
      setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {t('settings.emailPreferences.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold mb-2">{t('settings.emailPreferences.title')}</h2>
        <p className="text-gray-600">{t('settings.emailPreferences.description')}</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}
      
      <div className="space-y-4">
        <PreferenceItem
          title={t('settings.emailPreferences.newFollower')}
          description={t('settings.emailPreferences.newFollowerDesc')}
          checked={preferences.new_follower}
          onChange={(value) => updatePreference('new_follower', value)}
          loading={updating === 'new_follower'}
        />
        
        <PreferenceItem
          title={t('settings.emailPreferences.listItemAdded')}
          description={t('settings.emailPreferences.listItemAddedDesc')}
          checked={preferences.list_item_added}
          onChange={(value) => updatePreference('list_item_added', value)}
          loading={updating === 'list_item_added'}
        />
        
        <PreferenceItem
          title={t('settings.emailPreferences.listLiked')}
          description={t('settings.emailPreferences.listLikedDesc')}
          checked={preferences.list_liked}
          onChange={(value) => updatePreference('list_liked', value)}
          loading={updating === 'list_liked'}
        />
        
        <PreferenceItem
          title={t('settings.emailPreferences.newComment')}
          description={t('settings.emailPreferences.newCommentDesc')}
          checked={preferences.new_comment}
          onChange={(value) => updatePreference('new_comment', value)}
          loading={updating === 'new_comment'}
        />
        
        <PreferenceItem
          title={t('settings.emailPreferences.commentReply')}
          description={t('settings.emailPreferences.commentReplyDesc')}
          checked={preferences.comment_reply}
          onChange={(value) => updatePreference('comment_reply', value)}
          loading={updating === 'comment_reply'}
        />
        
        <PreferenceItem
          title={t('settings.emailPreferences.newMessage')}
          description={t('settings.emailPreferences.newMessageDesc')}
          checked={preferences.new_message}
          onChange={(value) => updatePreference('new_message', value)}
          loading={updating === 'new_message'}
        />
      </div>
    </div>
  );
}

interface PreferenceItemProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  loading: boolean;
}

function PreferenceItem({ title, description, checked, onChange, loading }: PreferenceItemProps) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      
      <button
        onClick={() => onChange(!checked)}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
          checked ? 'bg-orange-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
        
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-white animate-spin" />
          </span>
        )}
      </button>
    </div>
  );
}
