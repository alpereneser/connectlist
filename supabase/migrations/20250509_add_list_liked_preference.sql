-- Liste beğeni bildirimi tercihi ekle
ALTER TABLE public.user_email_preferences 
ADD COLUMN IF NOT EXISTS list_liked BOOLEAN DEFAULT TRUE;

-- Mevcut kullanıcılar için varsayılan değeri ayarla
UPDATE public.user_email_preferences 
SET list_liked = TRUE 
WHERE list_liked IS NULL;