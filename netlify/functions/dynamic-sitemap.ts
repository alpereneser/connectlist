import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  images?: Array<{
    url: string;
    caption?: string;
    title?: string;
  }>;
}

const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const escapeXML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const generateXMLSitemap = (entries: SitemapEntry[]): string => {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  const xmlFooter = `</urlset>`;

  const urlEntries = entries.map(entry => {
    let xml = `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>`;

    // Add image entries if available
    if (entry.images && entry.images.length > 0) {
      entry.images.forEach(image => {
        xml += `
    <image:image>
      <image:loc>${image.url}</image:loc>`;
        if (image.caption) {
          xml += `
      <image:caption>${escapeXML(image.caption)}</image:caption>`;
        }
        if (image.title) {
          xml += `
      <image:title>${escapeXML(image.title)}</image:title>`;
        }
        xml += `
    </image:image>`;
      });
    }

    xml += `
  </url>`;
    return xml;
  }).join('\n');

  return `${xmlHeader}\n${urlEntries}\n${xmlFooter}`;
};

export const handler: Handler = async (event, context) => {
  const { path } = event;
  const BASE_URL = 'https://connectlist.me';

  try {
    let entries: SitemapEntry[] = [];

    // Determine sitemap type from path
    if (path.includes('sitemap-movies.xml')) {
      // Movies sitemap
      const { data: movies } = await supabase
        .from('movie_details')
        .select('id, title, release_date, poster_path, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (movies) {
        entries = movies.map(movie => {
          const slug = createSlug(movie.title);
          const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
          
          return {
            url: `${BASE_URL}/movie/${movie.id}/${slug}`,
            lastmod: movie.created_at || new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.8,
            images: movie.poster_path ? [{
              url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              caption: `${movie.title} ${year ? `(${year})` : ''} poster`,
              title: movie.title
            }] : undefined
          };
        });
      }
    } 
    else if (path.includes('sitemap-series.xml')) {
      // Series sitemap
      const { data: series } = await supabase
        .from('series_details')
        .select('id, title, first_air_date, poster_path, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (series) {
        entries = series.map(show => {
          const slug = createSlug(show.title);
          const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : '';
          
          return {
            url: `${BASE_URL}/series/${show.id}/${slug}`,
            lastmod: show.created_at || new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.8,
            images: show.poster_path ? [{
              url: `https://image.tmdb.org/t/p/w500${show.poster_path}`,
              caption: `${show.title} ${year ? `(${year})` : ''} poster`,
              title: show.title
            }] : undefined
          };
        });
      }
    }
    else if (path.includes('sitemap-books.xml')) {
      // Books sitemap
      const { data: books } = await supabase
        .from('book_details')
        .select('id, title, published_date, image_links, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (books) {
        entries = books.map(book => {
          const slug = createSlug(book.title);
          
          return {
            url: `${BASE_URL}/book/${book.id}/${slug}`,
            lastmod: book.created_at || new Date().toISOString(),
            changefreq: 'monthly',
            priority: 0.7,
            images: book.image_links?.large || book.image_links?.thumbnail ? [{
              url: book.image_links.large || book.image_links.thumbnail,
              caption: `${book.title} book cover`,
              title: book.title
            }] : undefined
          };
        });
      }
    }
    else if (path.includes('sitemap-games.xml')) {
      // Games sitemap
      const { data: games } = await supabase
        .from('game_details')
        .select('id, name, released, background_image, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (games) {
        entries = games.map(game => {
          const slug = createSlug(game.name);
          const year = game.released ? new Date(game.released).getFullYear() : '';
          
          return {
            url: `${BASE_URL}/game/${game.id}/${slug}`,
            lastmod: game.created_at || new Date().toISOString(),
            changefreq: 'monthly',
            priority: 0.7,
            images: game.background_image ? [{
              url: game.background_image,
              caption: `${game.name} ${year ? `(${year})` : ''} screenshot`,
              title: game.name
            }] : undefined
          };
        });
      }
    }
    else if (path.includes('sitemap-people.xml')) {
      // People sitemap
      const { data: people } = await supabase
        .from('person_details')
        .select('id, name, birthday, profile_path, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (people) {
        entries = people.map(person => {
          const slug = createSlug(person.name);
          
          return {
            url: `${BASE_URL}/person/${person.id}/${slug}`,
            lastmod: person.created_at || new Date().toISOString(),
            changefreq: 'monthly',
            priority: 0.6,
            images: person.profile_path ? [{
              url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
              caption: `${person.name} profile photo`,
              title: person.name
            }] : undefined
          };
        });
      }
    }
    else if (path.includes('sitemap-lists.xml')) {
      // Lists sitemap
      const { data: lists } = await supabase
        .from('lists')
        .select(`
          id,
          title,
          updated_at,
          profiles:user_id (username)
        `)
        .eq('is_public', true)
        .not('items', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(5000);

      if (lists) {
        entries = lists.map(list => {
          const slug = createSlug(list.title);
          
          return {
            url: `${BASE_URL}/list/${list.id}/${slug}`,
            lastmod: list.updated_at || new Date().toISOString(),
            changefreq: 'daily',
            priority: 0.9
          };
        });
      }
    }
    else {
      // Main sitemap index
      const now = new Date().toISOString();
      
      const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/.netlify/functions/dynamic-sitemap/sitemap-movies.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/.netlify/functions/dynamic-sitemap/sitemap-series.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/.netlify/functions/dynamic-sitemap/sitemap-books.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/.netlify/functions/dynamic-sitemap/sitemap-games.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/.netlify/functions/dynamic-sitemap/sitemap-people.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/.netlify/functions/dynamic-sitemap/sitemap-lists.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        },
        body: sitemapIndex
      };
    }

    const xml = generateXMLSitemap(entries);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      },
      body: xml
    };

  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // Return error sitemap
    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300'
      },
      body: errorSitemap
    };
  }
}; 