import { createClient } from '@supabase/supabase-js';

// Güncel bağlantı bilgileri
const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTQzMzMsImV4cCI6MjA1NjQ5MDMzM30.zwO86rBSmPBYCEmecINSQOHG-0e5_Tsb1ZLucR8QP6Q';

// En basit haliyle Supabase istemcisi
export const supabase = createClient(supabaseUrl, supabaseAnonKey);