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
    const { listId, itemId } = req.body;

    // Gerekli alanları kontrol et
    if (!listId || !itemId) {
      return res.status(400).json({ error: 'Eksik bilgiler' });
    }

    // Liste bilgilerini al
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, title, slug, user_id, profiles(username)')
      .eq('id', listId)
      .single();
      
    if (listError || !listData) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }

    // Yeni eklenen öğeyi al
    const { data: itemData, error: itemError } = await supabase
      .from('list_items')
      .select('id, title, description, image_url')
      .eq('id', itemId)
      .single();
      
    if (itemError || !itemData) {
      return res.status(404).json({ error: 'Öğe bulunamadı' });
    }

    // Listeyi beğenen kullanıcıları bul
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('user_id')
      .eq('list_id', listId);
      
    if (likesError) {
      return res.status(500).json({ error: 'Beğeniler alınamadı' });
    }

    // Liste sahibini hariç tut
    const userIds = likesData
      .map(like => like.user_id)
      .filter(userId => userId !== listData.user_id);
      
    if (userIds.length === 0) {
      return res.status(200).json({ success: true, message: 'Bildirim gönderilecek kullanıcı yok' });
    }

    // Her beğenen kullanıcıya bildirim gönder
    let sentCount = 0;
    const results = [];

    for (const userId of userIds) {
      // Kullanıcının bildirim tercihini kontrol et
      const { data: preferences } = await supabase
        .from('user_email_preferences')
        .select('list_item_added')
        .eq('user_id', userId)
        .single();
        
      if (!preferences || !preferences.list_item_added) continue;

      // Kullanıcı bilgilerini al
      const { data: userData } = await supabase
        .from('profiles')
        .select('email, full_name, username')
        .eq('id', userId)
        .single();
        
      if (!userData || !userData.email) continue;

      // E-posta gönder
      try {
        const emailResult = await resend.emails.send({
          from: `ConnectList <${FROM_EMAIL}>`,
          to: [userData.email],
          subject: `"${listData.title}" listesine yeni bir öğe eklendi`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
              </div>
              
              <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${userData.full_name},</h2>
                
                <p>Beğendiğiniz <strong>"${listData.title}"</strong> listesine yeni bir öğe eklendi:</p>
                
                <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin: 20px 0;">
                  ${itemData.image_url ? 
                    `<img src="${itemData.image_url}" alt="${itemData.title}" style="width: 100%; max-height: 200px; object-fit: cover;">` : ''}
                  
                  <div style="padding: 15px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px;">${itemData.title}</h3>
                    ${itemData.description ? `<p style="margin: 0; color: #666;">${itemData.description}</p>` : ''}
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://connectlist.me/${listData.profiles.username}/list/${listData.slug}" 
                     style="background-color: #FF5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Listeyi Görüntüle
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
        
        results.push({ userId, success: true });
        sentCount++;
      } catch (error) {
        console.error(`${userId} kullanıcısına e-posta gönderilirken hata:`, error);
        results.push({ userId, success: false, error });
      }
    }

    return res.status(200).json({ 
      success: true, 
      sentCount, 
      totalUsers: userIds.length,
      results 
    });
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return res.status(500).json({ error: 'E-posta gönderilemedi' });
  }
}
