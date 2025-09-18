-- Content comments tablosu (filmler, diziler, kitaplar vb. için yorumlar)
CREATE TABLE IF NOT EXISTS public.content_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series', 'book', 'game', 'person', 'place')),
  content_id TEXT NOT NULL, -- TMDB ID, Google Books ID vb.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.content_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

-- Herkes yorumları görebilir
CREATE POLICY "Anyone can view content comments"
  ON public.content_comments
  FOR SELECT
  USING (true);

-- Kullanıcılar kendi yorumlarını ekleyebilir
CREATE POLICY "Users can insert their own content comments"
  ON public.content_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi yorumlarını güncelleyebilir
CREATE POLICY "Users can update their own content comments"
  ON public.content_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Kullanıcılar kendi yorumlarını silebilir
CREATE POLICY "Users can delete their own content comments"
  ON public.content_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- İndeksler
CREATE INDEX IF NOT EXISTS content_comments_content_type_id_idx ON public.content_comments(content_type, content_id);
CREATE INDEX IF NOT EXISTS content_comments_user_id_idx ON public.content_comments(user_id);
CREATE INDEX IF NOT EXISTS content_comments_parent_comment_id_idx ON public.content_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS content_comments_created_at_idx ON public.content_comments(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_comments_updated_at
    BEFORE UPDATE ON public.content_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();