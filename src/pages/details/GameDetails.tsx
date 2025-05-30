import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Star, Calendar, Tag, Layers, Award, Cpu, Monitor, Globe, ChevronRight, X, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async'; // Import Helmet
import { Header } from '../../components/Header';
import { Breadcrumb } from '../../components/Breadcrumb';
import { BottomMenu } from '../../components/BottomMenu';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import { getGameDetails } from '../../lib/api';
import { AddToListModal } from '../../components/AddToListModal';
import { useRequireAuth } from '../../hooks/useRequireAuth'; // Add this import
import { AuthPopup } from '../../components/AuthPopup'; // Add this import

interface GameDetails {
  id: string;
  name: string;
  description: string;
  released: string;
  background_image: string;
  metacritic: number;
  rating: number;
  ratings_count: number;
  platforms: Array<{
    id: number;
    name: string;
  }>;
  genres: Array<{
    id: number;
    name: string;
  }>;
  developers: Array<{
    id: number;
    name: string;
  }>;
  publishers: Array<{
    id: number;
    name: string;
  }>;
  esrb_rating: string;
  screenshots?: Array<{
    id: number;
    image: string;
  }>;
  tags?: Array<{
    id: number;
    name: string;
  }>;
  website?: string;
  reddit_url?: string;
  stores?: Array<{
    id: number;
    name: string;
    url: string;
  }>;
}

interface ListProfile {
  username: string;
  full_name: string;
  avatar: string;
}

interface ListEntry {
  id: string;
  title: string;
  profiles: ListProfile[];
}

interface DataEntry {
  lists: ListEntry[];
}

interface ListUser {
  username: string;
  full_name: string;
  avatar: string;
  list_title: string;
  list_id: string;
}

