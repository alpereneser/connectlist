import { supabaseBrowser as supabase } from './supabase-browser';

export async function generateDynamicSitemap() {
  try {
    // Listeleri getir
    const { data: lists } = await supabase
      .from('lists')
      .select('id, title, updated_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Kullanıcı profillerini getir
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .order('created_at', { ascending: false });

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Liste URL'lerini ekle
    lists?.forEach(list => {
      const slug = list.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      sitemap += `
  <url>
    <loc>https://connectlist.me/list/${list.id}/${slug}</loc>
    <lastmod>${new Date(list.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // Profil URL'lerini ekle
    profiles?.forEach(profile => {
      sitemap += `
  <url>
    <loc>https://connectlist.me/profile/${profile.username}</loc>
    <lastmod>${new Date(profile.updated_at).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';
    return sitemap;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return null;
  }
}