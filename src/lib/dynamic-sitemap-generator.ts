import { supabaseBrowser } from './supabase-browser';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: Array<{
    url: string;
    caption?: string;
    title?: string;
    geoLocation?: string;
    license?: string;
  }>;
  videos?: Array<{
    url: string;
    thumbnailUrl?: string;
    title?: string;
    description?: string;
    duration?: number;
  }>;
  news?: {
    publicationDate: string;
    title: string;
    keywords?: string;
    stockTickers?: string;
  };
  alternateLanguages?: Array<{
    hreflang: string;
    href: string;
  }>;
}

export class DynamicSitemapGenerator {
  private static readonly BASE_URL = 'https://connectlist.me';

  // Generate sitemap for API content (movies, series, books, games, people)
  static async generateContentSitemap(): Promise<string> {
    const entries: SitemapEntry[] = [];

    try {
      // Movies from cache
      const movies = await this.getMoviesFromCache();
      entries.push(...movies.map(movie => this.createMovieSitemapEntry(movie)));

      // Series from cache
      const series = await this.getSeriesFromCache();
      entries.push(...series.map(show => this.createSeriesSitemapEntry(show)));

      // Books from cache
      const books = await this.getBooksFromCache();
      entries.push(...books.map(book => this.createBookSitemapEntry(book)));

      // Games from cache
      const games = await this.getGamesFromCache();
      entries.push(...games.map(game => this.createGameSitemapEntry(game)));

      // People from cache
      const people = await this.getPeopleFromCache();
      entries.push(...people.map(person => this.createPersonSitemapEntry(person)));

      // Lists containing API content
      const lists = await this.getListsWithContent();
      entries.push(...lists.map(list => this.createListSitemapEntry(list)));

      return this.generateXMLSitemap(entries);
    } catch (error) {
      console.error('Error generating content sitemap:', error);
      return this.generateErrorSitemap();
    }
  }

  // Get cached movies from Supabase
  private static async getMoviesFromCache() {
    const { data, error } = await supabaseBrowser
      .from('movie_details')
      .select('id, title, release_date, poster_path, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
    return data || [];
  }

  // Get cached series from Supabase
  private static async getSeriesFromCache() {
    const { data, error } = await supabaseBrowser
      .from('series_details')
      .select('id, title, first_air_date, poster_path, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching series:', error);
      return [];
    }
    return data || [];
  }

