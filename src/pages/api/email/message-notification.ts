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
    const { messageId } = req.body;

    // Gerekli alanları kontrol et
    if (!messageId) {
      return res.status(400).json({ error: 'Eksik bilgiler' });
    }

    // Mesaj bilgilerini al
    const { data: messageData, error: messageError } = await supabase
      .from('decrypted_messages')
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
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }

    // Alıcının bildirim tercihini kontrol et
    const { data: preferences } = await supabase
      .from('user_email_preferences')
      .select('new_message')
      .eq('user_id', messageData.receiver_id)
      .single();
      
    if (!preferences || !preferences.new_message) {
      return res.status(200).json({ 
        success: false, 
        message: 'Kullanıcı mesaj bildirimlerini almak istemiyor' 
      });
    }

    // Gönderen ve alıcı kullanıcıların bilgilerini al
    const { data: senderData } = await supabase
      .from('profiles')
      .select('full_name, username, avatar')
      .eq('id', messageData.sender_id)
      .single();
      
    const { data: recipientData } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', messageData.receiver_id)
      .single();
      
    if (!senderData || !recipientData) {
      return res.status(404).json({ error: 'Kullanıcı bilgileri bulunamadı' });
    }
    
    if (!recipientData.email) {
      return res.status(404).json({ error: 'Alıcının e-posta adresi yok' });
    }

    // E-posta gönder
    const data = await resend.emails.send({
      from: `ConnectList <${FROM_EMAIL}>`,
      to: [recipientData.email],
      subject: `${senderData.full_name} size yeni bir mesaj gönderdi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
          </div>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${recipientData.full_name},</h2>
            
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <img src="${senderData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${senderData.full_name}`}" 
                   alt="${senderData.full_name}" 
                   style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">
              <div>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${senderData.full_name}</p>
                <p style="margin: 0; color: #666; font-size: 14px;">@${senderData.username}</p>
              </div>
            </div>
            
            <p>Size yeni bir mesaj gönderdi:</p>
            
            <div style="background-color: white; border-left: 4px solid #FF5722; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;">${messageData.text}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://connectlist.me/messages?conversation=${messageData.conversation_id}" 
                 style="background-color: #FF5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Mesaja Yanıt Ver
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
