import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import ContentComments from '../../components/ContentComments';

import { useMovieDetails } from '../../hooks/useMovieDetails';
import { useWhoAdded } from '../../hooks/useWhoAdded';
import { WhoAddedModal } from '../../components/WhoAddedModal';
import { AddToListModal } from '../../components/AddToListModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthPopup } from '../../components/AuthPopup';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import SEOContentOptimizer from '../../lib/seo-content-optimizer';

interface MovieDetails {
  id: string;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  cast_members: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string;
  }>;
  crew_members: Array<{
    id: number;
    name: string;
    job: string;
    profile_path: string;
  }>;
}

export function MovieDetails() {
  const { id, slug } = useParams<{ id: string; slug?: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const [showAllCast, setShowAllCast] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: movie, isLoading, error: fetchError, refetch } = useMovieDetails(id || '');
  const { users, fetchUsers } = useWhoAdded();
  const [showListUsers, setShowListUsers] = useState(false);

  const fetchListUsers = async () => {
    await fetchUsers('movie', id || '');
    setShowListUsers(true);
  };

  // SEO optimization using the new optimizer
  const seoContent = useMemo(() => {
    if (!movie) return null;
    return SEOContentOptimizer.optimizeMovieSEO(movie, i18n.language);
  }, [movie, i18n.language]);

  // Check and redirect if slug is missing or incorrect
  useEffect(() => {
    if (movie && movie.title) {
      const correctSlug = movie.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
        
      if (!slug || slug !== correctSlug) {
        const newUrl = `/movie/${id}/${correctSlug}`;
        navigate(newUrl, { replace: true });
      }
    }
  }, [movie, slug, id, navigate]);

  // FAQ Schema for the movie
  const faqSchema = useMemo(() => {
    if (!movie) return null;
    return SEOContentOptimizer.generateContentFAQ('movie', movie, i18n.language);
  }, [movie, i18n.language]);



  const handleAttemptAddToList = async () => {
    try {
      // Kullanıcının oturum durumunu kontrol et
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Oturum açıksa doğrudan modal'ı göster
        console.log('Oturum açık, kullanıcı ID:', session.user.id);
        setShowAddToListModal(true);
      } else {
        // Oturum açık değilse requireAuth ile oturum açma popup'ını göster
        console.log('Oturum açık değil, popup gösteriliyor');
        const isLoggedIn = await requireAuth(t('details.addToListAuthAction'));
        if (isLoggedIn) {
          setShowAddToListModal(true);
        }
      }
    } catch (error) {
      console.error('Oturum kontrolü sırasında hata:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('common.loading')} - ConnectList</title>
        </Helmet>
        <Header />
        <LoadingSpinner />
      </>
    );
  }

  if (fetchError || !movie) {
    return (
      <>
        <Helmet>
          <title>{t('common.error')} - ConnectList</title>
        </Helmet>
        <Header />
        <ErrorDisplay message={String(fetchError || t('details.movieNotFound'))} onRetry={refetch} />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{seoContent?.title || `${movie.title} - ConnectList`}</title>
        <meta name="description" content={seoContent?.description || movie.overview?.substring(0, 160) || t('app.description')} />
        <meta name="keywords" content={seoContent?.keywords.join(', ') || ''} />
        <link rel="canonical" href={seoContent?.canonicalUrl || `https://connectlist.me/movie/${id}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={seoContent?.title || movie.title} />
        <meta property="og:description" content={seoContent?.description || movie.overview?.substring(0, 160)} />
        <meta property="og:image" content={seoContent?.ogImage || `https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        <meta property="og:type" content="video.movie" />
        <meta property="og:url" content={seoContent?.canonicalUrl} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoContent?.title || movie.title} />
        <meta name="twitter:description" content={seoContent?.description} />
        <meta name="twitter:image" content={seoContent?.ogImage} />
        
        {/* Hreflang */}
        {seoContent?.hreflang?.map(lang => (
          <link key={lang.lang} rel="alternate" hrefLang={lang.lang} href={lang.url} />
        ))}
        
        {/* Structured Data */}
        {seoContent?.structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(seoContent.structuredData)}
          </script>
        )}
        
        {/* FAQ Schema */}
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
        
        {/* Breadcrumb Schema */}
        {seoContent?.breadcrumbs && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": seoContent.breadcrumbs.map((breadcrumb, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": breadcrumb.name,
                "item": breadcrumb.url
              }))
            })}
          </script>
        )}
      </Helmet>

      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative">
          {/* Background Image */}
          <div 
            className="h-[500px] bg-cover bg-center relative"
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path})`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          </div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center gap-8">
                {/* Movie Poster */}
                <div className="flex-shrink-0">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-64 h-96 object-cover rounded-lg shadow-2xl"
                  />
                </div>
                
                {/* Movie Info */}
                <div className="text-white flex-1">
                  <h1 className="text-5xl font-bold mb-4">{movie.title}</h1>
                  
                  {/* Movie Meta */}
                  <div className="flex items-center gap-4 text-lg mb-4">
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                    <span>•</span>
                    <span>{Math.floor(movie.runtime / 60)}s {movie.runtime % 60}d</span>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">★</span>
                      <span>{movie.vote_average?.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  {/* Genres */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map((genre: { id: number; name: string }) => (
                      <span
                        key={genre.id + '-' + genre.name}
                        className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleAttemptAddToList}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Plus size={20} />
                      Listeme Ekle
                    </button>
                    <button
                      onClick={fetchListUsers}
                      className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Users size={20} />
                      Kim Eklemiş
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Film Hakkında Detaylar */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Film Hakkında Detaylar</h2>
                <p className="text-gray-700 leading-relaxed">{movie.overview}</p>
              </div>

              {/* Oyuncular */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Oyuncular</h2>
                  {movie.cast_members.length > 8 && !showAllCast && (
                    <button
                      onClick={() => setShowAllCast(true)}
                      className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Tümünü Gör ({movie.cast_members.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(showAllCast ? movie.cast_members : movie.cast_members.slice(0, 8)).map((person: { id: number; name: string; character: string; profile_path: string }) => (
                    <div
                      key={person.id + '-' + person.name}
                      onClick={() => navigate(`/person/${person.id}`)}
                      className="text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        className="w-full aspect-square object-cover rounded-lg mb-3"
                      />
                      <h3 className="font-medium text-sm mb-1">{person.name}</h3>
                      <p className="text-xs text-gray-500">{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yorumlar */}
              <ContentComments
                contentType="movie"
                contentId={movie.id}
                contentTitle={movie.title}
              />
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Film Bilgileri */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold mb-4">Film Bilgileri</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Çıkış Tarihi</span>
                    <p className="font-medium">{new Date(movie.release_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Süre</span>
                    <p className="font-medium">{Math.floor(movie.runtime / 60)} saat {movie.runtime % 60} dakika</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">IMDB Puanı</span>
                    <p className="font-medium flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      {movie.vote_average?.toFixed(1)}/10
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Oy Sayısı</span>
                    <p className="font-medium">{movie.vote_count?.toLocaleString()} oy</p>
                  </div>
                </div>
              </div>

              {/* Yapım Ekibi */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold mb-4">Yapım Ekibi</h3>
                <div className="space-y-4">
                  {movie.crew_members
                    .filter((person: { job: string }) => ['Director', 'Screenplay', 'Story'].includes(person.job))
                    .slice(0, 5)
                    .map((person: { id: number; name: string; job: string; profile_path: string }) => (
                      <div
                        key={person.id + '-' + person.name}
                        onClick={() => navigate(`/person/${person.id}`)}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          alt={person.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-sm">{person.name}</h4>
                          <p className="text-xs text-gray-500">{person.job}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="movie"
        contentId={movie.id}
        contentTitle={movie.title}
        contentImage={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
        contentYear={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : undefined}
        contentDescription={movie.overview}
      />

      <WhoAddedModal
        isOpen={showListUsers}
        onClose={() => setShowListUsers(false)}
        users={users}
        contentType="movie"
      />

      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
    </>
  );
}
