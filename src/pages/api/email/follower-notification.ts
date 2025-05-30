import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

// Resend API anahtarını çevre değişkeninden al
const resend = new Resend(process.env.RESEND_API_KEY || 're_YvwAsYiT_2HzcmKJEsLPQeUCL4WAusyN3');

// E-posta gönderici adresi
const FROM_EMAIL = 'bildirim@connectlist.me';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      followerName, 
      followerUsername, 
      followerAvatar 
    } = req.body;

    // Gerekli alanları kontrol et
    if (!recipientEmail || !recipientName || !followerName || !followerUsername) {
      return res.status(400).json({ error: 'Eksik bilgiler' });
    }

    // E-posta gönder
    const data = await resend.emails.send({
      from: `ConnectList <${FROM_EMAIL}>`,
      to: [recipientEmail],
      subject: `${followerName} sizi ConnectList'te takip etmeye başladı`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
          </div>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${recipientName},</h2>
            
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <img src="${followerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${followerName}`}" 
                   alt="${followerName}" 
                   style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">
              <div>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${followerName}</p>
                <p style="margin: 0; color: #666; font-size: 14px;">@${followerUsername}</p>
              </div>
            </div>
            
            <p>Sizi ConnectList'te takip etmeye başladı!</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://connectlist.me/${followerUsername}" 
                 style="background-color: #FF5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Profili Görüntüle
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
