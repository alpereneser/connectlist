-- E-posta bildirimleri için veritabanı tetikleyicileri

-- 1. Takip bildirimleri için tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  should_send BOOLEAN;
  followed_email TEXT;
  followed_name TEXT;
  follower_name TEXT;
  follower_username TEXT;
  follower_avatar TEXT;
BEGIN
  -- Takip edilen kullanıcının e-posta tercihini kontrol et
  SELECT new_follower INTO should_send
  FROM public.user_email_preferences
  WHERE user_id = NEW.followed_id;
  
  -- Tercih yoksa veya devre dışı bırakılmışsa, işlemi sonlandır
  IF should_send IS NULL OR should_send = FALSE THEN
    RETURN NEW;
  END IF;
  
  -- Takip edilen kullanıcının e-posta ve adını al
  SELECT email, full_name INTO followed_email, followed_name
  FROM public.profiles
  WHERE id = NEW.followed_id;
  
  -- Takip eden kullanıcının bilgilerini al
  SELECT full_name, username, avatar INTO follower_name, follower_username, follower_avatar
  FROM public.profiles
  WHERE id = NEW.follower_id;
  
  -- E-posta yoksa işlemi sonlandır
  IF followed_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Edge Function'ı çağır
  PERFORM net.http_post(
    url := 'https://connectlist.me/api/email/follower-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_key', true)
    ),
    body := jsonb_build_object(
      'recipientEmail', followed_email,
      'recipientName', followed_name,
      'followerName', follower_name,
      'followerUsername', follower_username,
      'followerAvatar', follower_avatar
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda işlemi devam ettir, ama hatayı logla
    RAISE WARNING 'Takip bildirimi gönderilirken hata: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Takip tetikleyicisini oluştur
DROP TRIGGER IF EXISTS on_new_follower ON public.follows;
CREATE TRIGGER on_new_follower
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follower();

-- 2. Liste öğesi ekleme bildirimleri için tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_list_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Edge Function'ı çağır
  PERFORM net.http_post(
    url := 'https://connectlist.me/api/email/list-item-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_key', true)
    ),
    body := jsonb_build_object(
      'listId', NEW.list_id,
      'itemId', NEW.id
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda işlemi devam ettir, ama hatayı logla
    RAISE WARNING 'Liste öğesi bildirimi gönderilirken hata: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Liste öğesi tetikleyicisini oluştur
DROP TRIGGER IF EXISTS on_new_list_item ON public.list_items;
CREATE TRIGGER on_new_list_item
  AFTER INSERT ON public.list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_list_item();

-- 3. Yorum bildirimleri için tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Edge Function'ı çağır
  PERFORM net.http_post(
    url := 'https://connectlist.me/api/email/comment-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_key', true)
    ),
    body := jsonb_build_object(
      'commentId', NEW.id,
      'parentCommentId', NEW.parent_comment_id
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda işlemi devam ettir, ama hatayı logla
    RAISE WARNING 'Yorum bildirimi gönderilirken hata: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yorum tetikleyicisini oluştur
DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment();

-- 4. Mesaj bildirimleri için tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Edge Function'ı çağır
  PERFORM net.http_post(
    url := 'https://connectlist.me/api/email/message-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_key', true)
    ),
    body := jsonb_build_object(
      'messageId', NEW.id
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda işlemi devam ettir, ama hatayı logla
    RAISE WARNING 'Mesaj bildirimi gönderilirken hata: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mesaj tetikleyicisini oluştur
DROP TRIGGER IF EXISTS on_new_message ON public.decrypted_messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.decrypted_messages
  FOR EACH ROW
  WHEN (NEW.is_read = FALSE)
  EXECUTE FUNCTION public.handle_new_message();
