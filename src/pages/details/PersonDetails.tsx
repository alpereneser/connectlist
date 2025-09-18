import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users2, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { Breadcrumb } from '../../components/Breadcrumb';
import { AddToListModal } from '../../components/AddToListModal';
import { supabaseBrowser as supabase } from '../../lib/supabase-browser';
import { getPersonDetails } from '../../lib/api';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { AuthPopup } from '../../components/AuthPopup';
import ContentComments from '../../components/ContentComments';

interface PersonDetails {
  id: string;
  name: string;
  biography: string;
  birthday: string;
  deathday: string | null;
  place_of_birth: string;
  profile_path: string;
  known_for_department: string;
  also_known_as: string[];
  movie_credits: {
    cast: Array<{
      id: number;
      title: string;
      character: string;
      release_date: string;
      poster_path: string;
    }>;
    crew: Array<{
      id: number;
      title: string;
      job: string;
      release_date: string;
      poster_path: string;
    }>;
  };
  tv_credits: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      first_air_date: string;
      poster_path: string;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      first_air_date: string;
      poster_path: string;
    }>;
  };
}

interface ListUser {
  username: string;
  full_name: string;
  avatar: string;
  list_title: string;
  list_id: string;
}

export function PersonDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { requireAuth, showAuthPopup, setShowAuthPopup, authMessage } = useRequireAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showListUsers, setShowListUsers] = useState(false);
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies');

  useEffect(() => {
    const fetchPersonDetails = async () => {
      try {
        const personData = await getPersonDetails(id || '');
        setPerson(personData);
      } catch (error) {
        console.error('Error fetching person details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonDetails();
  }, [id]);

  const fetchListUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('list_items')
        .select(`
          lists!list_id (
            id,
            title,
            profiles!lists_user_id_fkey (
              username,
              full_name,
              avatar
            )
          )
        `)
        .eq('type', 'person')
        .eq('external_id', id);

      if (error) throw error;

      const users = data?.map((item: any) => ({
        username: item.lists?.profiles?.username,
        full_name: item.lists?.profiles?.full_name,
        avatar: item.lists?.profiles?.avatar,
        list_title: item.lists?.title,
        list_id: item.lists?.id
      })) || [];

      setListUsers(users);
      setShowListUsers(true);
    } catch (error) {
      console.error('Error fetching list users:', error);
    }
  };

  const calculateAge = (birthday: string, deathday: string | null) => {
    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();
    const age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const handleAttemptAddToList = async () => {
    const isLoggedIn = await requireAuth(t('details.addToListAuthAction'));
    if (isLoggedIn) {
      setShowAddToListModal(true);
    }
    // If not logged in, the hook will set showAuthPopup to true
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{t('common.loading')} - ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="flex gap-8">
                <div className="w-64 h-96 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-8" />
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!person) {
    return (
      <>
        <Helmet>
          <title>{t('common.error')} - ConnectList</title>
        </Helmet>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Kişi bulunamadı</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const metaDescription = person.biography ? person.biography.substring(0, 160) + (person.biography.length > 160 ? '...' : '') : t('app.description');
  const personTitle = person.name || t('details.person');
  const personImage = person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : undefined;

  return (
    <>
      <Helmet>
        <title>{`${personTitle} - ConnectList`}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={personTitle} />
        <meta property="og:description" content={metaDescription} />
        {personImage && <meta property="og:image" content={personImage} />}
        <meta property="og:type" content="profile" />
      </Helmet>

      <Header />
      <div className="min-h-screen bg-white md:bg-gray-100 pb-16 md:pb-0 pt-[95px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: t('common.categories.people'), href: '/search?category=people' },
                { label: person.name }
              ]}
            />
          </div>
          <div className="grid grid-cols-4 gap-8">
            {/* Profile and Actions */}
            <div className="col-span-4 md:col-span-1 space-y-4 md:space-y-6">
              <img
                src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                alt={person.name}
                className="w-48 md:w-full h-48 md:h-auto rounded-lg shadow-lg mx-auto md:mx-0 object-cover"
              />

              {/* Action Buttons */}
              <div className="space-y-3 md:space-y-4">
                <button
                  onClick={handleAttemptAddToList}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 h-[30px] px-4 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 text-sm md:text-base"
                >
                  <Plus size={20} />
                  <span>{t('listPreview.addToList')}</span>
                </button>
                <button
                  onClick={fetchListUsers}
                  className="w-full flex items-center justify-center gap-2 bg-white md:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 text-sm md:text-base"
                >
                  <Users size={20} />
                  <span>{t('listPreview.whoAdded')}</span>
                </button>
              </div>

              {/* Personal Info */}
              <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm p-4 md:p-6">
                <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4">{t('details.info.person.title')}</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-gray-500">{t('details.info.person.knownFor')}</dt>
                    <dd className="font-medium text-sm md:text-base">{person.known_for_department}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">{t('details.info.person.birthday')}</dt>
                    <dd className="font-medium text-sm md:text-base">
                      {new Date(person.birthday).toLocaleDateString('tr-TR')}
                      {' '}
                      ({calculateAge(person.birthday, person.deathday)} yaşında
                      {person.deathday ? ' vefat etti' : ''})
                    </dd>
                  </div>
                  {person.deathday && (
                    <div>
                      <dt className="text-gray-500">{t('details.info.person.deathday')}</dt>
                      <dd className="font-medium text-sm md:text-base">
                        {new Date(person.deathday).toLocaleDateString('tr-TR')}
                      </dd>
                    </div>
                  )}
                  {person.place_of_birth && (
                    <div>
                      <dt className="text-gray-500">{t('details.info.person.placeOfBirth')}</dt>
                      <dd className="font-medium text-sm md:text-base">{person.place_of_birth}</dd>
                    </div>
                  )}
                  {person.also_known_as && person.also_known_as.length > 0 && (
                    <div>
                      <dt className="text-gray-500">{t('details.info.person.otherNames')}</dt>
                      <dd className="font-medium text-sm md:text-base">
                        {person.also_known_as.join(', ')}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Biography and Credits */}
            <div className="col-span-4 md:col-span-3 space-y-4 md:space-y-8">
              <div>
                <h1 className="text-xl md:text-3xl font-bold mb-2">{person.name}</h1>
                <div className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-2xl font-bold mb-2 md:mb-4">{t('details.biography')}</h2>
                  <p className="text-sm md:text-base text-gray-600 whitespace-pre-line">
                    {person.biography || t('details.noBiography')}
                  </p>
                </div>
              </div>

              {/* Credits */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setActiveTab('movies')}
                    className={`px-3 md:px-4 py-2 rounded-lg text-sm md:text-base ${
                      activeTab === 'movies'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.categories.movies')}
                  </button>
                  <button
                    onClick={() => setActiveTab('series')}
                    className={`px-3 md:px-4 py-2 rounded-lg text-sm md:text-base ${
                      activeTab === 'series'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.categories.series')}
                  </button>
                </div>

                {activeTab === 'movies' ? (
                  <div className="space-y-8">
                    {/* Movie Cast */}
                    {person.movie_credits.cast.length > 0 && (
                      <div>
                        <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">{t('details.asActor')}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          {person.movie_credits.cast.map(movie => (
                            <div
                              key={movie.id}
                              onClick={() => navigate(`/movie/${movie.id}`)}
                              className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                alt={movie.title}
                                className="w-full aspect-[2/3] object-cover"
                              />
                              <div className="p-2 md:p-4">
                                <h4 className="font-medium text-sm md:text-base line-clamp-1">{movie.title}</h4>
                                <p className="text-xs md:text-sm text-gray-500">
                                  {movie.character}
                                </p>
                                <p className="text-xs md:text-sm text-gray-400">
                                  {new Date(movie.release_date).getFullYear()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Movie Crew */}
                    {person.movie_credits.crew.length > 0 && (
                      <div>
                        <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">{t('details.asCrewMember')}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          {person.movie_credits.crew.map(movie => (
                            <div
                              key={movie.id}
                              onClick={() => navigate(`/movie/${movie.id}`)}
                              className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                alt={movie.title}
                                className="w-full aspect-[2/3] object-cover"
                              />
                              <div className="p-2 md:p-4">
                                <h4 className="font-medium text-sm md:text-base line-clamp-1">{movie.title}</h4>
                                <p className="text-xs md:text-sm text-gray-500">
                                  {movie.job}
                                </p>
                                <p className="text-xs md:text-sm text-gray-400">
                                  {new Date(movie.release_date).getFullYear()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* TV Cast */}
                    {person.tv_credits.cast.length > 0 && (
                      <div>
                        <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">{t('details.asActor')}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          {person.tv_credits.cast.map(show => (
                            <div
                              key={show.id}
                              onClick={() => navigate(`/series/${show.id}`)}
                              className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                alt={show.name}
                                className="w-full aspect-[2/3] object-cover"
                              />
                              <div className="p-2 md:p-4">
                                <h4 className="font-medium text-sm md:text-base line-clamp-1">{show.name}</h4>
                                <p className="text-xs md:text-sm text-gray-500">
                                  {show.character}
                                </p>
                                <p className="text-xs md:text-sm text-gray-400">
                                  {new Date(show.first_air_date).getFullYear()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TV Crew */}
                    {person.tv_credits.crew.length > 0 && (
                      <div>
                        <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">{t('details.asCrewMember')}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          {person.tv_credits.crew.map(show => (
                            <div
                              key={show.id}
                              onClick={() => navigate(`/series/${show.id}`)}
                              className="bg-gray-50 md:bg-white rounded-lg md:shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                                alt={show.name}
                                className="w-full aspect-[2/3] object-cover"
                              />
                              <div className="p-2 md:p-4">
                                <h4 className="font-medium text-sm md:text-base line-clamp-1">{show.name}</h4>
                                <p className="text-xs md:text-sm text-gray-500">
                                  {show.job}
                                </p>
                                <p className="text-xs md:text-sm text-gray-400">
                                  {new Date(show.first_air_date).getFullYear()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ContentComments
              contentType="person"
              contentId={person?.id?.toString() || ''}
              contentTitle={person?.name || ''}
            />
          </div>
        </div>
      </div>

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="person"
        contentId={person.id}
        contentTitle={person.name}
        contentImage={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
        contentDescription={person.biography}
      />

      {/* Who Added Modal */}
      {showListUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('listPreview.whoAdded')}</h2>
              <button
                onClick={() => setShowListUsers(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Users2 size={20} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4">
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
                        onClick={() => navigate(`/${user.username}/list/${encodeURIComponent(user.list_title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`)}
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
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        message={authMessage}
      />
    </>
  );
}
