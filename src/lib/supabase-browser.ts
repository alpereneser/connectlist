import { createClient } from '@supabase/supabase-js';

// Sabit değerler kullanıyoruz
const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTQzMzMsImV4cCI6MjA1NjQ5MDMzM30.zwO86rBSmPBYCEmecINSQOHG-0e5_Tsb1ZLucR8QP6Q';

// Browser tarafında kullanılacak Supabase istemcisi
export const createBrowserClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'app-auth-' + supabaseUrl,
      storage: window.localStorage
    },
    global: {
      headers: {
        'X-Client-Info': 'connectlist-web'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 40
      },
      // Realtime bağlantısını daha güvenilir hale getir
      timeout: 30000, // 30 saniye timeout
      reconnectAfterMs: (retryCount: number) => Math.min(1000 * (retryCount + 1), 10000)
    }
  });
};

// Doğrudan kullanım için bir istemci örneği
export const supabaseBrowser = createBrowserClient();