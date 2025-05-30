-- SendGrid ile e-posta bildirimleri için veritabanı tetikleyicileri (Güncellenmiş Versiyon)

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
    url := 'https://connectlist.me/api/email/follower-notification-sendgrid',
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
DECLARE
  list_title TEXT;
  list_slug TEXT;
  list_owner_username TEXT;
  item_title TEXT;
  item_description TEXT;
  item_image_url TEXT;
  user_id TEXT;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Liste bilgilerini al
  SELECT title, slug, owner_id INTO list_title, list_slug, user_id
  FROM public.lists
  WHERE id = NEW.list_id;
  
  -- Liste sahibinin kullanıcı adını al
  SELECT username INTO list_owner_username
  FROM public.profiles
  WHERE id = user_id;
  
  -- Öğe bilgilerini al
  SELECT title, description, image_url INTO item_title, item_description, item_image_url
  FROM public.list_items
  WHERE id = NEW.id;
  
  -- Listeyi beğenen kullanıcıları bul ve her birine bildirim gönder
  FOR user_id, user_email, user_name IN
    SELECT p.id, p.email, p.full_name
    FROM public.list_likes ll
    JOIN public.profiles p ON ll.user_id = p.id
    JOIN public.user_email_preferences uep ON p.id = uep.user_id
    WHERE ll.list_id = NEW.list_id
    AND uep.list_item_added = TRUE
  LOOP
    -- Edge Function'ı çağır
    PERFORM net.http_post(
      url := 'https://connectlist.me/api/email/list-item-notification-sendgrid',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.api_key', true)
      ),
      body := jsonb_build_object(
        'recipientEmail', user_email,
        'recipientName', user_name,
        'listTitle', list_title,
        'listSlug', list_slug,
        'listOwnerUsername', list_owner_username,
        'newItem', jsonb_build_object(
          'title', item_title,
          'description', item_description,
          'image_url', item_image_url
        )
      )
    );
  END LOOP;
  
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
DECLARE
  list_id TEXT;
  list_title TEXT;
  list_slug TEXT;
  list_owner_id TEXT;
  list_owner_username TEXT;
  recipient_id TEXT;
  recipient_email TEXT;
  recipient_name TEXT;
  commenter_name TEXT;
  commenter_username TEXT;
  commenter_avatar TEXT;
  is_reply BOOLEAN;
BEGIN
  -- Yorum bilgilerini al
  SELECT l.id, l.title, l.slug, l.owner_id, p.username 
  INTO list_id, list_title, list_slug, list_owner_id, list_owner_username
  FROM public.list_comments c
  JOIN public.lists l ON c.list_id = l.id
  JOIN public.profiles p ON l.owner_id = p.id
  WHERE c.id = NEW.id;
  
  -- Yorumu yapan kullanıcının bilgilerini al
  SELECT full_name, username, avatar 
  INTO commenter_name, commenter_username, commenter_avatar
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Yanıt mı yoksa yeni yorum mu kontrol et
  is_reply := NEW.parent_id IS NOT NULL;
  
  IF is_reply THEN
    -- Yanıt ise, üst yorumun sahibine bildirim gönder
    SELECT user_id INTO recipient_id
    FROM public.list_comments
    WHERE id = NEW.parent_id;
  ELSE
    -- Yeni yorum ise, liste sahibine bildirim gönder
    recipient_id := list_owner_id;
  END IF;
  
  -- Kendine yorum/yanıt yapılmışsa bildirim gönderme
  IF recipient_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Alıcının e-posta tercihini kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM public.user_email_preferences
    WHERE user_id = recipient_id
    AND (
      (is_reply AND comment_reply = TRUE) OR
      (NOT is_reply AND new_comment = TRUE)
    )
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Alıcının e-posta ve adını al
  SELECT email, full_name INTO recipient_email, recipient_name
  FROM public.profiles
  WHERE id = recipient_id;
  
  -- E-posta yoksa işlemi sonlandır
  IF recipient_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Edge Function'ı çağır
  PERFORM net.http_post(
    url := 'https://connectlist.me/api/email/comment-notification-sendgrid',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_key', true)
    ),
    body := jsonb_build_object(
      'recipientEmail', recipient_email,
      'recipientName', recipient_name,
      'commenterName', commenter_name,
      'commenterUsername', commenter_username,
      'commenterAvatar', commenter_avatar,
      'listTitle', list_title,
      'listSlug', list_slug,
      'listOwnerUsername', list_owner_username,
      'commentContent', NEW.text,
      'isReply', is_reply
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
DROP TRIGGER IF EXISTS on_new_comment ON public.list_comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.list_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment();

-- 4. Mesaj bildirimleri için tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id TEXT;
  recipient_email TEXT;
  recipient_name TEXT;
  sender_name TEXT;
  sender_username TEXT;
  sender_avatar TEXT;
BEGIN
  -- Mesaj alıcısının ID'sini al
  SELECT 
    CASE 
      WHEN NEW.sender_id = c.user1_id THEN c.user2_id
      ELSE c.user1_id
    END INTO recipient_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;
  
  -- Alıcının e-posta tercihini kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM public.user_email_preferences
    WHERE user_id = recipient_id
    AND new_message = TRUE
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Alıcının e-posta ve adını al
  SELECT email, full_name INTO recipient_email, recipient_name
  FROM public.profiles
  WHERE id = recipient_id;
  
  -- Gönderenin bilgilerini al
  SELECT full_name, username, avatar INTO sender_name, sender_username, sender_avatar
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- E-posta yoksa işlemi sonlandır
  IF recipient_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Edge Function'ı çağır
  PERFORM net.http_post(
    url := 'https://connectlist.me/api/email/message-notification-sendgrid',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.api_key', true)
    ),
    body := jsonb_build_object(
      'recipientEmail', recipient_email,
      'recipientName', recipient_name,
      'senderName', sender_name,
      'senderUsername', sender_username,
      'senderAvatar', sender_avatar,
      'messageContent', NEW.content,
      'conversationId', NEW.conversation_id
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
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_read = FALSE)
  EXECUTE FUNCTION public.handle_new_message();
