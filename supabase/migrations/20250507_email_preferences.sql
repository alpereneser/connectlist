-- E-posta bildirimleri için tercihler tablosu
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  new_follower BOOLEAN DEFAULT TRUE,
  list_item_added BOOLEAN DEFAULT TRUE,
  new_comment BOOLEAN DEFAULT TRUE,
  comment_reply BOOLEAN DEFAULT TRUE,
  new_message BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Yeni kullanıcı kaydolduğunda otomatik olarak tercihler oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_email_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_email_preferences();

-- RLS politikaları
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi tercihlerini görebilir
CREATE POLICY "Users can view their own email preferences"
  ON public.user_email_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi tercihlerini güncelleyebilir
CREATE POLICY "Users can update their own email preferences"
  ON public.user_email_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi tercihlerini ekleyebilir (genellikle trigger ile yapılır)
CREATE POLICY "Users can insert their own email preferences"
  ON public.user_email_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
