const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { to, subject, html, text, from } = body;

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields (to, subject, html/text)' }),
      };
    }

    const host = process.env.MAILTRAP_HOST || 'live.smtp.mailtrap.io';
    const port = parseInt(process.env.MAILTRAP_PORT || '587', 10);
    const user = process.env.MAILTRAP_USER || 'api';
    const pass = process.env.MAILTRAP_TOKEN || '567581ce4dc930849982919d4413687f'; // dev fallback
    const fromAddress = from || process.env.MAIL_FROM || 'ConnectList <noreply@connectlist.me>';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({ from: fromAddress, to, subject, html, text });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: info.messageId }),
    };
  } catch (err) {
    console.error('mailtrap-send error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};

