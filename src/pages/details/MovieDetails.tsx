import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Eye, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import ContentComments from '../../components/ContentComments';
import { ShareModal } from '../../components/ShareModal';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
        const isLoggedIn = await requireAuth('addingToList');
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
        <meta property="og:type" content="video.movie" />
        <meta property="og:url" content={seoContent?.canonicalUrl || `https://connectlist.me/movie/${id}`} />
        <meta property="og:title" content={seoContent?.title || movie.title} />
        <meta property="og:description" content={seoContent?.description || movie.overview?.substring(0, 160) || t('social.meta.movieDescription', { title: movie.title })} />
        <meta property="og:image" content={seoContent?.ogImage || `https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        <meta property="og:image:width" content="500" />
        <meta property="og:image:height" content="750" />
        <meta property="og:image:alt" content={`${movie.title} ${t('social.meta.defaultImage')}`} />
        <meta property="og:site_name" content={t('social.meta.siteName')} />
        <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : 'en_US'} />
        <meta property="og:locale:alternate" content={i18n.language === 'tr' ? 'en_US' : 'tr_TR'} />
        
        {/* Movie specific Open Graph */}
        {movie.release_date && <meta property="video:release_date" content={movie.release_date} />}
        {movie.runtime && <meta property="video:duration" content={`${movie.runtime * 60}`} />}
        {movie.genres?.map((genre: { id: number; name: string }) => (
          <meta key={genre.id} property="video:tag" content={genre.name} />
        ))}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@connectlist" />
        <meta name="twitter:title" content={seoContent?.title || movie.title} />
        <meta name="twitter:description" content={seoContent?.description || movie.overview?.substring(0, 160)} />
        <meta name="twitter:image" content={seoContent?.ogImage || `https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        <meta name="twitter:image:alt" content={`${movie.title} poster`} />
        
        {/* WhatsApp specific meta tags */}
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:secure_url" content={seoContent?.ogImage || `https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        
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
            className="h-[300px] md:h-[500px] bg-cover bg-center relative"
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path})`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-black/90 via-black/70 to-black/50 md:to-transparent" />
          </div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end md:items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-6 md:pb-0">
              <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-8">
                {/* Movie Poster */}
                <div className="flex-shrink-0 order-2 md:order-1">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-32 h-48 md:w-64 md:h-96 object-cover rounded-lg shadow-2xl mx-auto"
                  />
                </div>
                
                {/* Movie Info */}
                <div className="text-white flex-1 text-center md:text-left order-1 md:order-2">
                  <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4 leading-tight">{movie.title}</h1>
                  
                  {/* Movie Meta */}
                  <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 text-sm md:text-lg mb-3 md:mb-4 flex-wrap">
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                    <span>•</span>
                    <span>{Math.floor(movie.runtime / 60)}s {movie.runtime % 60}d</span>
                    <span>•</span>
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="text-yellow-400">★</span>
                      <span>{movie.vote_average?.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  {/* Genres */}
                  <div className="flex flex-wrap gap-1 md:gap-2 mb-4 md:mb-6 justify-center md:justify-start">
                    {movie.genres.slice(0, 3).map((genre: { id: number; name: string }) => (
                      <span
                        key={genre.id + '-' + genre.name}
                        className="px-2 py-1 md:px-3 md:py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs md:text-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons - Sticky */}
        <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={handleAttemptAddToList}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Plus size={18} />
              Listeme Ekle
            </button>
            <button
              onClick={fetchListUsers}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Users size={18} />
              Kim Eklemiş
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-lg transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
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
              <button
                onClick={() => setShowShareModal(true)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <Share2 size={20} />
                Paylaş
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2">
              {/* Mobile Tab Navigation */}
              <div className="md:hidden bg-white rounded-lg shadow-sm mb-4">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Genel Bakış
                  </button>
                  <button
                    onClick={() => setActiveTab('cast')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'cast'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Oyuncular
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Detaylar
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                      activeTab === 'comments'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Yorumlar
                  </button>
                </div>
              </div>

              {/* Desktop Content - Always visible */}
              <div className="hidden md:block space-y-8">
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
                  <div className="grid grid-cols-4 gap-4">
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

              {/* Mobile Tab Content */}
              <div className="md:hidden">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h2 className="text-lg font-bold mb-3">Film Hakkında</h2>
                      <p className="text-gray-700 leading-relaxed text-sm">{movie.overview}</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <h3 className="font-bold mb-3 text-lg">Film Bilgileri</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-gray-500 block">Çıkış Tarihi</span>
                          <p className="font-medium text-sm">{new Date(movie.release_date).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Süre</span>
                          <p className="font-medium text-sm">{Math.floor(movie.runtime / 60)}s {movie.runtime % 60}d</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">IMDB Puanı</span>
                          <p className="font-medium flex items-center gap-1 text-sm">
                            <span className="text-yellow-400">★</span>
                            {movie.vote_average?.toFixed(1)}/10
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Oy Sayısı</span>
                          <p className="font-medium text-sm">{movie.vote_count?.toLocaleString()} oy</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cast Tab */}
                {activeTab === 'cast' && (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">Oyuncular</h2>
                      {movie.cast_members.length > 6 && !showAllCast && (
                        <button
                          onClick={() => setShowAllCast(true)}
                          className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-2 text-sm"
                        >
                          <Eye size={14} />
                          Tümünü Gör ({movie.cast_members.length})
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(showAllCast ? movie.cast_members : movie.cast_members.slice(0, 6)).map((person: { id: number; name: string; character: string; profile_path: string }) => (
                        <div
                          key={person.id + '-' + person.name}
                          onClick={() => navigate(`/person/${person.id}`)}
                          className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            className="w-full aspect-square object-cover rounded-lg mb-2"
                          />
                          <h3 className="font-medium text-xs mb-1 line-clamp-2">{person.name}</h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{person.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-bold mb-3 text-lg">Yapım Ekibi</h3>
                    <div className="space-y-3">
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
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <h4 className="font-medium text-sm">{person.name}</h4>
                              <p className="text-xs text-gray-500">{person.job}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Comments Tab */}
                {activeTab === 'comments' && (
                  <div className="bg-white rounded-lg shadow-sm">
                    <ContentComments
                      contentType="movie"
                      contentId={movie.id}
                      contentTitle={movie.title}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Sidebar (Sadece desktop'ta görünür) */}
            <div className="hidden lg:block space-y-6">
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

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={movie.title}
        description={movie.overview}
      />
    </>
  );
}
