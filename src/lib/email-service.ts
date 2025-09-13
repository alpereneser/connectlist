// New Mailtrap-based email service using Netlify function
import { type Lang } from './email-templates';

const MAIL_FROM = import.meta.env.VITE_MAIL_FROM || 'ConnectList <noreply@connectlist.me>';
const FUNCTION_URL = '/.netlify/functions/mailtrap-send';

async function sendByFunction(to: string, subject: string, html: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html, from: MAIL_FROM })
  });
  if (!res.ok) throw new Error(`Mail function error ${res.status}`);
  return await res.json();
}

// Takip bildirimi
export async function sendFollowerNotification(
  recipientEmail: string,
  recipientName: string,
  followerName: string,
  followerUsername: string,
  followerAvatar?: string | null,
  lang: Lang = 'tr'
) {
  const { subject, html } = (await import('./email-templates')).followerTemplate({
    lang,
    recipientName,
    followerName,
    followerUsername,
    followerAvatar,
  });
  return sendByFunction(recipientEmail, subject, html);
}

// Beğenilen listeye yeni öğe
export async function sendListItemAddedNotification(
  recipientEmail: string,
  recipientName: string,
  listTitle: string,
  _listId: string,
  listSlug: string,
  listOwnerUsername: string,
  newItem: { title: string; description?: string; image_url?: string },
  lang: Lang = 'tr'
) {
  const { subject, html } = (await import('./email-templates')).newListTemplate({
    lang,
    recipientName,
    listTitle,
    listSlug,
    ownerUsername: listOwnerUsername,
    ownerName: listOwnerUsername,
    description: newItem.description,
  });
  return sendByFunction(recipientEmail, subject, html);
}

// Yorum bildirimi
export async function sendCommentNotification(
  recipientEmail: string,
  recipientName: string,
  commenterName: string,
  commenterUsername: string,
  _commenterAvatar: string | null,
  listTitle: string,
  _listId: string,
  listSlug: string,
  listOwnerUsername: string,
  commentContent: string,
  isReply: boolean = false,
  lang: Lang = 'tr'
) {
  const subject = isReply
    ? (lang === 'tr' ? `${commenterName} yorumunuza yanıt verdi` : `${commenterName} replied to your comment`)
    : (lang === 'tr' ? `${commenterName} "${listTitle}" listenize yorum yaptı` : `${commenterName} commented on your list "${listTitle}"`);
  const url = `https://connectlist.me/${listOwnerUsername}/list/${listSlug}`;
  const cta = lang === 'tr' ? 'Yorumu Görüntüle' : 'View Comment';
  const greet = lang === 'tr' ? 'Merhaba' : 'Hi';
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
    <h2 style="margin:0 0 8px; color:#f97316">${greet} ${recipientName},</h2>
    <p style="color:#334155">${commentContent}</p>
    <div style="text-align:center;margin-top:16px">
      <a href="${url}" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a>
    </div>
  </div>`;
  return sendByFunction(recipientEmail, subject, html);
}

// Mesaj bildirimi
export async function sendMessageNotification(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  senderUsername: string,
  _senderAvatar: string | null,
  messageContent: string,
  conversationId: string,
  lang: Lang = 'tr'
) {
  const subject = lang === 'tr' ? `${senderName} size yeni bir mesaj gönderdi` : `${senderName} sent you a new message`;
  const url = `https://connectlist.me/messages?conversation=${conversationId}`;
  const cta = lang === 'tr' ? 'Mesaja Yanıt Ver' : 'Reply to Message';
  const greet = lang === 'tr' ? 'Merhaba' : 'Hi';
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
    <h2 style="margin:0 0 8px; color:#f97316">${greet} ${recipientName},</h2>
    <p style="color:#334155">${messageContent}</p>
    <div style="text-align:center;margin-top:16px">
      <a href="${url}" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a>
    </div>
  </div>`;
  return sendByFunction(recipientEmail, subject, html);
}

// Yeni liste bildirimi (takip edilen kullanıcı liste paylaştığında)
export async function sendNewListNotification(
  recipientEmail: string,
  recipientName: string | undefined,
  listTitle: string,
  listSlug: string,
  ownerName: string,
  ownerUsername: string,
  description: string | null,
  _createdAt: string,
  lang: Lang = 'tr'
) {
  const { subject, html } = (await import('./email-templates')).newListTemplate({
    lang,
    recipientName: recipientName || '',
    listTitle,
    listSlug,
    ownerUsername,
    ownerName,
    description: description || undefined,
  });
  return sendByFunction(recipientEmail, subject, html);
}

// Güncellenen liste bildirimi
export async function sendListUpdatedNotification(
  recipientEmail: string,
  recipientName: string,
  listTitle: string,
  listSlug: string,
  ownerUsername: string,
  lang: Lang = 'tr'
) {
  const { subject, html } = (await import('./email-templates')).listUpdatedTemplate({
    lang,
    recipientName,
    listTitle,
    listSlug,
    ownerUsername,
  });
  return sendByFunction(recipientEmail, subject, html);
}

// Günlük keşif e-postası
export async function sendDailyDigestEmail(
  recipientEmail: string,
  recipientName: string,
  lists: Array<{ title: string; slug: string; ownerUsername: string; thumbnail?: string }>,
  lang: Lang = 'tr'
) {
  const { subject, html } = (await import('./email-templates')).dailyDigestTemplate({ lang, recipientName, lists });
  return sendByFunction(recipientEmail, subject, html);
}
