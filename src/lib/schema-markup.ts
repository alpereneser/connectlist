// Schema.org yapılandırılmış veri işaretleme utility'si

export interface SchemaMarkupConfig {
  type: 'WebSite' | 'WebPage' | 'Article' | 'Movie' | 'TVSeries' | 'Book' | 'VideoGame' | 'Person' | 'ItemList' | 'Organization' | 'BreadcrumbList';
  data: any;
  context?: string;
}

export class SchemaMarkupGenerator {
  private static readonly CONTEXT = 'https://schema.org';
  private static readonly BASE_URL = 'https://connectlist.me';

  // Ana website schema'sı
  static generateWebSiteSchema(): object {
    return {
      '@context': this.CONTEXT,
      '@type': 'WebSite',
      name: 'Connectlist',
      alternateName: 'ConnectList',
      url: this.BASE_URL,
      description: 'Kendi içerik listelerini oluştur, paylaş ve keşfet. Kitap, film, dizi, oyun ve daha fazlasını kolayca yönet.',
      inLanguage: ['tr', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.BASE_URL}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Connectlist',
        url: this.BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${this.BASE_URL}/logo.png`,
          width: 512,
          height: 512
        }
      },
      sameAs: [
        'https://twitter.com/connectlist',
        'https://github.com/alpereneser/connectlist'
      ]
    };
  }

  // Film schema'sı
  static generateMovieSchema(movie: any): object {
    const schema: any = {
      '@context': this.CONTEXT,
      '@type': 'Movie',
      name: movie.title || movie.name,
      url: `${this.BASE_URL}/movie/${movie.id}/${this.createSlug(movie.title || movie.name)}`,
      description: movie.overview,
      inLanguage: movie.original_language || 'tr',
      datePublished: movie.release_date,
      genre: movie.genres?.map((g: any) => g.name) || [],
      duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
      contentRating: movie.certification,
      aggregateRating: movie.vote_average ? {
        '@type': 'AggregateRating',
        ratingValue: movie.vote_average,
        ratingCount: movie.vote_count,
        bestRating: 10,
        worstRating: 0
      } : undefined,
      image: movie.poster_path ? {
        '@type': 'ImageObject',
        url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        caption: movie.title || movie.name
      } : undefined,
      trailer: movie.trailer_url ? {
        '@type': 'VideoObject',
        name: `${movie.title || movie.name} - Fragman`,
        description: movie.overview,
        thumbnailUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined,
        contentUrl: movie.trailer_url,
        duration: movie.runtime ? `PT${movie.runtime}M` : undefined
      } : undefined,
      director: movie.director ? {
        '@type': 'Person',
        name: movie.director
      } : undefined,
      actor: movie.cast?.map((actor: any) => ({
        '@type': 'Person',
        name: actor.name
      })) || [],
      productionCompany: movie.production_companies?.map((company: any) => ({
        '@type': 'Organization',
        name: company.name
      })) || []
    };

    // Undefined değerleri temizle
    return this.cleanSchema(schema);
  }

  // Dizi schema'sı
  static generateTVSeriesSchema(series: any): object {
    const schema: any = {
      '@context': this.CONTEXT,
      '@type': 'TVSeries',
      name: series.name || series.title,
      url: `${this.BASE_URL}/series/${series.id}/${this.createSlug(series.name || series.title)}`,
      description: series.overview,
      inLanguage: series.original_language || 'tr',
      startDate: series.first_air_date,
      endDate: series.last_air_date,
      numberOfSeasons: series.number_of_seasons,
      numberOfEpisodes: series.number_of_episodes,
      genre: series.genres?.map((g: any) => g.name) || [],
      aggregateRating: series.vote_average ? {
        '@type': 'AggregateRating',
        ratingValue: series.vote_average,
        ratingCount: series.vote_count,
        bestRating: 10,
        worstRating: 0
      } : undefined,
      image: series.poster_path ? {
        '@type': 'ImageObject',
        url: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
        caption: series.name || series.title
      } : undefined,
      trailer: series.trailer_url ? {
        '@type': 'VideoObject',
        name: `${series.name || series.title} - Fragman`,
        description: series.overview,
        thumbnailUrl: series.backdrop_path ? `https://image.tmdb.org/t/p/w780${series.backdrop_path}` : undefined,
        contentUrl: series.trailer_url
      } : undefined,
      creator: series.created_by?.map((creator: any) => ({
        '@type': 'Person',
        name: creator.name
      })) || [],
      actor: series.cast?.map((actor: any) => ({
        '@type': 'Person',
        name: actor.name
      })) || [],
      productionCompany: series.production_companies?.map((company: any) => ({
        '@type': 'Organization',
        name: company.name
      })) || []
    };

