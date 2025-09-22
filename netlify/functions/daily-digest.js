// nodemailer kaldırıldı; Mailtrap Send API kullanılıyor
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.warn('Supabase credentials missing; skip daily digest');
      return { statusCode: 200, body: 'skipped' };
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch recipients (all users with email for now)
    const { data: users } = await supabase.from('profiles').select('id, email, full_name, language').not('email','is',null);

    // Pick random public lists
    const { data: lists } = await supabase
      .from('lists')
      .select('title, slug, profiles(username), thumbnail')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(25);

    const items = (lists || []).sort(() => Math.random() - 0.5).slice(0, 5).map(l => ({
      title: l.title,
      slug: l.slug,
      ownerUsername: l.profiles?.username,
      thumbnail: l.thumbnail || null,
    }));

    // Setup transporter once
    const token = process.env.MAILTRAP_TOKEN;
    if (!token) {
      console.warn('MAILTRAP_TOKEN missing; skip daily digest');
      return { statusCode: 200, body: 'skipped' };
    }
    const from = process.env.MAIL_FROM || 'ConnectList <noreply@connectlist.me>';

    for (const u of users || []) {
      const lang = (u.language === 'en') ? 'en' : 'tr';
      const subject = lang === 'tr' ? 'Günün keşifleri' : "Today's Discoveries";
      const greet = lang === 'tr' ? 'Merhaba' : 'Hi';
      const view = lang === 'tr' ? 'Görüntüle' : 'View';
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 8px;color:#f97316">${greet} ${u.full_name || ''},</h2>
          ${items.map(l => `
            <div style='display:flex;gap:12px;align-items:center;padding:12px;border-bottom:1px solid #e2e8f0'>
              ${l.thumbnail ? `<img src='${l.thumbnail}' style='width:56px;height:56px;border-radius:8px;object-fit:cover'/>` : `<div style='width:56px;height:56px;border-radius:8px;background:#f1f5f9'></div>`}
              <div style='flex:1'>
                <div style='font-weight:600'>${l.title}</div>
                <a href='https://connectlist.me/${l.ownerUsername}/list/${l.slug}' style='color:#f97316;text-decoration:none;font-size:12px'>${view}</a>
              </div>
            </div>`).join('')}
        </div>`;

      if (!u.email) continue;
      // Parse from into name/email
      let fromName = 'ConnectList';
      let fromEmail = from;
      const m = /^(.*)<([^>]+)>$/.exec(from);
      if (m) {
        fromName = m[1].trim().replace(/\"|\'/g, '') || 'ConnectList';
        fromEmail = m[2].trim();
      }
      const payload = {
        from: { email: fromEmail, name: fromName },
        to: [{ email: u.email }],
        subject,
        html,
        category: 'ConnectList Daily Digest'
      };
      await axios.post('https://send.api.mailtrap.io/api/send', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('daily-digest error', err);
    return { statusCode: 500, body: err.message };
  }
};

