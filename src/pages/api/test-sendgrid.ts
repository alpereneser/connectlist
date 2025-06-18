import type { NextApiRequest, NextApiResponse } from 'next';
import { sendFollowerNotification } from '../../lib/email-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-posta adresi gerekli' });
  }

  try {
    const result = await sendFollowerNotification(
      email,
      'Test Kullanıcı',
      'Takipçi Adı',
      'takipci_username'
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error?.toString() });
  }
} 