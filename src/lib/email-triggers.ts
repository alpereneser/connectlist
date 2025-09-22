import { supabaseBrowser as supabase } from './supabase-browser';
import { 
  sendFollowerNotification, 
  sendListItemAddedNotification, 
  sendCommentNotification, 
  sendMessageNotification,
  sendNewListNotification,
  sendListLikedNotification
} from './email-service';

// İlişkili profil verisi Supabase'te tekil obje veya dizi gelebilir; güvenli şekilde ilk profili döndür
type ProfileLite = {
  email?: string;
  full_name?: string;
  username?: string;
  avatar?: string;
  language?: string;
};
function getFirstProfile<T extends object = ProfileLite>(profiles: T | T[] | null | undefined): T | null {
  if (!profiles) return null as any;
  return Array.isArray(profiles) ? ((profiles[0] as any) ?? null) : (profiles as any);
}

// Kullanıcı e-posta tercihlerini kontrol et
async function checkEmailPreference(userId: string, preferenceKey: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_email_preferences')
      .select(preferenceKey)
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      console.error('E-posta tercihi kontrol edilirken hata:', error);
      return false;
    }
    
    return (data as any)?.[preferenceKey] === true;
  } catch (error) {
    console.error('E-posta tercihi kontrol edilirken beklenmeyen hata:', error);
    return false;
  }
}

// Kullanıcı bilgilerini al
async function getUserInfo(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name, username, avatar, language')
      .eq('id', userId)
      .single();
      
    if (error || !data) {
      console.error('Kullanıcı bilgileri alınırken hata:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Kullanıcı bilgileri alınırken beklenmeyen hata:', error);
    return null;
  }
}

// Takip bildirimi gönder
export async function triggerFollowerNotification(followedId: string, followerId: string) {
  try {
    // Takip edilen kullanıcının bildirim tercihini kontrol et
    const shouldSendEmail = await checkEmailPreference(followedId, 'new_follower');
    if (!shouldSendEmail) {
      console.log('Kullanıcı takip bildirimlerini almak istemiyor:', followedId);
      return { success: false, reason: 'preference_disabled' };
    }
    
    // Takip edilen ve takip eden kullanıcıların bilgilerini al
    const followedUser = await getUserInfo(followedId);
    const followerUser = await getUserInfo(followerId);
    
    if (!followedUser || !followerUser) {
      console.error('Kullanıcı bilgileri alınamadı');
      return { success: false, reason: 'user_not_found' };
    }
    
    if (!followedUser.email) {
      console.error('Takip edilen kullanıcının e-posta adresi yok');
      return { success: false, reason: 'email_not_found' };
    }
    
    // E-posta gönder
    const result = await sendFollowerNotification(
      followedUser.email,
      followedUser.full_name || '',
      followerUser.full_name || '',
      followerUser.username || '',
      followerUser.avatar ?? null,
      (followedUser as any).language === 'en' ? 'en' : 'tr'
    );
    
    return result;
  } catch (error) {
    console.error('Takip bildirimi gönderilirken hata:', error);
    return { success: false, error };
  }
}

// Liste öğesi ekleme bildirimi gönder
export async function triggerListItemAddedNotification(listId: string, newItemId: string) {
  try {
    // Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(username)')
      .eq('id', listId)
      .single();
    if (listError || !listData) {
      console.error('Liste bilgileri alınamadı:', listError);
      return { success: false, reason: 'list_not_found' };
    }
    const listOwner = getFirstProfile(listData.profiles as any) as ProfileLite | null;

    // Yeni eklenen öğeyi al
    const { data: itemData, error: itemError } = await supabase
      .from('list_items')
      .select('id, title, description, image_url')
      .eq('id', newItemId)
      .single();
    if (itemError || !itemData) {
      console.error('Öğe bilgileri alınamadı:', itemError);
      return { success: false, reason: 'item_not_found' };
    }

    // Liste sahibinin takipçilerini bul
    const { data: followersData, error: followersError } = await supabase
      .from('followers')
      .select('follower_id, profiles(email, full_name, language)')
      .eq('followed_id', listData.user_id);
    if (followersError) {
      console.error('Takipçiler alınamadı:', followersError);
      return { success: false, reason: 'followers_error' };
    }

    // Her takipçiye bildirim gönder
    let sentCount = 0;
    for (const follower of followersData || []) {
      const p = getFirstProfile(follower.profiles as any) as ProfileLite | null;
      const followerId = follower.follower_id;
      // Kullanıcının bildirim tercihini kontrol et
      const shouldSendEmail = await checkEmailPreference(followerId, 'list_item_added');
      if (!shouldSendEmail) continue;
      if (!p?.email) continue;

      await sendListItemAddedNotification(
        p.email,
        p.full_name || '',
        listData.title,
        listData.id,
        listData.slug,
        (listOwner?.username) || '',
        {
          title: itemData.title,
          description: itemData.description,
          image_url: itemData.image_url
        },
        (p?.language === 'en' ? 'en' : 'tr') as any
      );
      sentCount++;
    }

    return { success: true, sent: sentCount };
  } catch (error) {
    console.error('Liste öğesi ekleme bildirimi gönderilirken hata:', error);
    return { success: false, error };
  }
}

