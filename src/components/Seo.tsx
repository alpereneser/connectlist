import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { SchemaMarkupGenerator, SchemaMarkupConfig } from '../lib/schema-markup';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  children?: React.ReactNode;
  structuredData?: object;
  keywords?: string;
  author?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  schemaMarkup?: SchemaMarkupConfig;
  breadcrumbs?: Array<{ name: string; url: string }>;
  alternateLanguages?: Array<{ hreflang: string; href: string }>;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  image = 'https://connectlist.me/logo.png',
  url,
  type = 'website',
  children,
  structuredData,
  keywords,
  author = 'Connectlist',
  canonical,
  noindex = false,
  nofollow = false,
  schemaMarkup,
  breadcrumbs,
  alternateLanguages,
  publishedTime,
  modifiedTime,
  section,
  tags
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const defaultTitle = i18n.language === 'tr'
    ? 'Connectlist – Listeler, kitaplar, filmler, diziler, oyunlar ve daha fazlası.'
    : 'Connectlist – Lists, books, movies, series, games and much more.';
  const defaultDescription = i18n.language === 'tr'
    ? 'Kendi içerik listelerini oluştur, paylaş ve keşfet. Kitap, film, dizi, oyun ve daha fazlasını kolayca yönet.'
    : 'Create, share and discover your own content lists. Easily manage books, movies, series, games and more.';
  
  const defaultKeywords = i18n.language === 'tr'
    ? 'liste, kitap, film, dizi, oyun, paylaşım, keşfet, içerik, yönetim'
    : 'list, book, movie, series, game, share, discover, content, management';

  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalUrl = url || `https://connectlist.me${location.pathname}`;
  const finalCanonical = canonical || finalUrl;
  const finalKeywords = keywords || defaultKeywords;

  const structuredDataWithLang = structuredData
    ? { ...structuredData, inLanguage: i18n.language }
    : undefined;

  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow'
  ].join(', ');

  // Schema Markup JSON-LD oluştur
  const schemaMarkupJSON = schemaMarkup 
    ? SchemaMarkupGenerator.generateJSONLD(schemaMarkup)
    : null;

  // Breadcrumb Schema oluştur
  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0
    ? SchemaMarkupGenerator.generateJSONLD({
        type: 'BreadcrumbList',
        data: breadcrumbs
      })
    : null;

  // Website Schema (her sayfada)
  const websiteSchema = SchemaMarkupGenerator.generateJSONLD({
    type: 'WebSite',
    data: {}
  });

  return (
    <Helmet>
      <html lang={i18n.language} />
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsContent} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="theme-color" content="#3B82F6" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Connectlist" />
      <meta name="application-name" content="Connectlist" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* Alternate Language URLs */}
      {alternateLanguages?.map((alt, index) => (
        <link key={index} rel="alternate" hrefLang={alt.hreflang} href={alt.href} />
      ))}
      
      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${finalTitle} ${t('social.meta.defaultImage')}`} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={t('social.meta.siteName')} />
      <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : 'en_US'} />
      <meta property="og:locale:alternate" content={i18n.language === 'tr' ? 'en_US' : 'tr_TR'} />
      
      {/* Article specific Open Graph */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {section && <meta property="article:section" content={section} />}
          {tags?.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
          <meta property="article:author" content={author} />
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={finalTitle} />
      <meta name="twitter:site" content="@connectlist" />
      <meta name="twitter:creator" content="@connectlist" />
      <meta name="twitter:creator" content="@connectlist" />
      
      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#1f2937" />
      <meta name="msapplication-TileColor" content="#1f2937" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Connectlist" />
      
      {/* Structured Data - Website Schema (her sayfada) */}
      <script type="application/ld+json">
        {websiteSchema}
      </script>
      
      {/* Structured Data - Sayfa özel Schema */}
      {schemaMarkupJSON && (
        <script type="application/ld+json">
          {schemaMarkupJSON}
        </script>
      )}
      
      {/* Structured Data - Breadcrumb Schema */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {breadcrumbSchema}
        </script>
      )}
      
      {/* Legacy Structured Data */}
      {structuredDataWithLang && (
        <script type="application/ld+json">
          {JSON.stringify(structuredDataWithLang)}
        </script>
      )}
      
      {children}
    </Helmet>
  );
};

export default Seo;
