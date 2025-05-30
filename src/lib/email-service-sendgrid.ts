import sgMail from '@sendgrid/mail';

// SendGrid API anahtarını ayarla
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// E-posta gönderici adresi
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'info@connectlist.me';

// Takip bildirimi e-postası
export async function sendFollowerNotification(
  recipientEmail: string,
  recipientName: string,
  followerName: string,
  followerUsername: string,
  followerAvatar?: string
) {
  try {
    const msg = {
      from: `ConnectList <${FROM_EMAIL}>`,
      to: recipientEmail,
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
      `
    };
    
    const data = await sgMail.send(msg);
    return { success: true, data };
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return { success: false, error };
  }
}

// Liste öğesi ekleme bildirimi
export async function sendListItemAddedNotification(
  recipientEmail: string,
  recipientName: string,
  listTitle: string,
  listSlug: string,
  listOwnerUsername: string,
  newItem: {
    title: string;
    description?: string;
    image_url?: string;
  }
) {
  try {
    const msg = {
      from: `ConnectList <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `"${listTitle}" listesine yeni bir öğe eklendi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
          </div>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${recipientName},</h2>
            
            <p>Beğendiğiniz <strong>"${listTitle}"</strong> listesine yeni bir öğe eklendi:</p>
            
            <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin: 20px 0;">
              ${newItem.image_url ? 
                `<img src="${newItem.image_url}" alt="${newItem.title}" style="width: 100%; max-height: 200px; object-fit: cover;">` : ''}
              
              <div style="padding: 15px;">
                <h3 style="margin-top: 0; margin-bottom: 10px;">${newItem.title}</h3>
                ${newItem.description ? `<p style="margin: 0; color: #666;">${newItem.description}</p>` : ''}
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://connectlist.me/${listOwnerUsername}/list/${listSlug}" 
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
      `
    };
    
    const data = await sgMail.send(msg);
    return { success: true, data };
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return { success: false, error };
  }
}

// Yorum bildirimi e-postası
export async function sendCommentNotification(
  recipientEmail: string,
  recipientName: string,
  commenterName: string,
  commenterUsername: string,
  commenterAvatar: string | null,
  listTitle: string,
  listSlug: string,
  listOwnerUsername: string,
  commentContent: string,
  isReply: boolean = false
) {
  try {
    const subject = isReply 
      ? `${commenterName} yorumunuza yanıt verdi` 
      : `${commenterName} "${listTitle}" listenize yorum yaptı`;
      
    const msg = {
      from: `ConnectList <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
          </div>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${recipientName},</h2>
            
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <img src="${commenterAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${commenterName}`}" 
                   alt="${commenterName}" 
                   style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">
              <div>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${commenterName}</p>
                <p style="margin: 0; color: #666; font-size: 14px;">@${commenterUsername}</p>
              </div>
            </div>
            
            ${isReply 
              ? `<p>Yorumunuza yanıt verdi:</p>` 
              : `<p>"${listTitle}" listenize yorum yaptı:</p>`}
            
            <div style="background-color: white; border-left: 4px solid #FF5722; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;">${commentContent}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://connectlist.me/${listOwnerUsername}/list/${listSlug}" 
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
      `
    };
    
    const data = await sgMail.send(msg);
    return { success: true, data };
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return { success: false, error };
  }
}

// Mesaj bildirimi e-postası
export async function sendMessageNotification(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  senderUsername: string,
  senderAvatar: string | null,
  messageContent: string,
  conversationId: string
) {
  try {
    const msg = {
      from: `ConnectList <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `${senderName} size yeni bir mesaj gönderdi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://connectlist.me/logo.png" alt="ConnectList Logo" style="max-width: 150px;">
          </div>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #FF5722; margin-top: 0;">Merhaba ${recipientName},</h2>
            
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <img src="${senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`}" 
                   alt="${senderName}" 
                   style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">
              <div>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">${senderName}</p>
                <p style="margin: 0; color: #666; font-size: 14px;">@${senderUsername}</p>
              </div>
            </div>
            
            <p>Size yeni bir mesaj gönderdi:</p>
            
            <div style="background-color: white; border-left: 4px solid #FF5722; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;">${messageContent}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://connectlist.me/messages?conversation=${conversationId}" 
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
      `
    };
    
    const data = await sgMail.send(msg);
    return { success: true, data };
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return { success: false, error };
  }
}

// Test e-postası gönderme fonksiyonu
export async function sendTestEmail(to: string, subject: string, text: string) {
  try {
    const msg = {
      from: `ConnectList <${FROM_EMAIL}>`,
      to,
      subject,
      text
    };
    
    const data = await sgMail.send(msg);
    return { success: true, data };
  } catch (error) {
    console.error('Test e-postası gönderilirken hata oluştu:', error);
    return { success: false, error };
  }
}