// List yorum bildirimi gönder (list_comments tablosu)
export async function triggerListCommentNotification(commentId: string) {
  try {
    // Yorum bilgilerini al
    const { data: commentData, error: commentError } = await supabase
      .from('list_comments')
      .select('id, list_id, user_id, text, parent_id')
      .eq('id', commentId)
      .single();

    if (commentError || !commentData) {
      console.error('List yorumu bilgileri alınamadı:', commentError);
      return { success: false, reason: 'comment_not_found' };
    }

    // Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(username)')
      .eq('id', commentData.list_id)
      .single();

    if (listError || !listData) {
      console.error('Liste bilgileri alınamadı:', listError);
      return { success: false, reason: 'list_not_found' };
    }
    const listOwner = getFirstProfile(listData.profiles as any) as ProfileLite | null;

    // Alıcıyı belirle (yanıtsa üst yorum sahibi, değilse liste sahibi)
    let recipientId: string = listData.user_id;
    let isReply = false;

    if (commentData.parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('list_comments')
        .select('user_id')
        .eq('id', commentData.parent_id)
        .single();

      if (parentError || !parentComment) {
        console.error('Üst list yorumu bilgileri alınamadı:', parentError);
        return { success: false, reason: 'parent_comment_not_found' };
      }

      recipientId = parentComment.user_id;
      isReply = true;
    }

    // Kendi yorumuna/listesine yorum yapmışsa gönderme
    if (recipientId === commentData.user_id) {
      console.log('Kullanıcı kendi listesine/yorumuna yorum yaptı, bildirim gönderilmiyor');
      return { success: true, reason: 'self_comment' };
    }

    // E-posta tercihlerini kontrol et
    const preferenceKey = isReply ? 'comment_reply' : 'new_comment';
    const shouldSendEmail = await checkEmailPreference(recipientId, preferenceKey);
    if (!shouldSendEmail) {
      console.log(`Kullanıcı ${preferenceKey} bildirimlerini almak istemiyor:`, recipientId);
      return { success: false, reason: 'preference_disabled' };
    }

    // Gönderen ve alıcı bilgilerini al
    const sender = await getUserInfo(commentData.user_id);
    const recipient = await getUserInfo(recipientId);

    if (!sender || !recipient) {
      console.error('Kullanıcı bilgileri alınamadı');
      return { success: false, reason: 'user_not_found' };
    }

    if (!recipient.email) {
      console.error('Alıcının e-posta adresi yok');
      return { success: false, reason: 'email_not_found' };
    }

    // E-posta gönder
    const result = await sendCommentNotification(
      recipient.email,
      recipient.full_name || '',
      sender.full_name || '',
      sender.username || '',
      sender.avatar ?? null,
      listData.title,
      listData.id,
      listData.slug,
      listOwner?.username || '',
      commentData.text,
      isReply,
      (recipient as any).language === 'en' ? 'en' : 'tr'
    );

    return result;
  } catch (error) {
    console.error('List yorum bildirimi gönderilirken hata:', error);
    return { success: false, error };
  }
}

// Mesaj bildirimi gönder
export async function triggerMessageNotification(messageId: string) {
  try {
    // Mesaj bilgilerini al
    const { data: messageData, error: messageError } = await supabase
      .from('decrypted_messages') // Şifresi çözülmüş mesajlar tablosunu kullanıyoruz
      .select(`
        id, 
        conversation_id, 
        sender_id, 
        receiver_id, 
        text, 
        created_at
      `)
      .eq('id', messageId)
      .single();
      
    if (messageError || !messageData) {
      console.error('Mesaj bilgileri alınamadı:', messageError);
      return { success: false, reason: 'message_not_found' };
    }
    
    // Alıcının bildirim tercihini kontrol et
    const shouldSendEmail = await checkEmailPreference(messageData.receiver_id, 'new_message');
    if (!shouldSendEmail) {
      console.log('Kullanıcı mesaj bildirimlerini almak istemiyor:', messageData.receiver_id);
      return { success: false, reason: 'preference_disabled' };
    }
    
    // Gönderen ve alıcı kullanıcıların bilgilerini al
    const sender = await getUserInfo(messageData.sender_id);
    const recipient = await getUserInfo(messageData.receiver_id);
    
    if (!sender || !recipient) {
      console.error('Kullanıcı bilgileri alınamadı');
      return { success: false, reason: 'user_not_found' };
    }
    
    if (!recipient.email) {
      console.error('Alıcının e-posta adresi yok');
      return { success: false, reason: 'email_not_found' };
    }
    
    // E-posta gönder
    const result = await sendMessageNotification(
      recipient.email,
      recipient.full_name,
      sender.full_name,
      sender.username,
      sender.avatar,
      messageData.text,
      messageData.conversation_id,
      (recipient as any).language === 'en' ? 'en' : 'tr'
    );
    
    return result;
  } catch (error) {
    console.error('Mesaj bildirimi gönderilirken hata:', error);
    return { success: false, error };
  }
}

