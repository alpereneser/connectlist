import { useState, useEffect } from 'react';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const metaDescription = movie?.overview ? movie.overview.substring(0, 160) + (movie.overview.length > 160 ? '...' : '') : t('app.description');

  const movieSchema = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    'name': movie?.title || movie?.original_title,
    'description': movie?.overview,
    'image': movie?.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
    'datePublished': movie?.release_date,
    'genre': movie?.genres?.map((g: any) => g.name),
    'director': movie?.crew_members?.find((person: any) => person.job === 'Director')?.name,
    'actor': movie?.cast_members?.slice(0, 10).map((actor: any) => ({ // İlk 10 oyuncu
      '@type': 'Person',
      'name': actor.name,
    })),
  };

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
        <title>{`${movie.title} (${new Date(movie.release_date).getFullYear()}) - ConnectList`}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={`${movie.title} (${new Date(movie.release_date).getFullYear()})`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} />
        <meta property="og:type" content="video.movie" />
        {movieSchema && (
          <script type="application/ld+json">
            {JSON.stringify(movieSchema)}
          </script>
        )}
      </Helmet>

      <Header />
      <div className="min-h-screen bg-white md:bg-gray-100 pb-16 md:pb-0 pt-[95px]">
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