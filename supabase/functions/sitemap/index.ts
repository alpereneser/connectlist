import { supabase } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Ana Sayfa -->
  <url>
    <loc>https://connectlist.me/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Kategori Sayfaları -->
  <url>
    <loc>https://connectlist.me/search?category=movies</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://connectlist.me/search?category=series</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://connectlist.me/search?category=books</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://connectlist.me/search?category=games</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://connectlist.me/search?category=people</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://connectlist.me/search?category=videos</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

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

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': 'https://connectlist.me',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
});