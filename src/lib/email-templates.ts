export type Lang = 'tr' | 'en';

const t = (lang: Lang, tr: string, en: string) => (lang === 'tr' ? tr : en);

export function followerTemplate({
  lang,
  recipientName,
  followerName,
  followerUsername,
  followerAvatar,
}: {
  lang: Lang;
  recipientName: string;
  followerName: string;
  followerUsername: string;
  followerAvatar?: string | null;
}) {
  const subject = t(lang, `${followerName} sizi ConnectList'te takip etmeye başladı`, `${followerName} started following you on ConnectList`);
  const profileUrl = `https://connectlist.me/${followerUsername}`;
  const avatar = followerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(followerName)}`;
  const cta = t(lang, 'Profili Görüntüle', 'View Profile');
  const greet = t(lang, 'Merhaba', 'Hi');
  const desc = t(lang, 'Sizi ConnectList\'te takip etmeye başladı!', 'started following you on ConnectList!');

  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
    <h2 style="margin:0 0 16px; color:#f97316">${greet} ${recipientName},</h2>
    <div style="display:flex; gap:12px; align-items:center; background:#f8fafc; border-radius:12px; padding:16px;">
      <img src="${avatar}" alt="${followerName}" style="width:56px;height:56px;border-radius:50%;object-fit:cover" />
      <div>
        <div style="font-weight:700;">${followerName}</div>
        <div style="color:#64748b">@${followerUsername} ${desc}</div>
      </div>
    </div>
    <div style="text-align:center; margin-top:24px;">
      <a href="${profileUrl}" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a>
    </div>
    <p style="color:#64748b; font-size:12px; margin-top:24px; text-align:center">
      ConnectList — <a href="https://connectlist.me/settings" style="color:#f97316">${t(lang,'E-posta tercihlerini yönet','Manage email preferences')}</a>
    </p>
  </div>`;
  return { subject, html };
}

export function newListTemplate({
  lang,
  recipientName,
  listTitle,
  listSlug,
  ownerUsername,
  ownerName,
  description,
}: {
  lang: Lang; recipientName: string; listTitle: string; listSlug: string; ownerUsername: string; ownerName: string; description?: string;
}) {
  const subject = t(lang, `${ownerName} yeni bir liste paylaştı: ${listTitle}`, `${ownerName} shared a new list: ${listTitle}`);
  const url = `https://connectlist.me/${ownerUsername}/list/${listSlug}`;
  const cta = t(lang, 'Listeyi Gör', 'View List');
  const greet = t(lang, 'Merhaba', 'Hi');
  const text = t(lang, 'Yeni liste yayımlandı', 'A new list has been published');
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
    <h2 style="margin:0 0 8px; color:#f97316">${greet} ${recipientName},</h2>
    <p style="margin:0 0 12px; color:#334155">${text}</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
      <div style="font-weight:700;">${listTitle}</div>
      ${description ? `<p style=\"color:#475569;margin:8px 0 0\">${description}</p>` : ''}
    </div>
    <div style="text-align:center; margin-top:16px;">
      <a href="${url}" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a>
    </div>
  </div>`;
  return { subject, html };
}

export function listUpdatedTemplate({
  lang, recipientName, listTitle, listSlug, ownerUsername,
}: { lang: Lang; recipientName: string; listTitle: string; listSlug: string; ownerUsername: string; }) {
  const subject = t(lang, `${listTitle} listesi güncellendi`, `${listTitle} list was updated`);
  const url = `https://connectlist.me/${ownerUsername}/list/${listSlug}`;
  const cta = t(lang, 'Güncellemeyi Gör', 'See Update');
  const greet = t(lang, 'Merhaba', 'Hi');
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
    <h2 style="margin:0 0 8px; color:#f97316">${greet} ${recipientName},</h2>
    <p style="margin:0 0 12px; color:#334155">${t(lang,'Takip ettiğiniz bir liste güncellendi.','A list you follow has been updated.')}</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
      <div style="font-weight:700;">${listTitle}</div>
    </div>
    <div style="text-align:center; margin-top:16px;">
      <a href="${url}" style="background:#f97316;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a>
    </div>
  </div>`;
  return { subject, html };
}

export function dailyDigestTemplate({ lang, recipientName, lists }: { lang: Lang; recipientName: string; lists: Array<{ title: string; slug: string; ownerUsername: string; thumbnail?: string; }> }) {
  const subject = t(lang, 'Günün keşifleri', "Today's Discoveries");
  const greet = t(lang, 'Merhaba', 'Hi');
  const view = t(lang, 'Görüntüle', 'View');
  const htmlItems = lists.map(l => `
    <div style=\"display:flex;gap:12px;align-items:center;padding:12px;border-bottom:1px solid #e2e8f0\">
      ${l.thumbnail ? `<img src='${l.thumbnail}' style='width:56px;height:56px;border-radius:8px;object-fit:cover'/>` : `<div style='width:56px;height:56px;border-radius:8px;background:#f1f5f9'></div>`}
      <div style=\"flex:1\">
        <div style=\"font-weight:600\">${l.title}</div>
        <a href='https://connectlist.me/${l.ownerUsername}/list/${l.slug}' style='color:#f97316;text-decoration:none;font-size:12px'>${view}</a>
      </div>
    </div>`).join('');
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#0f172a">
    <h2 style="margin:0 0 8px; color:#f97316">${greet} ${recipientName},</h2>
    <p style="margin:0 0 12px; color:#334155">${t(lang,'Bugün sizin için seçtiklerimiz:','Handpicked for you today:')}</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${htmlItems}</div>
  </div>`;
  return { subject, html };
}

