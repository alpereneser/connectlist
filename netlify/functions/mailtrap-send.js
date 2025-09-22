const axios = require('axios');

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

    const token = process.env.MAILTRAP_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'MAILTRAP_TOKEN is not set' }),
      };
    }

    // From address parsing: supports "Name <email@domain>" or plain email
    const defaultFrom = process.env.MAIL_FROM || 'ConnectList <noreply@connectlist.me>';
    const fromValue = from || defaultFrom;
    let fromEmail = fromValue;
    let fromName = 'ConnectList';
    const match = /^(.*)<([^>]+)>$/.exec(fromValue);
    if (match) {
      fromName = match[1].trim().replace(/\"|\'/g, '') || 'ConnectList';
      fromEmail = match[2].trim();
    }

    const recipients = Array.isArray(to)
      ? to
      : String(to)
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);

    const payload = {
      from: { email: fromEmail, name: fromName },
      to: recipients.map((email) => ({ email })),
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      category: 'ConnectList Notification',
    };

    const resp = await axios.post('https://send.api.mailtrap.io/api/send', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: resp.data?.message_ids?.[0] || resp.data?.message_id || null }),
    };
  } catch (err) {
    console.error('mailtrap-send error', err?.response?.data || err.message || err);
    const status = err?.response?.status || 500;
    const details = err?.response?.data || { error: err.message };
    return {
      statusCode: status,
      headers,
      body: JSON.stringify({ success: false, error: details?.error || details?.message || 'Unknown error', details }),
    };
  }
};

