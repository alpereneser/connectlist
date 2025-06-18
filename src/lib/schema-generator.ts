import { supabaseBrowser } from './supabase-browser';

// Base schema types
export interface BaseSchema {
  "@context": string;
  "@type": string;
  name: string;
  description?: string;
  url?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: PersonSchema | OrganizationSchema;
  publisher?: OrganizationSchema;
}

export interface PersonSchema {
  "@type": "Person";
  name: string;
  url?: string;
  image?: string;
  sameAs?: string[];
}

export interface OrganizationSchema {
  "@type": "Organization";
  name: string;
  url: string;
  logo: {
    "@type": "ImageObject";
    url: string;
  };
  sameAs?: string[];
}

export interface ListSchema extends BaseSchema {
  "@type": "ItemList";
  itemListElement: ListItemSchema[];
  numberOfItems: number;
  genre?: string;
  category?: string;
}

export interface ListItemSchema {
  "@type": "ListItem";
  position: number;
  item: MovieSchema | BookSchema | GameSchema | PersonSchema | PlaceSchema;
}

export interface MovieSchema {
  "@type": "Movie";
  name: string;
  description?: string;
  image?: string;
  datePublished?: string;
  genre?: string[];
  director?: PersonSchema;
  actor?: PersonSchema[];
  aggregateRating?: AggregateRatingSchema;
  duration?: string;
  contentRating?: string;
}

export interface BookSchema {
  "@type": "Book";
  name: string;
  description?: string;
  image?: string;
  author?: PersonSchema;
  isbn?: string;
  numberOfPages?: number;
  genre?: string[];
  publisher?: OrganizationSchema;
  datePublished?: string;
  aggregateRating?: AggregateRatingSchema;
}

export interface GameSchema {
  "@type": "VideoGame";
  name: string;
  description?: string;
  image?: string;
  genre?: string[];
  gamePlatform?: string[];
  publisher?: OrganizationSchema;
  datePublished?: string;
  aggregateRating?: AggregateRatingSchema;
  applicationCategory?: string;
}

export interface PlaceSchema {
  "@type": "Place";
  name: string;
  description?: string;
  image?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  aggregateRating?: AggregateRatingSchema;
}

export interface AggregateRatingSchema {
  "@type": "AggregateRating";
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface WebsiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
  publisher: OrganizationSchema;
  potentialAction: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
  sameAs: string[];
}

export interface BreadcrumbSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
}