  // Get cached books from Supabase
  private static async getBooksFromCache() {
    const { data, error } = await supabaseBrowser
      .from('book_details')
      .select('id, title, published_date, image_links, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching books:', error);
      return [];
    }
    return data || [];
  }

  // Get cached games from Supabase
  private static async getGamesFromCache() {
    const { data, error } = await supabaseBrowser
      .from('game_details')
      .select('id, name, released, background_image, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }
    return data || [];
  }

  // Get cached people from Supabase
  private static async getPeopleFromCache() {
    const { data, error } = await supabaseBrowser
      .from('person_details')
      .select('id, name, birthday, profile_path, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching people:', error);
      return [];
    }
    return data || [];
  }

  // Get lists that contain API content
  private static async getListsWithContent() {
    const { data, error } = await supabaseBrowser
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

    if (error) {
      console.error('Error fetching lists:', error);
      return [];
    }
    return data || [];
  }

  // Create movie sitemap entry
  private static createMovieSitemapEntry(movie: any): SitemapEntry {
    const slug = this.createSlug(movie.title || movie.name);
    const baseUrl = `${this.BASE_URL}/movie/${movie.id}/${slug}`;
    
    return {
      url: baseUrl,
      lastmod: movie.updated_at || new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: movie.vote_average > 7 ? 0.9 : 0.8,
      images: movie.poster_path ? [{
        url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        caption: `${movie.title || movie.name} - Film Posteri`,
        title: movie.title || movie.name,
        license: 'https://www.themoviedb.org/terms-of-use'
      }] : undefined,
      videos: movie.trailer_url ? [{
        url: movie.trailer_url,
        thumbnailUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined,
        title: `${movie.title || movie.name} - Fragman`,
        description: movie.overview,
        duration: movie.runtime ? movie.runtime * 60 : undefined
      }] : undefined,
      alternateLanguages: [
        { hreflang: 'tr', href: baseUrl },
        { hreflang: 'en', href: `${baseUrl}?lang=en` },
        { hreflang: 'x-default', href: baseUrl }
      ]
    };
  }

  // Create series sitemap entry
  private static createSeriesSitemapEntry(series: any): SitemapEntry {
    const slug = this.createSlug(series.title);
    const baseUrl = `${this.BASE_URL}/series/${series.id}/${slug}`;
    
    return {
      url: baseUrl,
      lastmod: series.updated_at || new Date().toISOString().split('T')[0],
      changefreq: series.status === 'Returning Series' ? 'daily' : 'weekly',
      priority: series.vote_average > 7 ? 0.9 : 0.8,
      images: series.poster_path ? [{
        url: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
        caption: `${series.title} - Dizi Posteri`,
        title: series.title,
        license: 'https://www.themoviedb.org/terms-of-use'
      }] : undefined,
      videos: series.trailer_url ? [{
        url: series.trailer_url,
        thumbnailUrl: series.backdrop_path ? `https://image.tmdb.org/t/p/w780${series.backdrop_path}` : undefined,
        title: `${series.title} - Fragman`,
        description: series.overview
      }] : undefined,
      alternateLanguages: [
        { hreflang: 'tr', href: baseUrl },
        { hreflang: 'en', href: `${baseUrl}?lang=en` },
        { hreflang: 'x-default', href: baseUrl }
      ]
    };
  }

  // Create book sitemap entry
  private static createBookSitemapEntry(book: any): SitemapEntry {
    const slug = this.createSlug(book.title);
    const baseUrl = `${this.BASE_URL}/book/${book.id}/${slug}`;
    
    return {
      url: baseUrl,
      lastmod: book.updated_at || new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: book.averageRating > 4 ? 0.8 : 0.7,
      images: book.image_links?.large || book.image_links?.thumbnail ? [{
        url: book.image_links.large || book.image_links.thumbnail,
        caption: `${book.title} - Kitap Kapağı${book.authors ? ` - ${book.authors.join(', ')}` : ''}`,
        title: book.title,
        license: 'https://books.google.com/intl/en/googlebooks/tos.html'
      }] : undefined,
      alternateLanguages: [
        { hreflang: 'tr', href: baseUrl },
        { hreflang: 'en', href: `${baseUrl}?lang=en` },
        { hreflang: 'x-default', href: baseUrl }
      ]
    };
  }

  // Create game sitemap entry
  private static createGameSitemapEntry(game: any): SitemapEntry {
    const slug = this.createSlug(game.name);
    const year = game.released ? new Date(game.released).getFullYear() : '';
    const baseUrl = `${this.BASE_URL}/game/${game.id}/${slug}`;
    
    return {
      url: baseUrl,
      lastmod: game.updated_at || new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: game.rating > 4 ? 0.8 : 0.7,
      images: game.background_image ? [{
        url: game.background_image,
        caption: `${game.name} ${year ? `(${year})` : ''} - Oyun Ekran Görüntüsü${game.genres ? ` - ${game.genres.map((g: any) => g.name).join(', ')}` : ''}`,
        title: game.name,
        license: 'https://rawg.io/terms'
      }] : undefined,
      alternateLanguages: [
        { hreflang: 'tr', href: baseUrl },
        { hreflang: 'en', href: `${baseUrl}?lang=en` },
        { hreflang: 'x-default', href: baseUrl }
      ]
    };
  }

  // Create person sitemap entry
  private static createPersonSitemapEntry(person: any): SitemapEntry {
    const slug = this.createSlug(person.name);
    const baseUrl = `${this.BASE_URL}/person/${person.id}/${slug}`;
    
    return {
      url: baseUrl,
      lastmod: person.updated_at || new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: person.popularity > 10 ? 0.7 : 0.6,
      images: person.profile_path ? [{
        url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
        caption: `${person.name} - ${person.known_for_department || 'Sanatçı'} Profil Fotoğrafı`,
        title: person.name,
        license: 'https://www.themoviedb.org/terms-of-use'
      }] : undefined,
      alternateLanguages: [
        { hreflang: 'tr', href: baseUrl },
        { hreflang: 'en', href: `${baseUrl}?lang=en` },
        { hreflang: 'x-default', href: baseUrl }
      ]
    };
  }

  // Create list sitemap entry
  private static createListSitemapEntry(list: any): SitemapEntry {
    const slug = this.createSlug(list.title);
    const baseUrl = `${this.BASE_URL}/list/${list.id}/${slug}`;
    
    return {
      url: baseUrl,
      lastmod: list.updated_at || new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.8,
      alternateLanguages: [
        { hreflang: 'tr', href: baseUrl },
        { hreflang: 'en', href: `${baseUrl}?lang=en` },
        { hreflang: 'x-default', href: baseUrl }
      ]
    };
  }

  // Generate XML sitemap from entries
  private static generateXMLSitemap(entries: SitemapEntry[]): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    const xmlFooter = `</urlset>`;

    const urlEntries = entries.map(entry => {
      let xml = `  <url>
    <loc>${this.escapeXML(entry.url)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>`;

      // Add alternate language versions
      if (entry.alternateLanguages && entry.alternateLanguages.length > 0) {
        entry.alternateLanguages.forEach(alt => {
          xml += `
    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${this.escapeXML(alt.href)}" />`;
        });
      }

      // Add image entries if available
      if (entry.images && entry.images.length > 0) {
        entry.images.forEach(image => {
          xml += `
    <image:image>
      <image:loc>${this.escapeXML(image.url)}</image:loc>`;
          if (image.caption) {
            xml += `
      <image:caption>${this.escapeXML(image.caption)}</image:caption>`;
          }
          if (image.title) {
            xml += `
      <image:title>${this.escapeXML(image.title)}</image:title>`;
          }
          if (image.geoLocation) {
            xml += `
      <image:geo_location>${this.escapeXML(image.geoLocation)}</image:geo_location>`;
          }
          if (image.license) {
            xml += `
      <image:license>${this.escapeXML(image.license)}</image:license>`;
          }
          xml += `
    </image:image>`;
        });
      }

      // Add videos if present
      if (entry.videos && entry.videos.length > 0) {
        entry.videos.forEach(video => {
          xml += `
    <video:video>
      <video:content_loc>${this.escapeXML(video.url)}</video:content_loc>`;
          if (video.thumbnailUrl) {
            xml += `
      <video:thumbnail_loc>${this.escapeXML(video.thumbnailUrl)}</video:thumbnail_loc>`;
          }
          if (video.title) {
            xml += `
      <video:title>${this.escapeXML(video.title)}</video:title>`;
          }
          if (video.description) {
            xml += `
      <video:description>${this.escapeXML(video.description)}</video:description>`;
          }
          if (video.duration) {
            xml += `
      <video:duration>${video.duration}</video:duration>`;
          }
          xml += `
    </video:video>`;
        });
      }

      // Add news if present
      if (entry.news) {
        xml += `
    <news:news>
      <news:publication>
        <news:name>Connectlist</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${entry.news.publicationDate}</news:publication_date>
      <news:title>${this.escapeXML(entry.news.title)}</news:title>`;
        if (entry.news.keywords) {
          xml += `
      <news:keywords>${this.escapeXML(entry.news.keywords)}</news:keywords>`;
        }
        if (entry.news.stockTickers) {
          xml += `
      <news:stock_tickers>${this.escapeXML(entry.news.stockTickers)}</news:stock_tickers>`;
        }
        xml += `
    </news:news>`;
      }

      xml += `
  </url>`;
      return xml;
    }).join('\n');

    return `${xmlHeader}\n${urlEntries}\n${xmlFooter}`;
  }

  // Generate popular content sitemap (for high-traffic content)
  static async generatePopularContentSitemap(): Promise<string> {
    const entries: SitemapEntry[] = [];

    try {
      // Get most accessed content from lists
      const { data: popularContent } = await supabaseBrowser
        .from('content_lists')
        .select(`
          content_type,
          content_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (popularContent) {
        for (const content of popularContent) {
          const entry = await this.createPopularContentEntry(content);
          if (entry) entries.push(entry);
        }
      }

      return this.generateXMLSitemap(entries);
    } catch (error) {
      console.error('Error generating popular content sitemap:', error);
      return this.generateErrorSitemap();
    }
  }

  // Create popular content entry
  private static async createPopularContentEntry(content: any): Promise<SitemapEntry | null> {
    try {
      let tableName = '';

      switch (content.content_type) {
        case 'movie':
          tableName = 'movie_details';
          break;
        case 'series':
          tableName = 'series_details';
          break;
        case 'book':
          tableName = 'book_details';
          break;
        case 'game':
          tableName = 'game_details';
          break;
        case 'person':
          tableName = 'person_details';
          break;
        default:
          return null;
      }

      const { data } = await supabaseBrowser
        .from(tableName)
        .select('*')
        .eq('id', content.content_id)
        .single();

      if (!data) return null;

      const slug = this.createSlug(data.title || data.name);
      
      return {
        url: `${this.BASE_URL}/${content.content_type}/${content.content_id}/${slug}`,
        lastmod: content.created_at || new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.9
      };
    } catch (error) {
      console.error('Error creating popular content entry:', error);
      return null;
    }
  }

  // Utility functions
  private static createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static generateErrorSitemap(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${this.BASE_URL}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  }

  // Generate sitemap index for multiple sitemaps
  static generateSitemapIndex(): string {
    const now = new Date().toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${this.BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${this.BASE_URL}/api/sitemap-content.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${this.BASE_URL}/api/sitemap-popular.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${this.BASE_URL}/api/sitemap-lists.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
  }
}

export default DynamicSitemapGenerator;