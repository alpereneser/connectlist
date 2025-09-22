/**
 * E-posta bildirimleri için yardımcı fonksiyonlar
 */

/**
 * E-posta gönderimi için tip tanımlamaları
 */
export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Bildirim e-postası gönderen fonksiyon
 * @param params E-posta parametreleri
 * @returns API yanıtı
 */
export async function sendNotificationEmail(params: EmailParams): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    // API anahtarı backend'de (Netlify Function) kullanılacak
    const response = await fetch('/.netlify/functions/mailtrap-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('E-posta gönderme hatası:', data);
      return {
        success: false,
        message: data.message || 'E-posta gönderilemedi',
      };
    }

    return {
      success: true,
      message: 'E-posta başarıyla gönderildi',
      id: data.id,
    };
  } catch (error) {
    console.error('E-posta servis hatası:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu',
    };
  }
}

/**
 * Kullanıcı listesine kitap eklendiğinde bildirim gönderen fonksiyon
 * @param toEmail Alıcı e-posta adresi
 * @param userName Kitabı ekleyen kullanıcı adı
 * @param bookTitle Eklenen kitabın başlığı
 * @param listName Liste adı
 * @returns API yanıtı
 */
export async function sendBookAddedNotification(
  toEmail: string,
  userName: string,
  bookTitle: string,
  listName: string
): Promise<{ success: boolean; message: string; id?: string }> {
  const subject = `${userName} "${bookTitle}" kitabını listenize ekledi`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Merhaba!</h2>
      <p><strong>${userName}</strong>, <strong>"${bookTitle}"</strong> kitabını <strong>${listName}</strong> listenize ekledi.</p>
      <p>Listenizi görmek ve diğer kullanıcıların eklediklerini incelemek için <a href="https://connectlist.me">ConnectList</a>'i ziyaret edin.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">Bu e-posta ConnectList tarafından otomatik olarak gönderilmiştir. Bildirim tercihlerinizi değiştirmek için <a href="https://connectlist.me/settings">ayarlar</a> sayfasını ziyaret edin.</p>
    </div>
  `;

  return sendNotificationEmail({
    to: toEmail,
    subject,
    html,
  });
}

/**
 * Yeni yorum bildirimini gönderen fonksiyon
 * @param toEmail Alıcı e-posta adresi
 * @param commenterName Yorum yapan kullanıcı adı
 * @param contentTitle İçerik başlığı (kitap, film, vb.)
 * @param commentText Yorum metni
 * @returns API yanıtı
 */
export async function sendNewCommentNotification(
  toEmail: string,
  commenterName: string,
  contentTitle: string,
  commentText: string
): Promise<{ success: boolean; message: string; id?: string }> {
  const subject = `${commenterName} "${contentTitle}" hakkında yorum yaptı`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Yeni bir yorum var!</h2>
      <p><strong>${commenterName}</strong>, <strong>"${contentTitle}"</strong> hakkında yorum yaptı:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
        "${commentText}"
      </div>
      <p>Yorumu görmek ve yanıtlamak için <a href="https://connectlist.me">ConnectList</a>'i ziyaret edin.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">Bu e-posta ConnectList tarafından otomatik olarak gönderilmiştir. Bildirim tercihlerinizi değiştirmek için <a href="https://connectlist.me/settings">ayarlar</a> sayfasını ziyaret edin.</p>
    </div>
  `;

  return sendNotificationEmail({
    to: toEmail,
    subject,
    html,
  });
}

/**
 * Kullanıcının listesi beğenildiğinde bildirim gönderen fonksiyon
 * @param toEmail Liste sahibinin e-posta adresi
 * @param likerName Listeyi beğenen kullanıcının adı
 * @param listName Beğenilen listenin adı
 * @param listUrl Listenin URL'si (opsiyonel)
 * @returns API yanıtı
 */
export async function sendListLikedNotification(
  toEmail: string,
  likerName: string,
  listName: string,
  listUrl?: string
): Promise<{ success: boolean; message: string; id?: string }> {
  const subject = `${likerName} "${listName}" listenizi beğendi`;
  
  const url = listUrl || 'https://connectlist.me';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Listeniz beğenildi!</h2>
      <p><strong>${likerName}</strong>, <strong>"${listName}"</strong> adlı listenizi beğendi.</p>
      <p>Bu, listenizin başkaları tarafından değerli bulunduğu anlamına gelir. Tebrikler! 🎉</p>
      <p>
        <a href="${url}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
          Listenizi Görüntüle
        </a>
      </p>
      <hr />
      <p style="color: #666; font-size: 12px;">Bu e-posta ConnectList tarafından otomatik olarak gönderilmiştir. Bildirim tercihlerinizi değiştirmek için <a href="https://connectlist.me/settings">ayarlar</a> sayfasını ziyaret edin.</p>
    </div>
  `;

  return sendNotificationEmail({
    to: toEmail,
    subject,
    html,
  });
}

/**
 * Kullanıcı takip edildiğinde bildirim gönderen fonksiyon
 * @param toEmail Takip edilen kullanıcının e-posta adresi
 * @param followerName Takip eden kullanıcının adı
 * @param followerUsername Takip eden kullanıcının kullanıcı adı
 * @param followerProfileUrl Takip eden kullanıcının profil URL'si (opsiyonel)
 * @returns API yanıtı
 */
export async function sendNewFollowerNotification(
  toEmail: string,
  followerName: string,
  followerUsername: string,
  followerProfileUrl?: string
): Promise<{ success: boolean; message: string; id?: string }> {
  const subject = `${followerName} sizi ConnectList'te takip etmeye başladı`;
  
  const url = followerProfileUrl || `https://connectlist.me/${followerUsername}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Yeni bir takipçiniz var!</h2>
      <p><strong>${followerName}</strong> (@${followerUsername}) sizi ConnectList'te takip etmeye başladı.</p>
      <p>Bu, içeriklerinizin ve listelerinizin başkaları tarafından değerli bulunduğu anlamına gelir. Tebrikler! 🎉</p>
      <p>
        <a href="${url}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
          Profili Görüntüle
        </a>
      </p>
      <hr />
      <p style="color: #666; font-size: 12px;">Bu e-posta ConnectList tarafından otomatik olarak gönderilmiştir. Bildirim tercihlerinizi değiştirmek için <a href="https://connectlist.me/settings">ayarlar</a> sayfasını ziyaret edin.</p>
    </div>
  `;

  return sendNotificationEmail({
    to: toEmail,
    subject,
    html,
  });
}