// Schema Generators
export class SchemaGenerator {
  private static readonly BASE_URL = 'https://connectlist.me';
  private static readonly ORGANIZATION: OrganizationSchema = {
    "@type": "Organization",
    name: "ConnectList",
    url: this.BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${this.BASE_URL}/logo.png`
    },
    sameAs: [
      "https://twitter.com/connectlist",
      "https://instagram.com/connectlist",
      "https://facebook.com/connectlist"
    ]
  };

  static generateWebsiteSchema(language: string = 'tr'): WebsiteSchema {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "ConnectList",
      url: this.BASE_URL,
      description: language === 'tr' 
        ? "Film, dizi, kitap, oyun ve kişi listelerinizi oluşturun, paylaşın ve keşfedin. ConnectList ile sosyalleşin."
        : "Create, share and discover your content lists. Movies, TV shows, books, games and more.",
      publisher: this.ORGANIZATION,
      potentialAction: {
        "@type": "SearchAction",
        target: `${this.BASE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      },
      sameAs: [
        "https://twitter.com/connectlist",
        "https://instagram.com/connectlist",
        "https://facebook.com/connectlist"
      ]
    };
  }

  static generateListSchema(list: any, items: any[] = []): ListSchema {
    const listItems: ListItemSchema[] = items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: this.generateItemSchema(item, list.category)
    }));

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: list.title,
      description: list.description,
      url: `${this.BASE_URL}/list/${list.id}`,
      image: list.image_url,
      datePublished: list.created_at,
      dateModified: list.updated_at,
      author: {
        "@type": "Person",
        name: list.profiles?.full_name || list.profiles?.username || "ConnectList User",
        url: list.profiles?.username ? `${this.BASE_URL}/profile/${list.profiles.username}` : undefined
      },
      publisher: this.ORGANIZATION,
      itemListElement: listItems,
      numberOfItems: items.length,
      genre: list.category,
      category: list.category
    };
  }

  static generateItemSchema(item: any, category: string): any {
    switch (category) {
      case 'movies':
        return this.generateMovieSchema(item);
      case 'series':
        return this.generateTVSeriesSchema(item);
      case 'books':
        return this.generateBookSchema(item);
      case 'games':
        return this.generateGameSchema(item);
      case 'people':
        return this.generatePersonSchema(item);
      case 'places':
        return this.generatePlaceSchema(item);
      default:
        return {
          "@type": "Thing",
          name: item.title || item.name,
          description: item.description,
          image: item.image_url || item.poster_path
        };
    }
  }

  static generateMovieSchema(movie: any): MovieSchema {
    return {
      "@type": "Movie",
      name: movie.title,
      description: movie.overview,
      image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
      datePublished: movie.release_date,
      genre: movie.genres?.map((g: any) => g.name) || [],
      director: movie.director ? {
        "@type": "Person",
        name: movie.director
      } : undefined,
      aggregateRating: movie.vote_average ? {
        "@type": "AggregateRating",
        ratingValue: movie.vote_average,
        reviewCount: movie.vote_count || 0,
        bestRating: 10,
        worstRating: 0
      } : undefined,
      duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
      contentRating: movie.certification
    };
  }

  static generateTVSeriesSchema(series: any): any {
    return {
      "@type": "TVSeries",
      name: series.name || series.title,
      description: series.overview,
      image: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : undefined,
      datePublished: series.first_air_date,
      genre: series.genres?.map((g: any) => g.name) || [],
      numberOfSeasons: series.number_of_seasons,
      numberOfEpisodes: series.number_of_episodes,
      aggregateRating: series.vote_average ? {
        "@type": "AggregateRating",
        ratingValue: series.vote_average,
        reviewCount: series.vote_count || 0,
        bestRating: 10,
        worstRating: 0
      } : undefined
    };
  }

  static generateBookSchema(book: any): BookSchema {
    return {
      "@type": "Book",
      name: book.title,
      description: book.description,
      image: book.image_links?.large || book.image_links?.thumbnail,
      author: book.authors?.[0] ? {
        "@type": "Person",
        name: book.authors[0]
      } : undefined,
      isbn: book.isbn_13 || book.isbn_10,
      numberOfPages: book.page_count,
      genre: book.categories || [],
      publisher: book.publisher ? {
        "@type": "Organization",
        name: book.publisher,
        url: "",
        logo: {
          "@type": "ImageObject",
          url: ""
        }
      } : undefined,
      datePublished: book.published_date,
      aggregateRating: book.average_rating ? {
        "@type": "AggregateRating",
        ratingValue: book.average_rating,
        reviewCount: book.ratings_count || 0,
        bestRating: 5,
        worstRating: 1
      } : undefined
    };
  }

  static generateGameSchema(game: any): GameSchema {
    return {
      "@type": "VideoGame",
      name: game.name,
      description: game.description_raw || game.description,
      image: game.background_image,
      genre: game.genres?.map((g: any) => g.name) || [],
      gamePlatform: game.platforms?.map((p: any) => p.platform?.name) || [],
      datePublished: game.released,
      aggregateRating: game.rating ? {
        "@type": "AggregateRating",
        ratingValue: game.rating,
        reviewCount: game.ratings_count || 0,
        bestRating: 5,
        worstRating: 1
      } : undefined,
      applicationCategory: "Game"
    };
  }

  static generatePersonSchema(person: any): PersonSchema {
    return {
      "@type": "Person",
      name: person.name,
      image: person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : undefined,
      url: person.homepage,
      sameAs: person.external_ids ? [
        person.external_ids.twitter_id ? `https://twitter.com/${person.external_ids.twitter_id}` : '',
        person.external_ids.instagram_id ? `https://instagram.com/${person.external_ids.instagram_id}` : '',
        person.external_ids.facebook_id ? `https://facebook.com/${person.external_ids.facebook_id}` : ''
      ].filter(Boolean) : undefined
    };
  }

  static generatePlaceSchema(place: any): PlaceSchema {
    return {
      "@type": "Place",
      name: place.name,
      description: place.description,
      image: place.image_url,
      address: place.address ? {
        "@type": "PostalAddress",
        streetAddress: place.address.street,
        addressLocality: place.address.city,
        addressRegion: place.address.state,
        postalCode: place.address.zip,
        addressCountry: place.address.country
      } : undefined,
      geo: place.coordinates ? {
        "@type": "GeoCoordinates",
        latitude: place.coordinates.lat,
        longitude: place.coordinates.lng
      } : undefined,
      aggregateRating: place.rating ? {
        "@type": "AggregateRating",
        ratingValue: place.rating,
        reviewCount: place.user_ratings_total || 0,
        bestRating: 5,
        worstRating: 1
      } : undefined
    };
  }

  static generateBreadcrumbSchema(items: { name: string; url: string }[]): BreadcrumbSchema {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }

  static generateCollectionPageSchema(category: string, lists: any[], language: string = 'tr'): any {
    const categoryNames = {
      movies: { tr: 'Film Listeleri', en: 'Movie Lists' },
      series: { tr: 'Dizi Listeleri', en: 'TV Series Lists' },
      books: { tr: 'Kitap Listeleri', en: 'Book Lists' },
      games: { tr: 'Oyun Listeleri', en: 'Game Lists' },
      people: { tr: 'Kişi Listeleri', en: 'People Lists' },
      places: { tr: 'Mekan Listeleri', en: 'Place Lists' }
    };

    const categoryName = categoryNames[category as keyof typeof categoryNames]?.[language as 'tr' | 'en'] || category;

    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${categoryName} | ConnectList`,
      description: `${categoryName} - ConnectList'te en popüler ${category} listelerini keşfedin`,
      url: `${this.BASE_URL}/lists/${category}`,
      mainEntity: {
        "@type": "ItemList",
        name: categoryName,
        numberOfItems: lists.length,
        itemListElement: lists.slice(0, 20).map((list, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: list.title,
            description: list.description,
            url: `${this.BASE_URL}/list/${list.id}`,
            author: {
              "@type": "Person",
              name: list.profiles?.full_name || list.profiles?.username
            },
            dateCreated: list.created_at,
            genre: category
          }
        }))
      },
      publisher: this.ORGANIZATION
    };
  }

  // Utility method to get schema for any page
  static async generatePageSchema(pageType: string, data: any, language: string = 'tr'): Promise<any> {
    switch (pageType) {
      case 'website':
        return this.generateWebsiteSchema(language);
      case 'list':
        return this.generateListSchema(data.list, data.items);
      case 'category':
        return this.generateCollectionPageSchema(data.category, data.lists, language);
      case 'breadcrumb':
        return this.generateBreadcrumbSchema(data.items);
      default:
        return this.generateWebsiteSchema(language);
    }
  }
}

// Export for easy use
export default SchemaGenerator; 