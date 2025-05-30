import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { supabaseBrowser as supabase } from '../../../lib/supabase-browser';

// Resend API anahtarını çevre değişkeninden al
const resend = new Resend(process.env.RESEND_API_KEY || 're_YvwAsYiT_2HzcmKJEsLPQeUCL4WAusyN3');

// E-posta gönderici adresi
const FROM_EMAIL = 'bildirim@connectlist.me';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { commentId, parentCommentId } = req.body;

    // Gerekli alanları kontrol et
    if (!commentId) {
      return res.status(400).json({ error: 'Eksik bilgiler' });
    }

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
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    // Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(id, username)')
      .eq('id', commentData.list_id)
      .single();
      
    if (listError || !listData) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
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
        return res.status(404).json({ error: 'Üst yorum bulunamadı' });
      }
      
      recipientId = parentComment.user_id;
      isReply = true;
    } else {
      // Normal yorum ise, liste sahibine bildirim gönder
      recipientId = listData.user_id;
    }
    
    // Kendi yorumuna yanıt verme durumunu kontrol et
    if (recipientId === commentData.user_id) {
      return res.status(200).json({ 
        success: true, 
        message: 'Kullanıcı kendi yorumuna/listesine yorum yaptı, bildirim gönderilmiyor' 
      });
    }

    // Kullanıcının bildirim tercihini kontrol et
    const preferenceKey = isReply ? 'comment_reply' : 'new_comment';
    const { data: preferences } = await supabase
      .from('user_email_preferences')
      .select(preferenceKey)
      .eq('user_id', recipientId)
      .single();
      
    if (!preferences || !preferences[preferenceKey]) {
      return res.status(200).json({ 
        success: false, 
        message: `Kullanıcı ${preferenceKey} bildirimlerini almak istemiyor` 
      });
    }

    // Alıcı kullanıcının bilgilerini al
    const { data: recipientData } = await supabase
      .from('profiles')
      .select('email, full_name, username')
      .eq('id', recipientId)
      .single();
      
    if (!recipientData || !recipientData.email) {
      return res.status(404).json({ error: 'Alıcı kullanıcı bulunamadı veya e-posta adresi yok' });
    }

    // E-posta gönder
    const subject = isReply 
      ? `${commentData.profiles.full_name} yorumunuza yanıt verdi` 
      : `${commentData.profiles.full_name} "${listData.title}" listenize yorum yaptı`;
      
    const data = await resend.emails.send({
      from: `ConnectList <${FROM_EMAIL}>`,
      to: [recipientData.email],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
          </div>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${recipientData.full_name},</h2>
            
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <img src="${commentData.profiles.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${commentData.profiles.full_name}`}" 
                   alt="${commentData.profiles.full_name}" 
                   style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">
              <div>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${commentData.profiles.full_name}</p>
                <p style="margin: 0; color: #666; font-size: 14px;">@${commentData.profiles.username}</p>
              </div>
            </div>
            
            ${isReply 
              ? `<p>Yorumunuza yanıt verdi:</p>` 
              : `<p>"${listData.title}" listenize yorum yaptı:</p>`}
            
            <div style="background-color: white; border-left: 4px solid #FF5722; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;">${commentData.content}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://connectlist.me/${listData.profiles.username}/list/${listData.slug}" 
                 style="background-color: #FF5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Yorumu Görüntüle
              </a>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #666;">
            <p>Bu e-postayı ConnectList'ten aldınız. E-posta bildirimlerini 
               <a href="https://connectlist.me/settings" style="color: #FF5722;">ayarlar sayfasından</a> yönetebilirsiniz.</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return res.status(500).json({ error: 'E-posta gönderilemedi' });
  }
}
