import { supabaseBrowser as supabase } from './supabase-browser';
import { 
  sendFollowerNotification, 
  sendListItemAddedNotification, 
  sendCommentNotification, 
  sendMessageNotification,
  sendNewListNotification
} from './email-service';

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
    
    return data[preferenceKey] === true;
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
      followedUser.full_name,
      followerUser.full_name,
      followerUser.username,
      followerUser.avatar,
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
    
    // Listeyi beğenen kullanıcıları bul
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('user_id')
      .eq('list_id', listId);
      
    if (likesError) {
      console.error('Beğenen kullanıcılar alınamadı:', likesError);
      return { success: false, reason: 'likes_error' };
    }
    
    // Liste sahibini hariç tut
    const userIds = likesData
      .map(like => like.user_id)
      .filter(userId => userId !== listData.user_id);
      
    if (userIds.length === 0) {
      console.log('Bildirim gönderilecek kullanıcı yok');
      return { success: true, sent: 0 };
    }
    
    // Her beğenen kullanıcıya bildirim gönder
    let sentCount = 0;
    for (const userId of userIds) {
      // Kullanıcının bildirim tercihini kontrol et
      const shouldSendEmail = await checkEmailPreference(userId, 'list_item_added');
      if (!shouldSendEmail) continue;
      
      const user = await getUserInfo(userId);
      if (!user || !user.email) continue;
      
      // E-posta gönder
      await sendListItemAddedNotification(
        user.email,
        user.full_name,
        listData.title,
        listData.id,
        listData.slug,
        listData.profiles.username,
        {
          title: itemData.title,
          description: itemData.description,
          image_url: itemData.image_url
        },
        (user as any).language === 'en' ? 'en' : 'tr'
      );
      
      sentCount++;
    }
    
    return { success: true, sent: sentCount };
  } catch (error) {
    console.error('Liste öğesi ekleme bildirimi gönderilirken hata:', error);
    return { success: false, error };
  }
}

// Yorum bildirimi gönder
export async function triggerCommentNotification(
  commentId: string, 
  parentCommentId: string | null = null
) {
  try {
    // Yorum bilgilerini al
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select(`
        id, 
        list_id, 
        user_id, 
        content, 
        parent_comment_id,
        profiles(id, full_name, username, avatar)
      `)
      .eq('id', commentId)
      .single();
      
    if (commentError || !commentData) {
      console.error('Yorum bilgileri alınamadı:', commentError);
      return { success: false, reason: 'comment_not_found' };
    }
    
    // Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(id, username)')
      .eq('id', commentData.list_id)
      .single();
      
    if (listError || !listData) {
      console.error('Liste bilgileri alınamadı:', listError);
      return { success: false, reason: 'list_not_found' };
    }
    
    let recipientId: string;
    let isReply = false;
    
    if (parentCommentId) {
      // Bu bir yanıt ise, üst yorumun sahibine bildirim gönder
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();
        
      if (parentError || !parentComment) {
        console.error('Üst yorum bilgileri alınamadı:', parentError);
        return { success: false, reason: 'parent_comment_not_found' };
      }
      
      recipientId = parentComment.user_id;
      isReply = true;
    } else {
      // Normal yorum ise, liste sahibine bildirim gönder
      recipientId = listData.user_id;
    }
    
    // Kendi yorumuna yanıt verme durumunu kontrol et
    if (recipientId === commentData.user_id) {
      console.log('Kullanıcı kendi yorumuna/listesine yorum yaptı, bildirim gönderilmiyor');
      return { success: true, reason: 'self_comment' };
    }
    
    // Kullanıcının bildirim tercihini kontrol et
    const preferenceKey = isReply ? 'comment_reply' : 'new_comment';
    const shouldSendEmail = await checkEmailPreference(recipientId, preferenceKey);
    
    if (!shouldSendEmail) {
      console.log(`Kullanıcı ${preferenceKey} bildirimlerini almak istemiyor:`, recipientId);
      return { success: false, reason: 'preference_disabled' };
    }
    
    // Alıcı kullanıcının bilgilerini al
    const recipient = await getUserInfo(recipientId);
    if (!recipient || !recipient.email) {
      console.error('Alıcı kullanıcı bilgileri alınamadı');
      return { success: false, reason: 'recipient_not_found' };
    }
    
    // E-posta gönder
    const result = await sendCommentNotification(
      recipient.email,
      recipient.full_name,
      commentData.profiles.full_name,
      commentData.profiles.username,
      commentData.profiles.avatar,
      listData.title,
      listData.id,
      listData.slug,
      listData.profiles.username,
      commentData.content,
      isReply,
      (recipient as any).language === 'en' ? 'en' : 'tr'
    );
    
    return result;
  } catch (error) {
    console.error('Yorum bildirimi gönderilirken hata:', error);
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
      const email = follower.profiles?.email;
      const name = follower.profiles?.full_name;
      if (!email) continue;

      await sendNewListNotification(
        email,
        name,
        listData.title,
        listData.slug,
        listData.profiles.full_name,
        listData.profiles.username,
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

    const { data: followersData, error: followersError } = await supabase
      .from('followers')
      .select('follower_id, profiles(email, full_name, language)')
      .eq('followed_id', listData.user_id);
    if (followersError) return { success: false, reason: 'followers_error' };

    let sent = 0;
    for (const follower of followersData || []) {
      const email = follower.profiles?.email;
      const name = follower.profiles?.full_name || '';
      const lang = follower.profiles?.language === 'en' ? 'en' : 'tr';
      if (!email) continue;
      await (await import('./email-service')).sendListUpdatedNotification(
        email,
        name,
        listData.title,
        listData.slug,
        listData.profiles.username,
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