export function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth(); // Initialize the hook

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [game, setGame] = useState<GameDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showListUsers, setShowListUsers] = useState(false);
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'details' | 'media'>('about');
  const [error, setError] = useState<string | null>(null);

  // Listeye ekleyenleri getir
  const fetchListUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('list_items')
        .select(`
          lists!list_id (
            id,
            title,
            profiles!user_id (
              username,
              full_name,
              avatar
            )
          )
        `)
        .eq('type', 'game')
        .eq('external_id', id);

      if (error) throw error;

      const users = (data as DataEntry[] || []).flatMap((item) =>
        Array.isArray(item.lists)
          ? item.lists.flatMap((list) =>
              Array.isArray(list.profiles)
                ? list.profiles.map((profile) => ({
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar: profile.avatar,
                    list_title: list.title,
                    list_id: list.id,
                  }))
                : []
            )
          : []
      );

      setListUsers(users);
    } catch (error) {
      console.error('Listeye ekleyenler yüklenirken hata oluştu:', error);
    }
  }, [id]);

  // Oyun detaylarını getir
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const gameData = await getGameDetails(id || '');
        setGame(gameData);
        // Oyun detayları geldiğinde hemen listeye ekleyenleri de getir
        fetchListUsers();
      } catch (error) {
        console.error('Oyun detayları yüklenirken hata oluştu:', error);
        setError('Oyun detayları yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameDetails();
  }, [id, fetchListUsers]);

  // JSON-LD Schema Markup için yer tutucu
  const gameSchema = useMemo(() => {
    if (!game || error) return null; // Koşul kalsın

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      'name': game.name,
      'description': game.description, // Veya description_raw
      'image': game.background_image,
      'datePublished': game.released,
      'genre': game.genres?.map((g: any) => g.name),
      'publisher': game.publishers?.map((p: any) => ({ '@type': 'Organization', 'name': p.name })) || [],
      'gamePlatform': game.platforms?.map((p: any) => p.platform.name),
      'developer': game.developers?.map((d: any) => ({ '@type': 'Organization', 'name': d.name })) || [],
      // Varsa: aggregateRating (metacritic), operatingSystem, etc.
      'aggregateRating': game.metacritic ? {
        '@type': 'AggregateRating',
        'ratingValue': game.metacritic,
        'bestRating': '100',
        'ratingCount': game.ratings_count // Yaklaşık bir değer olabilir
      } : undefined,
    };

    // Undefined veya boş array alanları temizle
    Object.keys(schema).forEach(key => {
      const value = schema[key as keyof typeof schema];
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        delete schema[key as keyof typeof schema];
      }
    });

    return schema;
  }, [game, error]);

  // Listeye ekle butonuna tıklandığında çalışan fonksiyon
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
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="animate-pulse">
            <div className="h-[250px] bg-gray-200" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
              <div className="grid grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-48" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <BottomMenu />
      </>
    );
  }

  if (!game) {
    return (
      <>
        <Helmet>
          <title>{t('common.error')} - ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-16 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-500 text-lg">{error || 'Oyun bulunamadı'}</p>
            </div>
          </div>
        </div>
        <BottomMenu />
      </>
    );
  }

  const metaDescription = game.description ? game.description.substring(0, 160) + (game.description.length > 160 ? '...' : '') : t('app.description');
  const gameYear = game.released ? new Date(game.released).getFullYear() : '';
  const gameTitleWithYear = `${game.name}${gameYear ? ` (${gameYear})` : ''}`;

  return (
    <>
      <Helmet>
        <title>{`${gameTitleWithYear} - ConnectList`}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={gameTitleWithYear} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={game.background_image} />
        <meta property="og:type" content="game" />
        {/* JSON-LD Schema Markup */}
        {gameSchema && (
          <script type="application/ld+json">
            {JSON.stringify(gameSchema)}
          </script>
        )}
      </Helmet>

      <Header />
      <div className="min-h-screen bg-white md:bg-gray-100 pb-16 md:pb-0 pt-[95px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: t('common.categories.games'), href: '/search?category=games' },
                { label: game.name }
              ]}
            />
          </div>
        </div>
        
        {/* Hero Section */}
        <div 
          className="h-[250px] md:h-[350px] bg-cover bg-center relative"
          style={{
            backgroundImage: `url(${game.background_image})`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
                <div className="w-24 h-32 md:w-32 md:h-44 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                  <img 
                    src={game.background_image} 
                    alt={game.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl md:text-3xl font-bold text-white mb-2">{game.name}</h1>
                  <div className="flex items-center gap-3 md:gap-4 text-sm md:text-base text-white flex-wrap">
                    {game.metacritic && (
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded font-bold ${
                          game.metacritic >= 75 ? 'bg-green-500' :
                          game.metacritic >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}>
                          {game.metacritic}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-400" />
                      <span>{game.rating?.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{new Date(game.released).getFullYear()}</span>
                    </div>
                    {game.esrb_rating && (
                      <div className="px-2 py-1 bg-white/20 rounded text-xs">
                        {game.esrb_rating}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Buton Alanı - Başlığın Altına Taşındı ve Stil İyileştirildi */}
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <button
                  onClick={handleAttemptAddToList} // Use the new handler
                  className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                >
                  <Plus size={18} className="mr-2" />
                  {t('details.addToList')}
                </button>
                <button
                  onClick={() => setShowListUsers(true)}
                  className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm sm:text-base"
                >
                  <Users size={18} className="mr-2" />
                  {t('details.whoAdded')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Listeye Ekleyenler - Sürekli Görüntülenen Bölüm */}
        {listUsers.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('listPreview.whoAdded')}</h2>
                <button
                  onClick={() => setShowListUsers(true)}
                  className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                >
                  <span>Tümünü Gör</span>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex overflow-x-auto pb-2 gap-3">
                {listUsers.slice(0, 10).map((user, index) => (
                  <div 
                    key={index} 
                    className="flex-shrink-0 w-16 text-center"
                    onClick={() => navigate(`/profile/${user.username}`)}
                  >
                    <img
                      src={user.avatar}
                      alt={user.full_name}
                      className="w-12 h-12 rounded-full object-cover mx-auto mb-1"
                    />
                    <p className="text-xs text-gray-700 truncate">{user.full_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Menüsü */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('about')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'about'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Hakkında
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Detaylar
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'media'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Medya
              </button>
            </nav>
          </div>
        </div>

        {/* İçerik Bölümü */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {/* Ana İçerik */}
            <div className="md:col-span-2 space-y-4">
              {/* Hakkında Tab */}
              {activeTab === 'about' && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <div className="prose prose-sm md:prose-base max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: game.description || t('details.noDescription') }} />
                  </div>
                </div>
              )}

              {/* Detaylar Tab */}
              {activeTab === 'details' && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Platformlar */}
                    {game.platforms && game.platforms.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Monitor size={18} />
                          <span>Platformlar</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {game.platforms.map((platform) => (
                            <span key={platform.id} className="inline-block px-2 py-1 bg-gray-100 rounded-md text-sm">
                              {platform.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Türler */}
                    {game.genres && game.genres.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Tag size={18} />
                          <span>Türler</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {game.genres.map((genre) => (
                            <span key={genre.id} className="inline-block px-2 py-1 bg-gray-100 rounded-md text-sm">
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Geliştiriciler */}
                    {game.developers && game.developers.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Cpu size={18} />
                          <span>Geliştiriciler</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {game.developers.map((developer) => (
                            <span key={developer.id} className="inline-block px-2 py-1 bg-gray-100 rounded-md text-sm">
                              {developer.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Yayıncılar */}
                    {game.publishers && game.publishers.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Globe size={18} />
                          <span>Yayıncılar</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {game.publishers.map((publisher) => (
                            <span key={publisher.id} className="inline-block px-2 py-1 bg-gray-100 rounded-md text-sm">
                              {publisher.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Etiketler */}
                    {game.tags && game.tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Layers size={18} />
                          <span>Etiketler</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {game.tags.slice(0, 10).map((tag) => (
                            <span key={tag.id} className="inline-block px-2 py-1 bg-gray-100 rounded-md text-sm">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ödüller/Metaskor */}
                    {game.metacritic && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Award size={18} />
                          <span>Metaskor</span>
                        </h3>
                        <div className={`inline-block px-4 py-2 rounded-md text-white font-bold ${
                          game.metacritic >= 75 ? 'bg-green-500' :
                          game.metacritic >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}>
                          {game.metacritic}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medya Tab */}
              {activeTab === 'media' && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Ekran Görüntüleri</h3>
                  {game.screenshots && game.screenshots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {game.screenshots.map((screenshot) => (
                        <div key={screenshot.id} className="aspect-video rounded-lg overflow-hidden">
                          <img 
                            src={screenshot.image} 
                            alt={`${game.name} ekran görüntüsü`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Ekran görüntüsü bulunamadı.</p>
                  )}
                </div>
              )}
            </div>

            {/* Yan Panel */}
            <div className="space-y-4">
              {/* Sosyal Etkileşim */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Etkileşim</h3>
                <div className="flex gap-2 mb-4">
                  <button className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg">
                    <Heart size={18} />
                    <span>Beğen</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg">
                    <MessageCircle size={18} />
                    <span>Yorum</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg">
                    <Share2 size={18} />
                    <span>Paylaş</span>
                  </button>
                </div>
                
                {/* Listesine Ekleyenler - Etkileşim Bölümünde */}
                {listUsers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Listesine Ekleyenler</h4>
                    <div className="space-y-3">
                      {listUsers.slice(0, 3).map((user, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => navigate(`/profile/${user.username}`)}
                        >
                          <img
                            src={user.avatar}
                            alt={user.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{user.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              <span className="font-medium text-orange-500">{user.list_title}</span> listesine ekledi
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {listUsers.length > 3 && (
                        <button
                          onClick={() => setShowListUsers(true)}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 mt-2"
                        >
                          <span>Tümünü Gör ({listUsers.length})</span>
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bağlantılar */}
              {(game.website || game.reddit_url || (game.stores && game.stores.length > 0)) && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Bağlantılar</h3>
                  <div className="space-y-2">
                    {game.website && (
                      <a 
                        href={game.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-orange-500 hover:text-orange-600"
                      >
                        Resmi Web Sitesi
                      </a>
                    )}
                    {game.reddit_url && (
                      <a 
                        href={game.reddit_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-orange-500 hover:text-orange-600"
                      >
                        Reddit
                      </a>
                    )}
                    {game.stores && game.stores.map(store => (
                      <a 
                        key={store.id}
                        href={store.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-orange-500 hover:text-orange-600"
                      >
                        {store.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomMenu />

      {/* Listeye Ekleyenler Modalı */}
      {showListUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('listPreview.whoAdded')}</h2>
              <button
                onClick={() => setShowListUsers(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {listUsers.length > 0 ? (
                <div className="space-y-4">
                  {listUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <img
                        src={user.avatar}
                        alt={user.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigate(`/${user.username}/list/${encodeURIComponent(user.list_title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          setShowListUsers(false);
                        }}
                        className="text-orange-500 hover:text-orange-600 text-sm"
                      >
                        {user.list_title}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {t('listPreview.noOneAdded')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Listeye Ekle Modalı */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="game"
        contentId={game?.id || ''}
        contentTitle={game?.name || ''}
        contentImage={game?.background_image || ''}
        contentYear={game?.released ? new Date(game.released).getFullYear().toString() : undefined}
        contentDescription={game?.description}
      />
      
      {/* AuthPopup */}
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
    </>
  );
}