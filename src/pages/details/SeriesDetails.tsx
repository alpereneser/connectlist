import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Eye, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { Breadcrumb } from '../../components/Breadcrumb';
import { AddToListModal } from '../../components/AddToListModal';
import { ShareModal } from '../../components/ShareModal';
import { useSeriesDetails } from '../../hooks/useSeriesDetails';
import { useWhoAdded } from '../../hooks/useWhoAdded';
import { WhoAddedModal } from '../../components/WhoAddedModal';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthPopup } from '../../components/AuthPopup';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import ContentComments from '../../components/ContentComments';

interface SeriesDetails {
  id: string;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    profile_path: string;
  }>;
  seasons: Array<{
    id: number;
    name: string;
    overview: string;
    air_date: string;
    episode_count: number;
    poster_path: string;
    season_number: number;
  }>;
}

export function SeriesDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();
  const [showAllCast, setShowAllCast] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: series, isLoading, error: fetchError } = useSeriesDetails(id || '');
  const { users, fetchUsers } = useWhoAdded();
  const [showListUsers, setShowListUsers] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchListUsers = async () => {
    await fetchUsers('series', id || '');
    setShowListUsers(true);
  };

  const metaDescription = series?.overview ? series.overview.substring(0, 160) + (series.overview.length > 160 ? '...' : '') : t('app.description');

  const seriesSchema = useMemo(() => {
    if (!series || fetchError) return null;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      'name': series.title,
      'description': series.overview,
      'image': series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : '',
      'datePublished': series.first_air_date,
      'genre': series.genres?.map((g: any) => g.name),
      'creator': series.crew?.filter((person: any) => ['Creator', 'Executive Producer'].includes(person.job)).map((c: any) => ({ '@type': 'Person', 'name': c.name })) || [],
      'actor': series.cast?.slice(0, 10).map((actor: any) => ({ 
        '@type': 'Person',
        'name': actor.name,
      })) || [],
      'numberOfEpisodes': series.number_of_episodes,
      'numberOfSeasons': series.number_of_seasons,
    };

    // Undefined veya boş array alanları temizle
    Object.keys(schema).forEach(key => {
      const value = schema[key as keyof typeof schema];
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete schema[key as keyof typeof schema];
      }
    });
    
    return schema;

  }, [series, fetchError]);

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('common.loading')} - ConnectList</title>
        </Helmet>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="animate-pulse">
            <div className="h-[400px] bg-gray-200" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
              <div className="grid grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-64" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (fetchError || !series) {
    return (
      <>
        <Helmet>
          <title>{t('common.error')} - ConnectList</title>
        </Helmet>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Dizi bulunamadı</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const seriesYear = series.first_air_date ? new Date(series.first_air_date).getFullYear() : '';
  const seriesTitleWithYear = `${series.title}${seriesYear ? ` (${seriesYear})` : ''}`;

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

  return (
    <>
      <Helmet>
        <title>{`${seriesTitleWithYear} - ConnectList`}</title>
        <meta name="description" content={metaDescription} />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="tv.show" />
        <meta property="og:url" content={`https://connectlist.me/series/${id}`} />
        <meta property="og:title" content={series.name} />
        <meta property="og:description" content={series.overview || t('social.meta.seriesDescription', { title: series.name })} />
        <meta property="og:image" content={series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : '/default-series.jpg'} />
        <meta property="og:url" content={`${window.location.origin}/series/${id}`} />
        <meta property="og:type" content="video.tv_show" />
        <meta property="og:image:width" content="500" />
        <meta property="og:image:height" content="750" />
        <meta property="og:image:alt" content={`${series.name} ${t('social.meta.defaultImage')}`} />
        <meta property="og:site_name" content={t('social.meta.siteName')} />
        <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : 'en_US'} />
        <meta property="og:locale:alternate" content={i18n.language === 'tr' ? 'en_US' : 'tr_TR'} />
        
        {/* TV Show specific Open Graph */}
        {series.first_air_date && <meta property="video:release_date" content={series.first_air_date} />}
        {series.number_of_seasons && <meta property="tv:seasons" content={series.number_of_seasons.toString()} />}
        {series.number_of_episodes && <meta property="tv:episodes" content={series.number_of_episodes.toString()} />}
        {series.genres?.map((genre: { id: number; name: string }) => (
          <meta key={genre.id} property="video:tag" content={genre.name} />
        ))}
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@connectlist" />
        <meta name="twitter:title" content={seriesTitleWithYear} />
        <meta name="twitter:description" content={metaDescription} />
        {series.poster_path && <meta name="twitter:image" content={`https://image.tmdb.org/t/p/w500${series.poster_path}`} />}
        {series.poster_path && <meta name="twitter:image:alt" content={`${series.title} poster`} />}
        
        {/* WhatsApp specific meta tags */}
        {series.poster_path && <meta property="og:image:type" content="image/jpeg" />}
        {series.poster_path && <meta property="og:image:secure_url" content={`https://image.tmdb.org/t/p/w500${series.poster_path}`} />}
        
        {seriesSchema && (
          <script type="application/ld+json">
            {JSON.stringify(seriesSchema)}
          </script>
        )}
      </Helmet>

      <Header />
      <div className="min-h-screen bg-white md:bg-gray-100 pb-16 md:pb-0 pt-[95px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: t('common.categories.series'), href: '/search?category=series' },
                { label: series.title }
              ]}
            />
          </div>
          {/* Mobile Hero Section */}
          <div className="md:hidden">
            <div className="relative">
              {/* Backdrop Image */}
              {series.backdrop_path && (
                <div className="absolute inset-0 h-48">
                  <img
                    src={`https://image.tmdb.org/t/p/w780${series.backdrop_path}`}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
              )}
              
              {/* Content */}
              <div className="relative z-10 pt-8 pb-4 px-4">
                <div className="flex gap-4 items-end">
                  {/* Poster */}
                  <div className="w-24 flex-shrink-0">
                    <img
                      src={`https://image.tmdb.org/t/p/w300${series.poster_path}`}
                      alt={series.title}
                      className="w-full rounded-lg aspect-[2/3] object-cover shadow-lg"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-white pb-2">
                    <h1 className="text-xl font-bold mb-2 leading-tight">{series.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
                      {series.first_air_date && <span>{new Date(series.first_air_date).getFullYear()}</span>}
                      {series.first_air_date && <span>•</span>}
                      <span>{series.number_of_seasons} Sezon</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>{series.vote_average?.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {series.genres && series.genres.slice(0, 3).map((genre: any) => (
                        <span
                          key={genre.id}
                          className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sticky Action Buttons */}
            <div className="sticky top-[95px] z-20 bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={handleAttemptAddToList}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                  <Plus size={18} />
                  <span>{t('listPreview.addToList')}</span>
                </button>
                <button
                  onClick={fetchListUsers}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Users size={18} />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden">
            <div className="sticky top-[95px] z-10 bg-white border-b border-gray-200">
              <div className="flex overflow-x-auto scrollbar-hide">
                {[
                  { id: 'overview', label: 'Genel Bakış' },
                  { id: 'cast', label: 'Oyuncular' },
                  { id: 'seasons', label: 'Sezonlar' },
                  { id: 'details', label: 'Detaylar' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {/* Main Content */}
              <div className="md:col-span-2 space-y-4 md:space-y-6">
                {/* Overview */}
                <div>
                  <h2 className="text-base font-bold mb-1 md:text-lg md:mb-2">{t('details.about')}</h2>
                  <p className="text-xs md:text-sm text-gray-600">{series.overview}</p>
                </div>

                {/* Cast */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-bold md:text-lg">{t('details.cast')}</h2>
                    {series.cast && series.cast.length > 8 && !showAllCast && (
                      <button
                        onClick={() => setShowAllCast(true)}
                        className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-2"
                      >
                        <Eye size={14} className="md:w-4 md:h-4" />
                        <span>{t('common.seeAll')} ({series.cast.length})</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-4 relative">
                    {series.cast && (showAllCast ? series.cast : series.cast.slice(0, 8)).map((person: any) => (
                      <div
                        key={person.id}
                        onClick={() => navigate(`/person/${person.id}`)}
                        className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <img
                          src={person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://via.placeholder.com/185x185?text=No+Image'}
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

                {/* Seasons */}
                <div>
                  <h2 className="text-lg md:text-2xl font-bold mb-2 md:mb-4">{t('details.seasons')}</h2>
                  <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden">
                    <div className="flex overflow-x-auto scrollbar-hide border-b">
                      {series.seasons && series.seasons.map((season: any) => (
                        <button
                          key={season.id}
                          onClick={() => setSelectedSeason(season.season_number)}
                          className={`px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap ${
                            selectedSeason === season.season_number
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {t('details.season')} {season.season_number}
                        </button>
                      ))}
                    </div>
                    {selectedSeason && (
                      <div className="p-4 md:p-6 text-sm md:text-base">
                        {series.seasons
                          ?.find((s: any) => s.season_number === selectedSeason)
                          ?.overview || t('details.noSeasonSummary')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Crew */}
                <div>
                  <h2 className="text-base font-bold mb-1 md:text-lg md:mb-2">{t('details.crew')}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
                    {series.crew
                      ?.filter((person: any) => ['Creator', 'Executive Producer'].includes(person.job))
                      .map((person: any) => (
                        <div
                          key={person.id}
                          onClick={() => navigate(`/person/${person.id}`)}
                          className="flex items-center gap-1.5 md:gap-4 bg-gray-50 md:bg-white p-1.5 md:p-4 rounded-lg md:shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            className="w-8 h-8 md:w-16 md:h-16 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="font-medium text-[10px] md:text-base">{person.name}</h3>
                            <p className="text-[9px] md:text-sm text-gray-500">{person.job}</p>
                          </div>
                        </div>
                      ))}
                  </div>

            {/* Mobile Content - Tab Based */}
            <div className="md:hidden space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-3 text-gray-900">{t('details.about')}</h2>
                    <p className="text-gray-600 leading-relaxed">{series.overview}</p>
                  </div>
                </div>
              )}

              {/* Cast Tab */}
              {activeTab === 'cast' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900">{t('details.cast')}</h2>
                      {series.cast && series.cast.length > 8 && !showAllCast && (
                        <button
                          onClick={() => setShowAllCast(true)}
                          className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                        >
                          Tümünü Gör ({series.cast.length})
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {series.cast && (showAllCast ? series.cast : series.cast.slice(0, 8)).map((person: any) => (
                        <div
                          key={person.id}
                          onClick={() => navigate(`/person/${person.id}`)}
                          className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <img
                            src={person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://via.placeholder.com/185x185?text=No+Image'}
                            alt={person.name}
                            className="w-full aspect-square object-cover"
                          />
                          <div className="p-3">
                            <h3 className="font-medium text-sm line-clamp-1">{person.name}</h3>
                            <p className="text-xs text-gray-500 line-clamp-1">{person.character}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seasons Tab */}
              {activeTab === 'seasons' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b">
                      <h2 className="text-lg font-bold text-gray-900">{t('details.seasons')}</h2>
                    </div>
                    <div className="flex overflow-x-auto scrollbar-hide border-b">
                      {series.seasons && series.seasons.map((season: any) => (
                        <button
                          key={season.id}
                          onClick={() => setSelectedSeason(season.season_number)}
                          className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                            selectedSeason === season.season_number
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {t('details.season')} {season.season_number}
                        </button>
                      ))}
                    </div>
                    {selectedSeason && (
                      <div className="p-6">
                        <p className="text-gray-600 leading-relaxed">
                          {series.seasons
                            ?.find((s: any) => s.season_number === selectedSeason)
                            ?.overview || t('details.noSeasonSummary')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 text-gray-900">{t('details.crew')}</h2>
                    <div className="space-y-3">
                      {series.crew
                        ?.filter((person: any) => ['Creator', 'Executive Producer'].includes(person.job))
                        .map((person: any) => (
                          <div
                            key={person.id}
                            onClick={() => navigate(`/person/${person.id}`)}
                            className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
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
              )}
            </div>
                </div>

                {/* Series Info */}
                <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm p-4 md:p-6">
                  <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4">{t('details.info.series.title')}</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-gray-500">{t('details.info.series.originalTitle')}</dt>
                      <dd className="font-medium text-sm md:text-base">{series.title}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.series.firstAirDate')}</dt>
                      <dd className="font-medium text-sm md:text-base">
                        {series.first_air_date ? new Date(series.first_air_date).toLocaleDateString('tr-TR') : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.series.lastAirDate')}</dt>
                      <dd className="font-medium text-sm md:text-base">
                        {series.last_air_date ? new Date(series.last_air_date).toLocaleDateString('tr-TR') : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.series.seasons')}</dt>
                      <dd className="font-medium text-sm md:text-base">{series.number_of_seasons}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.series.episodes')}</dt>
                      <dd className="font-medium text-sm md:text-base">{series.number_of_episodes}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">{t('details.info.series.rating')}</dt>
                      <dd className="font-medium flex items-center gap-2 text-sm md:text-base">
                        <span className="text-yellow-400">★</span>
                        <span>{series.vote_average?.toFixed(1)}</span>
                        <span className="text-gray-400">({series.vote_count} {t('details.votes')})</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Sidebar */}
              <div className="space-y-4 md:space-y-6">
                {/* Boş sidebar */}
                <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm p-4 md:p-6 space-y-3 md:space-y-4">
                  {/* Butonlar */}
                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <button
                      onClick={handleAttemptAddToList}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      <Plus size={18} />
                      {t('details.addToList')}
                    </button>
                    <button
                      onClick={fetchListUsers}
                      className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                    >
                      <Users size={18} className="mr-2" />
                      {t('details.whoAdded')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ContentComments
              contentType="series"
              contentId={series.id}
              contentTitle={series.title}
            />
          </div>
        </div>
      </div>

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="series"
        contentId={series.id}
        contentTitle={series.title}
        contentImage={series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : ''}
        contentYear={series.first_air_date ? new Date(series.first_air_date).getFullYear().toString() : undefined}
        contentDescription={series.overview}
      />

      <WhoAddedModal
        isOpen={showListUsers}
        onClose={() => setShowListUsers(false)}
        users={users}
        contentType="series"
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
        title={series.title}
        description={series.overview}
      />
    </>
  );
}
