import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../components/Header';
import { BottomMenu } from '../components/BottomMenu';
import { ListPreview } from '../components/ListPreview';
import { supabaseBrowser } from '../lib/supabase-browser';

interface CategoryLandingProps {
  category: 'movies' | 'series' | 'books' | 'games' | 'people' | 'places';
}

export function CategoryLanding() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [lists, setLists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalLists: 0,
    totalUsers: 0,
    totalItems: 0
  });

  // Category configuration
  const categoryConfig = {
    movies: {
      title: 'Film Listeleri',
      titleEn: 'Movie Lists',
      description: 'En iyi film listelerini keşfedin. Aksiyon, komedi, drama ve daha fazla türde binlerce film önerisi.',
      descriptionEn: 'Discover the best movie lists. Thousands of movie recommendations in action, comedy, drama and more genres.',
      icon: '🎬',
      keywords: 'film listeleri, movie lists, sinema, film önerileri, en iyi filmler',
      schema: 'Movie'
    },
    series: {
      title: 'Dizi Listeleri',
      titleEn: 'TV Series Lists',
      description: 'Popüler dizi listelerini inceleyin. Netflix, Amazon Prime ve diğer platformlardaki en iyi diziler.',
      descriptionEn: 'Explore popular TV series lists. Best shows on Netflix, Amazon Prime and other platforms.',
      icon: '📺',
      keywords: 'dizi listeleri, tv series, netflix dizileri, dizi önerileri',
      schema: 'TVSeries'
    },
    books: {
      title: 'Kitap Listeleri',
      titleEn: 'Book Lists',
      description: 'Kitap severlerin oluşturduğu listeler. Roman, bilim kurgu, tarih ve daha fazla kategoride kitap önerileri.',
      descriptionEn: 'Lists created by book lovers. Book recommendations in fiction, sci-fi, history and more categories.',
      icon: '📚',
      keywords: 'kitap listeleri, book lists, okuma önerileri, en iyi kitaplar',
      schema: 'Book'
    },
    games: {
      title: 'Oyun Listeleri',
      titleEn: 'Game Lists',
      description: 'Oyun tutkunlarının oyun listeleri. PC, PlayStation, Xbox ve mobil oyun önerileri.',
      descriptionEn: 'Game lists by gaming enthusiasts. PC, PlayStation, Xbox and mobile game recommendations.',
      icon: '🎮',
      keywords: 'oyun listeleri, game lists, video games, oyun önerileri',
      schema: 'VideoGame'
    },
    people: {
      title: 'Kişi Listeleri',
      titleEn: 'People Lists',
      description: 'İlham verici kişiler, ünlüler ve etkileyici insanların listeleri.',
      descriptionEn: 'Lists of inspiring people, celebrities and influential personalities.',
      icon: '👤',
      keywords: 'kişi listeleri, ünlüler, inspiring people, celebrities',
      schema: 'Person'
    },
    places: {
      title: 'Mekan Listeleri',
      titleEn: 'Place Lists',
      description: 'Gezilecek yerler, restoranlar ve keşfedilmeyi bekleyen mekanlar.',
      descriptionEn: 'Places to visit, restaurants and locations waiting to be discovered.',
      icon: '📍',
      keywords: 'mekan listeleri, gezilecek yerler, restaurants, travel',
      schema: 'Place'
    }
  };

  const currentCategory = category && categoryConfig[category as keyof typeof categoryConfig] 
    ? categoryConfig[category as keyof typeof categoryConfig]
    : categoryConfig.movies;

  // Fetch category data
  useEffect(() => {
    fetchCategoryData();
  }, [category]);

  const fetchCategoryData = async () => {
    if (!category) return;
    
    setIsLoading(true);
    try {
      // Fetch lists for this category
      const { data: listsData } = await supabaseBrowser
        .from('lists')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar
          )
        `)
        .eq('category', category)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch stats
      const { count: totalLists } = await supabaseBrowser
        .from('lists')
        .select('*', { count: 'exact', head: true })
        .eq('category', category)
        .eq('is_public', true);

      const { count: totalUsers } = await supabaseBrowser
        .from('lists')
        .select('user_id', { count: 'exact', head: true })
        .eq('category', category)
        .eq('is_public', true);

      setLists(listsData || []);
      setStats({
        totalLists: totalLists || 0,
        totalUsers: totalUsers || 0,
        totalItems: (listsData || []).reduce((sum, list) => sum + (list.items?.length || 0), 0)
      });

    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // SEO Meta Data
  const pageTitle = i18n.language === 'tr' 
    ? `${currentCategory.title} | ConnectList`
    : `${currentCategory.titleEn} | ConnectList`;
    
  const pageDescription = i18n.language === 'tr' 
    ? currentCategory.description
    : currentCategory.descriptionEn;

  const canonicalUrl = `https://connectlist.me/lists/${category}`;

  // Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": pageTitle,
    "description": pageDescription,
    "url": canonicalUrl,
    "mainEntity": {
      "@type": "ItemList",
      "name": `${currentCategory.title} Collection`,
      "description": pageDescription,
      "numberOfItems": stats.totalLists,
      "itemListElement": lists.slice(0, 10).map((list, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "CreativeWork",
          "name": list.title,
          "description": list.description,
          "url": `https://connectlist.me/list/${list.id}`,
          "author": {
            "@type": "Person",
            "name": list.profiles?.full_name || list.profiles?.username
          },
          "dateCreated": list.created_at,
          "genre": category
        }
      }))
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Ana Sayfa",
          "item": "https://connectlist.me"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": currentCategory.title,
          "item": canonicalUrl
        }
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={currentCategory.keywords} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`https://connectlist.me/api/og-image?category=${category}`} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`https://connectlist.me/api/og-image?category=${category}`} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        
        {/* Hreflang for multi-language */}
        <link rel="alternate" hrefLang="tr" href={`https://connectlist.me/lists/${category}?lang=tr`} />
        <link rel="alternate" hrefLang="en" href={`https://connectlist.me/lists/${category}?lang=en`} />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      </Helmet>

      <Header />
      
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="text-center">
              <div className="text-6xl mb-4">{currentCategory.icon}</div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {i18n.language === 'tr' ? currentCategory.title : currentCategory.titleEn}
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
                {pageDescription}
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div>
                  <div className="text-3xl font-bold">{stats.totalLists.toLocaleString()}</div>
                  <div className="text-orange-100">{t('common.lists')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-orange-100">{t('common.users')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.totalItems.toLocaleString()}</div>
                  <div className="text-orange-100">{t('common.items')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Popular Lists */}
          <section>
            <h2 className="text-2xl font-bold mb-8">
              {t('categories.popularLists', `Popüler ${currentCategory.title}`)}
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map((list) => (
                  <ListPreview
                    key={list.id}
                    list={list}
                    onLike={() => {}}
                    onComment={() => {}}
                    isLiked={false}
                  />
                ))}
              </div>
            )}
          </section>

          {/* CTA Section */}
          <section className="mt-16 text-center">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-bold mb-4">
                {t('categories.createYourList', `Kendi ${currentCategory.title}nizi Oluşturun`)}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('categories.createDescription', 'Sevdiğiniz içerikleri listeleyip diğer kullanıcılarla paylaşın.')}
              </p>
              <button
                onClick={() => navigate('/select-category')}
                className="bg-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                {t('common.createList', 'Liste Oluştur')}
              </button>
            </div>
          </section>
        </div>
      </div>

      <BottomMenu />
    </>
  );
} 