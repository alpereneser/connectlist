import { NextApiRequest, NextApiResponse } from 'next';
import { sendTestEmail } from '../../../lib/email-service-sendgrid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, text } = req.body;
    
    // Gerekli alanları kontrol et
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Eksik bilgiler' });
    }
    
    // Test e-postası gönder
    const result = await sendTestEmail(to, subject, text);
    
    if (result.success) {
      return res.status(200).json({ success: true, data: result.data });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Test e-postası gönderilirken hata oluştu:', error);
    return res.status(500).json({ error: 'E-posta gönderilemedi' });
  }
}
