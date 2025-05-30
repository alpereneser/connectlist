import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

export function useRequireAuth() {
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const { t } = useTranslation();

  const requireAuth = async (action: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setAuthMessage(t('auth.requireAuthMessage', { action }));
      setShowAuthPopup(true);
      return false;
    }
    
    return true;
  };

  return {
    requireAuth,
    showAuthPopup,
    setShowAuthPopup,
    authMessage
  };
}