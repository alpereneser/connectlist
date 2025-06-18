import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomMenu } from '../components/BottomMenu';
import { SchemaGenerator } from '../lib/schema-generator';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  slug: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  readTime: number;
  image?: string;
  featured: boolean;
}

// Sample blog posts for SEO content
const samplePosts: BlogPost[] = [
  {
    id: '1',
    title: '2024\'ün En İyi Film Listeleri Nasıl Oluşturulur?',
    excerpt: 'Film listesi oluştururken dikkat edilmesi gereken noktalar ve en popüler film türleri hakkında rehber.',
    content: '...',
    slug: '2024-en-iyi-film-listeleri-nasil-olusturulur',
    category: 'Film',
    tags: ['film listeleri', 'sinema', '2024 filmleri', 'liste oluşturma'],
    publishedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    author: {
      name: 'ConnectList Editörü',
      avatar: '/avatars/editor.jpg'
    },
    readTime: 5,
    image: '/blog/film-listeleri-2024.jpg',
    featured: true
  },
  {
    id: '2',
    title: 'Netflix\'te İzlenmesi Gereken 50 Dizi',
    excerpt: 'Netflix platformundaki en popüler ve kaliteli dizilerin kapsamlı listesi.',
    content: '...',
    slug: 'netflix-izlenmesi-gereken-50-dizi',
    category: 'Dizi',
    tags: ['netflix', 'dizi önerileri', 'streaming', 'en iyi diziler'],
    publishedAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-10T14:30:00Z',
    author: {
      name: 'ConnectList Editörü'
    },
    readTime: 8,
    image: '/blog/netflix-dizileri.jpg',
    featured: true
  },
  {
    id: '3',
    title: 'Kitap Listeleri ile Okuma Alışkanlığı Geliştirme',
    excerpt: 'Kitap listeleri oluşturarak okuma hedeflerinize ulaşmanın yolları.',
    content: '...',
    slug: 'kitap-listeleri-okuma-aliskanligi-gelistirme',
    category: 'Kitap',
    tags: ['kitap listeleri', 'okuma alışkanlığı', 'kitap önerileri'],
    publishedAt: '2024-01-05T09:15:00Z',
    updatedAt: '2024-01-05T09:15:00Z',
    author: {
      name: 'ConnectList Editörü'
    },
    readTime: 6,
    featured: false
  },
  {
    id: '4',
    title: '2024 Yılının En Beklenen Oyunları',
    excerpt: 'Bu yıl çıkacak olan en heyecan verici video oyunlarının listesi.',
    content: '...',
    slug: '2024-yilinin-en-beklenen-oyunlari',
    category: 'Oyun',
    tags: ['2024 oyunları', 'video games', 'oyun önerileri', 'gaming'],
    publishedAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    author: {
      name: 'ConnectList Editörü'
    },
    readTime: 7,
    featured: false
  }
];

export function Blog() {
  const { i18n } = useTranslation();
  const [posts] = useState<BlogPost[]>(samplePosts);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Film', 'Dizi', 'Kitap', 'Oyun', 'Kişi', 'Mekan'];
  const featuredPosts = posts.filter(post => post.featured);
  const regularPosts = posts.filter(post => !post.featured);

  const filteredPosts = selectedCategory === 'all' 
    ? regularPosts 
    : regularPosts.filter(post => post.category === selectedCategory);

  // SEO Meta Data
  const pageTitle = 'Blog | ConnectList - Liste Oluşturma Rehberleri ve İpuçları';
  const pageDescription = 'Film, dizi, kitap ve oyun listeleri oluşturma rehberleri. ConnectList blog\'unda en iyi içerik önerilerini keşfedin.';
  const canonicalUrl = 'https://connectlist.me/blog';

  // Structured Data for Blog
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "ConnectList Blog",
    "description": pageDescription,
    "url": canonicalUrl,
    "publisher": {
      "@type": "Organization",
      "name": "ConnectList",
      "url": "https://connectlist.me",
      "logo": {
        "@type": "ImageObject",
        "url": "https://connectlist.me/logo.png"
      }
    },
    "blogPost": posts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt,
      "url": `https://connectlist.me/blog/${post.slug}`,
      "datePublished": post.publishedAt,
      "dateModified": post.updatedAt,
      "author": {
        "@type": "Person",
        "name": post.author.name
      },
      "image": post.image ? `https://connectlist.me${post.image}` : undefined,
      "wordCount": post.readTime * 200, // Approximate word count
      "timeRequired": `PT${post.readTime}M`,
      "keywords": post.tags.join(', '),
      "articleSection": post.category,
      "publisher": {
        "@type": "Organization",
        "name": "ConnectList",
        "url": "https://connectlist.me"
      }
    }))
  };

  const breadcrumbSchema = SchemaGenerator.generateBreadcrumbSchema([
    { name: 'Ana Sayfa', url: 'https://connectlist.me' },
    { name: 'Blog', url: canonicalUrl }
  ]);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="blog, liste oluşturma, film listeleri, dizi önerileri, kitap listeleri, oyun önerileri" />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://connectlist.me/blog-cover.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://connectlist.me/blog-cover.jpg" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(blogSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        
        {/* Article specific meta */}
        <meta name="article:publisher" content="https://connectlist.me" />
        <meta name="article:author" content="ConnectList" />
      </Helmet>

      <Header />
      
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                ConnectList Blog
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
                Liste oluşturma rehberleri, içerik önerileri ve platform güncellemeleri
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">Öne Çıkan Yazılar</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {featuredPosts.map((post) => (
                  <article key={post.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {post.image && (
                      <div className="aspect-video bg-gray-200">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {post.category}
                        </span>
                        <span className="text-gray-500 text-sm ml-auto">
                          {post.readTime} dk okuma
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 hover:text-orange-600 transition-colors">
                        <Link to={`/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {post.author.avatar && (
                            <img 
                              src={post.author.avatar} 
                              alt={post.author.name}
                              className="w-8 h-8 rounded-full mr-3"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(post.publishedAt).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        <Link 
                          to={`/blog/${post.slug}`}
                          className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          Devamını Oku →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category === 'all' ? 'Tümü' : category}
                </button>
              ))}
            </div>
          </div>

          {/* Regular Posts */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-gray-900">Tüm Yazılar</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {post.image && (
                    <div className="aspect-video bg-gray-200">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center mb-3">
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {post.category}
                      </span>
                      <span className="text-gray-500 text-sm ml-auto">
                        {post.readTime} dk
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900 hover:text-orange-600 transition-colors">
                      <Link to={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {new Date(post.publishedAt).toLocaleDateString('tr-TR')}
                      </p>
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Oku
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Newsletter Signup */}
          <section className="mt-16">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">
                Yeni Yazılardan Haberdar Olun
              </h3>
              <p className="mb-6 max-w-2xl mx-auto">
                ConnectList blog'undaki yeni yazıları ve platform güncellemelerini e-posta ile alın.
              </p>
              <div className="max-w-md mx-auto flex gap-4">
                <input
                  type="email"
                  placeholder="E-posta adresiniz"
                  className="flex-1 px-4 py-2 rounded-lg text-gray-900"
                />
                <button className="bg-white text-orange-500 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  Abone Ol
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BottomMenu />
    </>
  );
} 