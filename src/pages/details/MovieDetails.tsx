import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { BottomMenu } from '../../components/BottomMenu';
import { Breadcrumb } from '../../components/Breadcrumb';
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

  // Mobil check
  const isMobile = window.innerWidth < 768;

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
        <BottomMenu />
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
        <BottomMenu />
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
      <div className={`min-h-screen bg-white md:bg-gray-100 pb-16 md:pb-0 ${isMobile ? 'pt-0' : 'pt-[95px]'}`}>
        {isMobile ? (
          // Mobile Tam Ekran Layout
          <div className="relative">
            {/* Mobil Hero Section - Tam Ekran */}
            <div className="relative h-screen flex flex-col">
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path})`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
              </div>
              
              {/* Content Over Image */}
              <div className="relative z-10 flex-1 flex flex-col">
                {/* Safe Area Padding Top */}
                <div className="pt-16" />
                
                {/* Ana İçerik */}
                <div className="flex-1 flex flex-col justify-end p-6 pb-32">
                  {/* Kim Listesine Eklemiş + Listene Ekle Butonları */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center bg-black/50 backdrop-blur-sm rounded-full px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-white text-sm font-medium">
                          {movie.title}
                        </span>
                      </div>
                      <button 
                        onClick={handleAttemptAddToList}
                        className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Listeme Ekle
                      </button>
                    </div>
                  </div>

                  {/* Film Posteri */}
                  <div className="flex justify-center mb-6">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-48 aspect-[2/3] object-cover rounded-xl shadow-2xl"
                    />
                  </div>
                  
                  {/* Film Bilgileri */}
                  <div className="text-center text-white">
                    <h1 className="text-2xl font-bold mb-2">{movie.title}</h1>
                    <div className="flex justify-center items-center gap-2 text-sm text-white/80 mb-3">
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                      <span>•</span>
                      <span>{Math.floor(movie.runtime / 60)}s {movie.runtime % 60}d</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>{movie.vote_average?.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    {/* Türler */}
                    <div className="flex justify-center flex-wrap gap-2 mb-4">
                      {movie.genres.map((genre: { id: number; name: string }) => (
                        <span
                          key={genre.id + '-' + genre.name}
                          className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={fetchListUsers}
                        className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                      >
                        <Users size={16} />
                        Kim Eklemiş
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobil İçerik - Kaydırılabilir */}
            <div className="bg-white">
              {/* Film Açıklaması */}
              <div className="p-6">
                <h2 className="text-lg font-bold mb-3">{t('details.about')}</h2>
                <p className="text-gray-700 leading-relaxed">{movie.overview}</p>
              </div>

              {/* Oyuncular */}
              <div className="p-6 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">{t('details.cast')}</h2>
                  {movie.cast_members.length > 6 && !showAllCast && (
                    <button
                      onClick={() => setShowAllCast(true)}
                      className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"
                    >
                      <Eye size={16} />
                      <span>Tümünü Gör ({movie.cast_members.length})</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(showAllCast ? movie.cast_members : movie.cast_members.slice(0, 6)).map((person: { id: number; name: string; character: string; profile_path: string }) => (
                    <div
                      key={person.id + '-' + person.name}
                      onClick={() => navigate(`/person/${person.id}`)}
                      className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-2">
                        <h3 className="font-medium text-xs line-clamp-1">{person.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{person.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yapım Ekibi */}
              <div className="p-6 pt-0 pb-20">
                <h2 className="text-lg font-bold mb-4">{t('details.crew')}</h2>
                <div className="space-y-3">
                  {movie.crew_members
                    .filter((person: { job: string }) => ['Director', 'Screenplay', 'Story'].includes(person.job))
                    .map((person: { id: number; name: string; job: string; profile_path: string }) => (
                      <div
                        key={person.id + '-' + person.name}
                        onClick={() => navigate(`/person/${person.id}`)}
                        className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          alt={person.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="font-medium text-sm">{person.name}</h3>
                          <p className="text-xs text-gray-500">{person.job}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Desktop Layout (Mevcut)
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: t('common.categories.movies'), href: '/search?category=movies' },
                { label: movie.title }
              ]}
            />
          </div>
          <div className="md:hidden">
            {/* Mobile Header */}
            <div className="flex gap-4">
              {/* Mobile Poster */}
              <div className="w-1/3">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full rounded-lg aspect-[2/3] object-cover"
                />
              </div>
              {/* Mobile Info */}
              <div className="w-2/3">
                <h1 className="text-base font-bold mb-1">{movie.title}</h1>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 mb-2">
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                  <span>•</span>
                  <span>{Math.floor(movie.runtime / 60)}s {movie.runtime % 60}d</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span>{movie.vote_average?.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {movie.genres.map((genre: { id: number; name: string }) => (
                    <span
                      key={genre.id + '-' + genre.name}
                      className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5 mb-3">
                  <div>
                    <button
                      onClick={handleAttemptAddToList}
                      className="flex items-center justify-center gap-1 bg-white border border-gray-200 text-gray-700 h-[26px] px-2 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 text-[10px]"
                    >
                      <Plus size={12} />
                      <span>{t('listPreview.addToList')}</span>
                    </button>
                  </div>
                  <button
                    onClick={fetchListUsers}
                    className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 h-[26px] px-2 rounded-lg hover:bg-gray-200 text-[10px]"
                  >
                    <Users size={12} />
                    <span>{t('listPreview.whoAdded')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Desktop Backdrop */}
          <div className="hidden md:block">
            <div 
              className="h-[400px] bg-cover bg-center relative"
              style={{
                backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              <div className="absolute inset-0 flex items-end">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                  <div className="flex items-end gap-8">
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-64 rounded-lg shadow-lg relative z-10"
                    />
                    <div className="text-white flex-1 mb-4">
                      <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
                      <div className="flex items-center gap-4 text-lg">
                        <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : ''}</span>
                        <span>•</span>
                        <span>{Math.floor(movie.runtime / 60)}s {movie.runtime % 60}d</span>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">★</span>
                          <span>{movie.vote_average?.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        {movie.genres.map((genre: { id: number; name: string }) => (
                          <span
                            key={genre.id + '-' + genre.name}
                            className="px-3 py-1 bg-white/20 rounded-full text-sm"
                          >
                            {genre.name}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 items-center">
                        <button
                          onClick={handleAttemptAddToList}
                          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                        >
                          <Plus size={18} className="mr-2" />
                          <span>{t('details.addToList')}</span>
                        </button>
                        <button
                          onClick={fetchListUsers}
                          className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                        >
                          <Users size={18} className="mr-2" />
                          <span>{t('details.whoAdded')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="md:col-span-2 space-y-3 md:space-y-6">
                {/* Overview */}
                <div>
                  <h2 className="text-base font-bold mb-1 md:text-lg md:mb-2">{t('details.about')}</h2>
                  <p className="text-xs md:text-sm text-gray-600">{movie.overview}</p>
                </div>
                {/* Cast */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold md:text-lg">{t('details.cast')}</h2>
                    {movie.cast_members.length > 8 && !showAllCast && (
                      <button
                        onClick={() => setShowAllCast(true)}
                        className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-2"
                      >
                        <Eye size={14} className="md:w-4 md:h-4" />
                        <span>{t('details.viewAll')} ({movie.cast_members.length})</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-4 relative">
                    {(showAllCast ? movie.cast_members : movie.cast_members.slice(0, 8)).map((person: { id: number; name: string; character: string; profile_path: string }) => (
                      <div
                        key={person.id + '-' + person.name}
                        onClick={() => navigate(`/person/${person.id}`)}
                        className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          alt={person.name}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="p-1 md:p-4">
                          <h3 className="font-medium text-[10px] md:text-base line-clamp-1">{person.name}</h3>
                          <p className="text-[9px] md:text-sm text-gray-500 line-clamp-1">{person.character}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Crew */}
                <div>
                  <h2 className="text-base font-bold mb-1 md:text-lg md:mb-2">{t('details.crew')}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
                    {movie.crew_members
                      .filter((person: { job: string }) => ['Director', 'Screenplay', 'Story'].includes(person.job))
                      .map((person: { id: number; name: string; job: string; profile_path: string }) => (
                        <div
                          key={person.id + '-' + person.name}
                          onClick={() => navigate(`/person/${person.id}`)}
                          className="flex items-center gap-1.5 md:gap-4 bg-gray-50 md:bg-white p-1.5 md:p-4 rounded-lg md:shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="font-medium text-xs md:text-base">{person.name}</h3>
                            <p className="text-[9px] md:text-sm text-gray-500">{person.job}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              {/* Sidebar */}
              <div className="space-y-4 md:space-y-6">
                {/* Boş sidebar */}
                <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm p-4 md:p-6 space-y-3 md:space-y-4">
                  {/* Butonlar üst kısma taşındı */}
                </div>
              </div>
              {/* Reklam Alanı */}
              {/* Reklam alanı kaldırıldı */}
            </div>
          </div>
        </div>
        )}
      </div>
      <BottomMenu />

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