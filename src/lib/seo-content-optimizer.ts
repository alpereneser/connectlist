import { SchemaGenerator } from './schema-generator';

interface SEOContent {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogImage: string;
  structuredData: any;
  breadcrumbs: Array<{ name: string; url: string }>;
  hreflang?: Array<{ lang: string; url: string }>;
}

export class SEOContentOptimizer {
  private static readonly BASE_URL = 'https://connectlist.me';

  // Movie SEO optimization
  static optimizeMovieSEO(movie: any, language: string = 'tr'): SEOContent {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const slug = this.createSlug(movie.title);
    
    const isTurkish = language === 'tr';
    
    // Title optimization
    const title = isTurkish 
      ? `${movie.title} ${year ? `(${year})` : ''} - Film Detayları | ConnectList`
      : `${movie.title} ${year ? `(${year})` : ''} - Movie Details | ConnectList`;

    // Description optimization
    let description = '';
    if (movie.overview) {
      description = isTurkish
        ? `${movie.title} ${year ? `(${year})` : ''} filmi hakkında detaylı bilgi. Oyuncular, yönetmen, özet ve daha fazlası. ${movie.overview.substring(0, 100)}...`
        : `Detailed information about ${movie.title} ${year ? `(${year})` : ''}. Cast, director, plot and more. ${movie.overview.substring(0, 100)}...`;
    } else {
      description = isTurkish
        ? `${movie.title} ${year ? `(${year})` : ''} filmi hakkında detaylı bilgi, oyuncular ve film özeti.`
        : `Detailed information about ${movie.title} ${year ? `(${year})` : ''}, cast and movie plot.`;
    }

    // Keywords optimization
    const keywords = [
      movie.title,
      year ? year.toString() : '',
      isTurkish ? 'film' : 'movie',
      isTurkish ? 'sinema' : 'cinema',
      ...(movie.genres?.map((g: any) => g.name) || []),
      ...(movie.cast_members?.slice(0, 5).map((actor: any) => actor.name) || []),
      movie.crew_members?.find((c: any) => c.job === 'Director')?.name || '',
      isTurkish ? 'film izle' : 'watch movie',
      isTurkish ? 'film önerisi' : 'movie recommendation'
    ].filter(Boolean);

    const canonicalUrl = `${this.BASE_URL}/movie/${movie.id}/${slug}`;

    // Structured data
    const structuredData = SchemaGenerator.generateMovieSchema(movie);

    // Breadcrumbs
    const breadcrumbs = [
      { 
        name: isTurkish ? 'Ana Sayfa' : 'Home', 
        url: this.BASE_URL 
      },
      { 
        name: isTurkish ? 'Filmler' : 'Movies', 
        url: `${this.BASE_URL}/lists/movies` 
      },
      { 
        name: movie.title, 
        url: canonicalUrl 
      }
    ];

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogImage: movie.poster_path ? `https://image.tmdb.org/t/p/w1280${movie.poster_path}` : '',
      structuredData,
      breadcrumbs,
      hreflang: [
        { lang: 'tr', url: `${canonicalUrl}?lang=tr` },
        { lang: 'en', url: `${canonicalUrl}?lang=en` }
      ]
    };
  }

  // Series SEO optimization
  static optimizeSeriesSEO(series: any, language: string = 'tr'): SEOContent {
    const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : '';
    const slug = this.createSlug(series.title || series.name);
    
    const isTurkish = language === 'tr';
    
    const title = isTurkish 
      ? `${series.title || series.name} ${year ? `(${year})` : ''} - Dizi Detayları | ConnectList`
      : `${series.title || series.name} ${year ? `(${year})` : ''} - TV Series Details | ConnectList`;

    let description = '';
    if (series.overview) {
      description = isTurkish
        ? `${series.title || series.name} ${year ? `(${year})` : ''} dizisi hakkında detaylı bilgi. ${series.number_of_seasons ? `${series.number_of_seasons} sezon, ` : ''}${series.number_of_episodes ? `${series.number_of_episodes} bölüm. ` : ''}${series.overview.substring(0, 100)}...`
        : `Detailed information about ${series.title || series.name} ${year ? `(${year})` : ''}. ${series.number_of_seasons ? `${series.number_of_seasons} seasons, ` : ''}${series.number_of_episodes ? `${series.number_of_episodes} episodes. ` : ''}${series.overview.substring(0, 100)}...`;
    } else {
      description = isTurkish
        ? `${series.title || series.name} ${year ? `(${year})` : ''} dizisi hakkında detaylı bilgi ve bölümler.`
        : `Detailed information about ${series.title || series.name} ${year ? `(${year})` : ''} TV series and episodes.`;
    }

    const keywords = [
      series.title || series.name,
      year ? year.toString() : '',
      isTurkish ? 'dizi' : 'tv series',
      isTurkish ? 'televizyon' : 'television',
      ...(series.genres?.map((g: any) => g.name) || []),
      ...(series.cast_members?.slice(0, 5).map((actor: any) => actor.name) || []),
      isTurkish ? 'dizi izle' : 'watch series',
      isTurkish ? 'dizi önerisi' : 'series recommendation',
      'netflix', 'amazon prime', 'disney+', 'hbo'
    ].filter(Boolean);

    const canonicalUrl = `${this.BASE_URL}/series/${series.id}/${slug}`;

    const structuredData = SchemaGenerator.generateTVSeriesSchema(series);

    const breadcrumbs = [
      { 
        name: isTurkish ? 'Ana Sayfa' : 'Home', 
        url: this.BASE_URL 
      },
      { 
        name: isTurkish ? 'Diziler' : 'TV Series', 
        url: `${this.BASE_URL}/lists/series` 
      },
      { 
        name: series.title || series.name, 
        url: canonicalUrl 
      }
    ];

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogImage: series.poster_path ? `https://image.tmdb.org/t/p/w1280${series.poster_path}` : '',
      structuredData,
      breadcrumbs,
      hreflang: [
        { lang: 'tr', url: `${canonicalUrl}?lang=tr` },
        { lang: 'en', url: `${canonicalUrl}?lang=en` }
      ]
    };
  }

  // Book SEO optimization
  static optimizeBookSEO(book: any, language: string = 'tr'): SEOContent {
    const year = book.published_date ? new Date(book.published_date).getFullYear() : '';
    const slug = this.createSlug(book.title);
    
    const isTurkish = language === 'tr';
    
    const authorName = book.authors?.[0] || '';
    const title = isTurkish 
      ? `${book.title} ${authorName ? `- ${authorName}` : ''} ${year ? `(${year})` : ''} | ConnectList`
      : `${book.title} ${authorName ? `by ${authorName}` : ''} ${year ? `(${year})` : ''} | ConnectList`;

    let description = '';
    if (book.description) {
      description = isTurkish
        ? `${book.title} ${authorName ? `- ${authorName}` : ''} kitabı hakkında detaylı bilgi. ${book.page_count ? `${book.page_count} sayfa. ` : ''}${book.description.substring(0, 120)}...`
        : `Detailed information about ${book.title} ${authorName ? `by ${authorName}` : ''}. ${book.page_count ? `${book.page_count} pages. ` : ''}${book.description.substring(0, 120)}...`;
    } else {
      description = isTurkish
        ? `${book.title} ${authorName ? `- ${authorName}` : ''} kitabı hakkında detaylı bilgi ve özet.`
        : `Detailed information about ${book.title} ${authorName ? `by ${authorName}` : ''} book.`;
    }

    const keywords = [
      book.title,
      authorName,
      year ? year.toString() : '',
      isTurkish ? 'kitap' : 'book',
      isTurkish ? 'okuma' : 'reading',
      ...(book.categories || []),
      book.publisher || '',
      isTurkish ? 'kitap önerisi' : 'book recommendation',
      isTurkish ? 'kitap özeti' : 'book summary'
    ].filter(Boolean);

    const canonicalUrl = `${this.BASE_URL}/book/${book.id}/${slug}`;

    const structuredData = SchemaGenerator.generateBookSchema(book);

    const breadcrumbs = [
      { 
        name: isTurkish ? 'Ana Sayfa' : 'Home', 
        url: this.BASE_URL 
      },
      { 
        name: isTurkish ? 'Kitaplar' : 'Books', 
        url: `${this.BASE_URL}/lists/books` 
      },
      { 
        name: book.title, 
        url: canonicalUrl 
      }
    ];

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogImage: book.image_links?.large || book.image_links?.thumbnail || '',
      structuredData,
      breadcrumbs,
      hreflang: [
        { lang: 'tr', url: `${canonicalUrl}?lang=tr` },
        { lang: 'en', url: `${canonicalUrl}?lang=en` }
      ]
    };
  }

  // Game SEO optimization
  static optimizeGameSEO(game: any, language: string = 'tr'): SEOContent {
    const year = game.released ? new Date(game.released).getFullYear() : '';
    const slug = this.createSlug(game.name);
    
    const isTurkish = language === 'tr';
    
    const title = isTurkish 
      ? `${game.name} ${year ? `(${year})` : ''} - Oyun Detayları | ConnectList`
      : `${game.name} ${year ? `(${year})` : ''} - Game Details | ConnectList`;

    let description = '';
    if (game.description || game.description_raw) {
      const desc = game.description_raw || game.description;
      description = isTurkish
        ? `${game.name} ${year ? `(${year})` : ''} oyunu hakkında detaylı bilgi. ${game.platforms?.length ? `${game.platforms.length} platform. ` : ''}${desc.substring(0, 120)}...`
        : `Detailed information about ${game.name} ${year ? `(${year})` : ''} game. ${game.platforms?.length ? `${game.platforms.length} platforms. ` : ''}${desc.substring(0, 120)}...`;
    } else {
      description = isTurkish
        ? `${game.name} ${year ? `(${year})` : ''} oyunu hakkında detaylı bilgi ve inceleme.`
        : `Detailed information about ${game.name} ${year ? `(${year})` : ''} game.`;
    }

    const keywords = [
      game.name,
      year ? year.toString() : '',
      isTurkish ? 'oyun' : 'game',
      isTurkish ? 'video oyunu' : 'video game',
      ...(game.genres?.map((g: any) => g.name) || []),
      ...(game.platforms?.map((p: any) => p.platform?.name || p.name) || []),
      ...(game.developers?.map((d: any) => d.name) || []),
      isTurkish ? 'oyun inceleme' : 'game review',
      isTurkish ? 'oyun önerisi' : 'game recommendation'
    ].filter(Boolean);

    const canonicalUrl = `${this.BASE_URL}/game/${game.id}/${slug}`;

    const structuredData = SchemaGenerator.generateGameSchema(game);

    const breadcrumbs = [
      { 
        name: isTurkish ? 'Ana Sayfa' : 'Home', 
        url: this.BASE_URL 
      },
      { 
        name: isTurkish ? 'Oyunlar' : 'Games', 
        url: `${this.BASE_URL}/lists/games` 
      },
      { 
        name: game.name, 
        url: canonicalUrl 
      }
    ];

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogImage: game.background_image || '',
      structuredData,
      breadcrumbs,
      hreflang: [
        { lang: 'tr', url: `${canonicalUrl}?lang=tr` },
        { lang: 'en', url: `${canonicalUrl}?lang=en` }
      ]
    };
  }

  // Person SEO optimization
  static optimizePersonSEO(person: any, language: string = 'tr'): SEOContent {
    const slug = this.createSlug(person.name);
    
    const isTurkish = language === 'tr';
    
    const title = isTurkish 
      ? `${person.name} - Kişi Detayları | ConnectList`
      : `${person.name} - Person Details | ConnectList`;

    let description = '';
    if (person.biography) {
      description = isTurkish
        ? `${person.name} hakkında detaylı bilgi. ${person.known_for_department ? `${person.known_for_department} alanında tanınıyor. ` : ''}${person.biography.substring(0, 120)}...`
        : `Detailed information about ${person.name}. ${person.known_for_department ? `Known for ${person.known_for_department}. ` : ''}${person.biography.substring(0, 120)}...`;
    } else {
      description = isTurkish
        ? `${person.name} hakkında detaylı bilgi, filmleri ve projeleri.`
        : `Detailed information about ${person.name}, movies and projects.`;
    }

    const keywords = [
      person.name,
      person.known_for_department || '',
      ...(person.also_known_as || []),
      isTurkish ? 'aktör' : 'actor',
      isTurkish ? 'oyuncu' : 'actress',
      isTurkish ? 'yönetmen' : 'director',
      isTurkish ? 'ünlü' : 'celebrity',
      isTurkish ? 'biyografi' : 'biography'
    ].filter(Boolean);

    const canonicalUrl = `${this.BASE_URL}/person/${person.id}/${slug}`;

    const structuredData = SchemaGenerator.generatePersonSchema(person);

    const breadcrumbs = [
      { 
        name: isTurkish ? 'Ana Sayfa' : 'Home', 
        url: this.BASE_URL 
      },
      { 
        name: isTurkish ? 'Kişiler' : 'People', 
        url: `${this.BASE_URL}/lists/people` 
      },
      { 
        name: person.name, 
        url: canonicalUrl 
      }
    ];

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogImage: person.profile_path ? `https://image.tmdb.org/t/p/w1280${person.profile_path}` : '',
      structuredData,
      breadcrumbs,
      hreflang: [
        { lang: 'tr', url: `${canonicalUrl}?lang=tr` },
        { lang: 'en', url: `${canonicalUrl}?lang=en` }
      ]
    };
  }

  // List SEO optimization (for lists containing API content)
  static optimizeListSEO(list: any, language: string = 'tr'): SEOContent {
    const slug = this.createSlug(list.title);
    
    const isTurkish = language === 'tr';
    
    const categoryName = this.getCategoryName(list.category, isTurkish);
    const title = isTurkish 
      ? `${list.title} - ${categoryName} Listesi | ConnectList`
      : `${list.title} - ${categoryName} List | ConnectList`;

    const itemCount = list.items?.length || 0;
    let description = '';
    if (list.description) {
      description = isTurkish
        ? `${list.title} ${categoryName.toLowerCase()} listesi. ${itemCount} ${categoryName.toLowerCase()} içeriyor. ${list.description.substring(0, 120)}...`
        : `${list.title} ${categoryName.toLowerCase()} list. Contains ${itemCount} ${categoryName.toLowerCase()}. ${list.description.substring(0, 120)}...`;
    } else {
      description = isTurkish
        ? `${list.title} - ${itemCount} ${categoryName.toLowerCase()} içeren özenle hazırlanmış liste.`
        : `${list.title} - Carefully curated list containing ${itemCount} ${categoryName.toLowerCase()}.`;
    }

    const keywords = [
      list.title,
      categoryName,
      isTurkish ? 'liste' : 'list',
      isTurkish ? 'öneri' : 'recommendation',
      isTurkish ? 'koleksiyon' : 'collection',
      ...(list.items?.slice(0, 5).map((item: any) => item.title || item.name) || []),
      isTurkish ? `${categoryName.toLowerCase()} listesi` : `${categoryName.toLowerCase()} list`
    ].filter(Boolean);

    const canonicalUrl = `${this.BASE_URL}/list/${list.id}/${slug}`;

    const structuredData = SchemaGenerator.generateListSchema(list, list.items || []);

    const breadcrumbs = [
      { 
        name: isTurkish ? 'Ana Sayfa' : 'Home', 
        url: this.BASE_URL 
      },
      { 
        name: categoryName, 
        url: `${this.BASE_URL}/lists/${list.category}` 
      },
      { 
        name: list.title, 
        url: canonicalUrl 
      }
    ];

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogImage: list.image_url || (list.items?.[0]?.poster_path ? `https://image.tmdb.org/t/p/w1280${list.items[0].poster_path}` : ''),
      structuredData,
      breadcrumbs,
      hreflang: [
        { lang: 'tr', url: `${canonicalUrl}?lang=tr` },
        { lang: 'en', url: `${canonicalUrl}?lang=en` }
      ]
    };
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

  private static getCategoryName(category: string, isTurkish: boolean): string {
    const categoryNames = {
      movies: { tr: 'Film', en: 'Movie' },
      series: { tr: 'Dizi', en: 'TV Series' },
      books: { tr: 'Kitap', en: 'Book' },
      games: { tr: 'Oyun', en: 'Game' },
      people: { tr: 'Kişi', en: 'Person' },
      places: { tr: 'Mekan', en: 'Place' }
    };

    return categoryNames[category as keyof typeof categoryNames]?.[isTurkish ? 'tr' : 'en'] || category;
  }

  // Generate FAQ schema for content
  static generateContentFAQ(contentType: string, content: any, language: string = 'tr'): any {
    const isTurkish = language === 'tr';
    
    const commonQuestions = {
      movie: [
        {
          question: isTurkish ? `${content.title} filmi ne zaman çıktı?` : `When was ${content.title} released?`,
          answer: isTurkish 
            ? `${content.title} filmi ${content.release_date ? new Date(content.release_date).getFullYear() : 'belirtilmemiş'} yılında çıkmıştır.`
            : `${content.title} was released in ${content.release_date ? new Date(content.release_date).getFullYear() : 'unspecified'}.`
        },
        {
          question: isTurkish ? `${content.title} filminin konusu nedir?` : `What is ${content.title} about?`,
          answer: content.overview || (isTurkish ? 'Film özeti mevcut değil.' : 'Plot summary not available.')
        }
      ],
      series: [
        {
          question: isTurkish ? `${content.name || content.title} kaç sezon?` : `How many seasons does ${content.name || content.title} have?`,
          answer: isTurkish 
            ? `${content.name || content.title} ${content.number_of_seasons || 'belirtilmemiş'} sezondan oluşmaktadır.`
            : `${content.name || content.title} has ${content.number_of_seasons || 'unspecified'} seasons.`
        }
      ],
      book: [
        {
          question: isTurkish ? `${content.title} kitabı kaç sayfa?` : `How many pages is ${content.title}?`,
          answer: isTurkish 
            ? `${content.title} kitabı ${content.page_count || 'belirtilmemiş'} sayfadır.`
            : `${content.title} has ${content.page_count || 'unspecified'} pages.`
        }
      ]
    };

    const questions = commonQuestions[contentType as keyof typeof commonQuestions] || [];

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": questions.map(q => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.answer
        }
      }))
    };
  }
}

export default SEOContentOptimizer; 