    return this.cleanSchema(schema);
  }

  // Kitap schema'sı
  static generateBookSchema(book: any): object {
    const schema: any = {
      '@context': this.CONTEXT,
      '@type': 'Book',
      name: book.title,
      url: `${this.BASE_URL}/book/${book.id}/${this.createSlug(book.title)}`,
      description: book.description,
      isbn: book.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
      bookFormat: 'EBook',
      inLanguage: book.language || 'tr',
      datePublished: book.publishedDate,
      numberOfPages: book.pageCount,
      genre: book.categories || [],
      aggregateRating: book.averageRating ? {
        '@type': 'AggregateRating',
        ratingValue: book.averageRating,
        ratingCount: book.ratingsCount,
        bestRating: 5,
        worstRating: 0
      } : undefined,
      image: book.imageLinks?.large || book.imageLinks?.thumbnail ? {
        '@type': 'ImageObject',
        url: book.imageLinks.large || book.imageLinks.thumbnail,
        caption: book.title
      } : undefined,
      author: book.authors?.map((author: string) => ({
        '@type': 'Person',
        name: author
      })) || [],
      publisher: book.publisher ? {
        '@type': 'Organization',
        name: book.publisher
      } : undefined
    };

    return this.cleanSchema(schema);
  }

  // Oyun schema'sı
  static generateVideoGameSchema(game: any): object {
    const schema: any = {
      '@context': this.CONTEXT,
      '@type': 'VideoGame',
      name: game.name,
      url: `${this.BASE_URL}/game/${game.id}/${this.createSlug(game.name)}`,
      description: game.description_raw || game.description,
      datePublished: game.released,
      genre: game.genres?.map((g: any) => g.name) || [],
      gamePlatform: game.platforms?.map((p: any) => p.platform?.name) || [],
      aggregateRating: game.rating ? {
        '@type': 'AggregateRating',
        ratingValue: game.rating,
        ratingCount: game.ratings_count,
        bestRating: 5,
        worstRating: 0
      } : undefined,
      image: game.background_image ? {
        '@type': 'ImageObject',
        url: game.background_image,
        caption: game.name
      } : undefined,
      publisher: game.publishers?.map((publisher: any) => ({
        '@type': 'Organization',
        name: publisher.name
      })) || [],
      developer: game.developers?.map((developer: any) => ({
        '@type': 'Organization',
        name: developer.name
      })) || []
    };

    return this.cleanSchema(schema);
  }

  // Kişi schema'sı
  static generatePersonSchema(person: any): object {
    const schema: any = {
      '@context': this.CONTEXT,
      '@type': 'Person',
      name: person.name,
      url: `${this.BASE_URL}/person/${person.id}/${this.createSlug(person.name)}`,
      description: person.biography,
      birthDate: person.birthday,
      deathDate: person.deathday,
      birthPlace: person.place_of_birth,
      jobTitle: person.known_for_department,
      image: person.profile_path ? {
        '@type': 'ImageObject',
        url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
        caption: person.name
      } : undefined,
      knowsAbout: person.known_for?.map((work: any) => work.title || work.name) || [],
      sameAs: person.homepage ? [person.homepage] : undefined
    };

    return this.cleanSchema(schema);
  }

  // Liste schema'sı
  static generateItemListSchema(list: any): object {
    const schema: any = {
      '@context': this.CONTEXT,
      '@type': 'ItemList',
      name: list.title,
      url: `${this.BASE_URL}/list/${list.id}/${this.createSlug(list.title)}`,
      description: list.description,
      dateCreated: list.created_at,
      dateModified: list.updated_at,
      numberOfItems: list.items?.length || 0,
      author: list.profiles ? {
        '@type': 'Person',
        name: list.profiles.display_name || list.profiles.username,
        url: `${this.BASE_URL}/profile/${list.profiles.username}`
      } : undefined,
      itemListElement: list.items?.map((item: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title || item.name,
        url: this.getItemUrl(item)
      })) || []
    };

    return this.cleanSchema(schema);
  }

  // Breadcrumb schema'sı
  static generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): object {
    return {
      '@context': this.CONTEXT,
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    };
  }

  // Organizasyon schema'sı
  static generateOrganizationSchema(): object {
    return {
      '@context': this.CONTEXT,
      '@type': 'Organization',
      name: 'Connectlist',
      url: this.BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${this.BASE_URL}/logo.png`,
        width: 512,
        height: 512
      },
      description: 'Kendi içerik listelerini oluştur, paylaş ve keşfet. Kitap, film, dizi, oyun ve daha fazlasını kolayca yönet.',
      foundingDate: '2024',
      sameAs: [
        'https://twitter.com/connectlist',
        'https://github.com/alpereneser/connectlist'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'info@connectlist.me'
      }
    };
  }

  // Yardımcı fonksiyonlar
  private static createSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private static getItemUrl(item: any): string {
    const type = item.type || 'unknown';
    const slug = this.createSlug(item.title || item.name || 'item');
    return `${this.BASE_URL}/${type}/${item.id}/${slug}`;
  }

  private static cleanSchema(schema: any): object {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(schema)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key] = value;
          }
        } else if (typeof value === 'object') {
          const cleanedObject = this.cleanSchema(value);
          if (Object.keys(cleanedObject).length > 0) {
            cleaned[key] = cleanedObject;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }

  // Schema markup'ı JSON-LD formatında döndür
  static generateJSONLD(config: SchemaMarkupConfig): string {
    let schema: object;

    switch (config.type) {
      case 'WebSite':
        schema = this.generateWebSiteSchema();
        break;
      case 'Movie':
        schema = this.generateMovieSchema(config.data);
        break;
      case 'TVSeries':
        schema = this.generateTVSeriesSchema(config.data);
        break;
      case 'Book':
        schema = this.generateBookSchema(config.data);
        break;
      case 'VideoGame':
        schema = this.generateVideoGameSchema(config.data);
        break;
      case 'Person':
        schema = this.generatePersonSchema(config.data);
        break;
      case 'ItemList':
        schema = this.generateItemListSchema(config.data);
        break;
      case 'Organization':
        schema = this.generateOrganizationSchema();
        break;
      case 'BreadcrumbList':
        schema = this.generateBreadcrumbSchema(config.data);
        break;
      default:
        schema = config.data;
    }

    return JSON.stringify(schema, null, 2);
  }
}

export default SchemaMarkupGenerator;