// Takip edilen biri yeni bir liste oluşturduğunda takipçilerine mail bildirimi
export async function triggerNewListNotification(listId: string) {
  try {
    // 1. Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, description, created_at, profiles(full_name, username)')
      .eq('id', listId)
      .single();

    if (listError || !listData) {
      console.error('Liste bilgileri alınamadı:', listError);
      return { success: false, reason: 'list_not_found' };
    }
    const listOwner = getFirstProfile(listData.profiles as any) as ProfileLite | null;

    // 2. Listeyi paylaşan kullanıcının takipçilerini bul
    const { data: followersData, error: followersError } = await supabase
      .from('followers')
      .select('follower_id, profiles(email, full_name)')
      .eq('followed_id', listData.user_id);

    if (followersError) {
      console.error('Takipçiler alınamadı:', followersError);
      return { success: false, reason: 'followers_error' };
    }

    // 3. Her takipçiye mail gönder
    let sentCount = 0;
    for (const follower of followersData) {
      const p = getFirstProfile(follower.profiles as any) as ProfileLite | null;
      const email = p?.email;
      const name = p?.full_name;
      if (!email) continue;

      await sendNewListNotification(
        email,
        name,
        listData.title,
        listData.slug,
        listOwner?.full_name || '',
        listOwner?.username || '',
        listData.description,
        listData.created_at,
        'tr'
      );
      sentCount++;
    }

    return { success: true, sent: sentCount };
  } catch (error) {
    console.error('Yeni liste bildirimi gönderilirken hata:', error);
    return { success: false, error };
  }
}

// Takip edilen biri bir listesini güncellediğinde takipçilerine mail bildirimi
export async function triggerListUpdatedNotification(listId: string) {
  try {
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(full_name, username)')
      .eq('id', listId)
      .single();
    if (listError || !listData) return { success: false, reason: 'list_not_found' };
    const listOwner = getFirstProfile(listData.profiles as any) as ProfileLite | null;

    const { data: followersData, error: followersError } = await supabase
      .from('followers')
      .select('follower_id, profiles(email, full_name, language)')
      .eq('followed_id', listData.user_id);
    if (followersError) return { success: false, reason: 'followers_error' };

    let sent = 0;
    for (const follower of followersData || []) {
      const p = getFirstProfile(follower.profiles as any) as ProfileLite | null;
      const email = p?.email;
      const name = p?.full_name || '';
      const lang = p?.language === 'en' ? 'en' : 'tr';
      if (!email) continue;
      await (await import('./email-service')).sendListUpdatedNotification(
        email,
        name,
        listData.title,
        listData.slug,
        (listOwner?.username) || '',
        lang as any
      );
      sent++;
    }
    return { success: true, sent };
  } catch (error) {
    console.error('List updated notification error:', error);
    return { success: false, error };
  }
}

export async function triggerListLikedNotification(listId: string, likerId: string) {
  try {
    // Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(email, full_name, username, language)')
      .eq('id', listId)
      .single();
    if (listError || !listData) return { success: false, reason: 'list_not_found' };
    const ownerProfile = getFirstProfile(listData.profiles as any) as ProfileLite | null;

    // Liste sahibinin tercihlerini kontrol et
    const shouldSend = await checkEmailPreference(listData.user_id, 'list_liked');
    if (!shouldSend) return { success: false, reason: 'preference_disabled' };

    // Beğenen kullanıcı bilgilerini al
    const liker = await getUserInfo(likerId);
    if (!liker || !ownerProfile?.email) return { success: false, reason: 'user_or_email_missing' };

    const lang = (ownerProfile.language === 'en' ? 'en' : 'tr') as any;

    await sendListLikedNotification(
      ownerProfile.email!,
      ownerProfile.full_name || '',
      liker.full_name || '',
      liker.username || '',
      listData.title,
      listData.slug,
      ownerProfile.username || '',
      lang
    );
    return { success: true };
  } catch (error) {
    console.error('List liked notification error:', error);
    return { success: false, error };
  }
}
