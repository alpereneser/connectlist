import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  children?: React.ReactNode;
  structuredData?: object;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  image = 'https://connectlist.me/logo.png',
  url = 'https://connectlist.me',
  type = 'website',
  children,
  structuredData
}) => {
  const { i18n } = useTranslation();

  const defaultTitle = i18n.language === 'tr'
    ? 'Connectlist – Listeler, kitaplar, filmler, diziler, oyunlar ve daha fazlası.'
    : 'Connectlist – Lists, books, movies, series, games and much more.';
  const defaultDescription = i18n.language === 'tr'
    ? 'Kendi içerik listelerini oluştur, paylaş ve keşfet. Kitap, film, dizi, oyun ve daha fazlasını kolayca yönet.'
    : 'Create, share and discover your own content lists. Easily manage books, movies, series, games and more.';

  const structuredDataWithLang = structuredData
    ? { ...structuredData, inLanguage: i18n.language }
    : undefined;

  return (
    <Helmet>
      <html lang={i18n.language} />
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || defaultTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image} />
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

import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  children?: React.ReactNode;
  structuredData?: object;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  image = 'https://connectlist.me/logo.png',
  url = 'https://connectlist.me',
  type = 'website',
  children,
  structuredData
}) => {
  const { i18n } = useTranslation();

  const defaultTitle = i18n.language === 'tr'
    ? 'Connectlist – Listeler, kitaplar, filmler, diziler, oyunlar ve daha fazlası.'
    : 'Connectlist – Lists, books, movies, series, games and much more.';
  const defaultDescription = i18n.language === 'tr'
    ? 'Kendi içerik listelerini oluştur, paylaş ve keşfet. Kitap, film, dizi, oyun ve daha fazlasını kolayca yönet.'
    : 'Create, share and discover your own content lists. Easily manage books, movies, series, games and more.';

  const structuredDataWithLang = structuredData
    ? { ...structuredData, inLanguage: i18n.language }
    : undefined;

  return (
    <Helmet>
      <html lang={i18n.language} />
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || defaultTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image} />
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

import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  children?: React.ReactNode;
  structuredData?: object;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  image = 'https://connectlist.me/logo.png',
  url = 'https://connectlist.me',
  type = 'website',
  children,
  structuredData
}) => {
  const { i18n } = useTranslation();

  const defaultTitle = i18n.language === 'tr'
    ? 'Connectlist – Listeler, kitaplar, filmler, diziler, oyunlar ve daha fazlası.'
    : 'Connectlist – Lists, books, movies, series, games and much more.';
  const defaultDescription = i18n.language === 'tr'
    ? 'Kendi içerik listelerini oluştur, paylaş ve keşfet. Kitap, film, dizi, oyun ve daha fazlasını kolayca yönet.'
    : 'Create, share and discover your own content lists. Easily manage books, movies, series, games and more.';

  const structuredDataWithLang = structuredData
    ? { ...structuredData, inLanguage: i18n.language }
    : undefined;

  return (
    <Helmet>
      <html lang={i18n.language} />
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || defaultTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image} />
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
        <meta property="og:url" content={url} />
        <meta property="og:type" content={type} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
        {children}
      </Helmet>
    
  );
};

export default Seo;
