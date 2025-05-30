import { NextApiRequest, NextApiResponse } from 'next';
import { sendCommentNotification } from '../../../lib/email-service-sendgrid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      commenterName, 
      commenterUsername, 
      commenterAvatar,
      listTitle,
      listSlug,
      listOwnerUsername,
      commentContent,
      isReply
    } = req.body;

    // Gerekli alanları kontrol et
    if (!recipientEmail || !recipientName || !commenterName || !commenterUsername || !listTitle || !commentContent) {
      return res.status(400).json({ error: 'Eksik bilgiler' });
    }

    // E-posta gönder
    const result = await sendCommentNotification(
      recipientEmail,
      recipientName,
      commenterName,
      commenterUsername,
      commenterAvatar,
      listTitle,
      listSlug,
      listOwnerUsername,
      commentContent,
      isReply
    );

    if (result.success) {
      return res.status(200).json({ success: true, data: result.data });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    return res.status(500).json({ error: 'E-posta gönderilemedi' });
  }
}
