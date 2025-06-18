export interface LocalBusinessSchema {
  "@context": "https://schema.org";
  "@type": "Organization" | "LocalBusiness";
  name: string;
  description: string;
  url: string;
  logo: string;
  image: string[];
  telephone?: string;
  email?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  openingHours?: string[];
  sameAs: string[];
  foundingDate?: string;
  numberOfEmployees?: string;
  knowsAbout?: string[];
  areaServed?: string | string[];
}

export const generateLocalBusinessSchema = (language: string = 'tr'): LocalBusinessSchema => {
  const isTurkish = language === 'tr';
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ConnectList",
    description: isTurkish 
      ? "Türkiye'nin en popüler sosyal liste oluşturma platformu. Film, dizi, kitap, oyun ve kişi listelerinizi oluşturun ve paylaşın."
      : "Turkey's most popular social list creation platform. Create and share your movie, TV series, book, game and people lists.",
    url: "https://connectlist.me",
    logo: "https://connectlist.me/logo.png",
    image: [
      "https://connectlist.me/images/connectlist-social-cover.jpg",
      "https://connectlist.me/images/connectlist-app-screenshot.jpg"
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "İstanbul",
      addressRegion: "İstanbul",
      addressCountry: "TR"
    },
    areaServed: [
      "Turkey",
      "Türkiye",
      "TR"
    ],
    sameAs: [
      "https://twitter.com/connectlist",
      "https://instagram.com/connectlist",
      "https://facebook.com/connectlist",
      "https://linkedin.com/company/connectlist"
    ],
    foundingDate: "2024",
    knowsAbout: [
      "Film Listeleri",
      "Dizi Önerileri", 
      "Kitap Listeleri",
      "Oyun Önerileri",
      "Sosyal Medya",
      "İçerik Keşfi",
      "Liste Oluşturma",
      "Movie Lists",
      "TV Series Recommendations",
      "Book Lists",
      "Game Recommendations",
      "Social Media",
      "Content Discovery"
    ]
  };
};

// Turkish cities for local targeting
export const turkishCities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Şanlıurfa',
  'Gaziantep', 'Kocaeli', 'Mersin', 'Diyarbakır', 'Hatay', 'Manisa', 'Kayseri',
  'Samsun', 'Balıkesir', 'Kahramanmaraş', 'Van', 'Aydın', 'Denizli', 'Sakarya',
  'Muğla', 'Eskişehir', 'Tekirdağ', 'Trabzon', 'Elazığ', 'Malatya', 'Erzurum',
  'Sivas', 'Çorum', 'Batman', 'Adıyaman', 'Zonguldak', 'Kastamonu'
];

// Generate location-based content ideas
export const generateLocationBasedContent = (city: string) => ({
  movieNights: `${city}'da Film Geceleri - En İyi Mekanlar`,
  bookClubs: `${city} Kitap Kulüpleri ve Okuma Grupları`,
  gamingCafes: `${city}'da Oyun Cafeleri ve E-Spor Mekanları`,
  libraries: `${city}'daki En İyi Kütüphaneler`,
  cinemas: `${city} Sinema Salonları Rehberi`,
  bookstores: `${city}'da Kitapçılar ve Sahaflar`
});

export default {
  generateLocalBusinessSchema,
  turkishCities,
  generateLocationBasedContent
}; 