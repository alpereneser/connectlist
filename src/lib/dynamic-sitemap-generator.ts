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
  }>;
}

export class DynamicSitemapGenerator {
  private static readonly BASE_URL = 'https://connectlist.me';
  private static readonly MAX_URLS_PER_SITEMAP = 50000;

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
    const slug = this.createSlug(movie.title);
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    
    return {
      url: `${this.BASE_URL}/movie/${movie.id}/${slug}`,
      lastmod: movie.created_at || new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
      images: movie.poster_path ? [{
        url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        caption: `${movie.title} ${year ? `(${year})` : ''} poster`,
        title: movie.title
      }] : undefined
    };
  }

  // Create series sitemap entry
  private static createSeriesSitemapEntry(series: any): SitemapEntry {
    const slug = this.createSlug(series.title);
    const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : '';
    
    return {
      url: `${this.BASE_URL}/series/${series.id}/${slug}`,
      lastmod: series.created_at || new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
      images: series.poster_path ? [{
        url: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
        caption: `${series.title} ${year ? `(${year})` : ''} poster`,
        title: series.title
      }] : undefined
    };
  }

  // Create book sitemap entry
  private static createBookSitemapEntry(book: any): SitemapEntry {
    const slug = this.createSlug(book.title);
    
    return {
      url: `${this.BASE_URL}/book/${book.id}/${slug}`,
      lastmod: book.created_at || new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.7,
      images: book.image_links?.large || book.image_links?.thumbnail ? [{
        url: book.image_links.large || book.image_links.thumbnail,
        caption: `${book.title} book cover`,
        title: book.title
      }] : undefined
    };
  }

  // Create game sitemap entry
  private static createGameSitemapEntry(game: any): SitemapEntry {
    const slug = this.createSlug(game.name);
    const year = game.released ? new Date(game.released).getFullYear() : '';
    
    return {
      url: `${this.BASE_URL}/game/${game.id}/${slug}`,
      lastmod: game.created_at || new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.7,
      images: game.background_image ? [{
        url: game.background_image,
        caption: `${game.name} ${year ? `(${year})` : ''} screenshot`,
        title: game.name
      }] : undefined
    };
  }

  // Create person sitemap entry
  private static createPersonSitemapEntry(person: any): SitemapEntry {
    const slug = this.createSlug(person.name);
    
    return {
      url: `${this.BASE_URL}/person/${person.id}/${slug}`,
      lastmod: person.created_at || new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.6,
      images: person.profile_path ? [{
        url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
        caption: `${person.name} profile photo`,
        title: person.name
      }] : undefined
    };
  }

  // Create list sitemap entry
  private static createListSitemapEntry(list: any): SitemapEntry {
    const slug = this.createSlug(list.title);
    
    return {
      url: `${this.BASE_URL}/list/${list.id}/${slug}`,
      lastmod: list.updated_at || new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.9
    };
  }

  // Generate XML sitemap from entries
  private static generateXMLSitemap(entries: SitemapEntry[]): string {
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
      <image:caption>${this.escapeXML(image.caption)}</image:caption>`;
          }
          if (image.title) {
            xml += `
      <image:title>${this.escapeXML(image.title)}</image:title>`;
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
          created_at,
          count(*) as usage_count
        `)
        .group(['content_type', 'content_id', 'created_at'])
        .order('usage_count', { ascending: false })
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
      let details: any = null;
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