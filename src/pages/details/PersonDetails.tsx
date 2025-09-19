import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from '../../components/Header';
import { Breadcrumb } from '../../components/Breadcrumb';
import { AddToListModal } from '../../components/AddToListModal';
import { ShareModal } from '../../components/ShareModal';
import { WhoAddedModal } from '../../components/WhoAddedModal';
import { getPersonDetails } from '../../lib/api';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useWhoAdded } from '../../hooks/useWhoAdded';
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
  const [error, setError] = useState<string | null>(null);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showListUsers, setShowListUsers] = useState(false);
  const { users, fetchUsers } = useWhoAdded();
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies');

  useEffect(() => {
    const fetchPersonDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPersonDetails(id);
        setPerson(data);
      } catch (err) {
        console.error('Error fetching person details:', err);
        setError('Kişi bilgileri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonDetails();
  }, [id]);

  const handleAttemptAddToList = async () => {
    const isLoggedIn = await requireAuth('addingToList');
    if (isLoggedIn) {
      setShowAddToListModal(true);
    }
  };

  const fetchListUsers = async () => {
    await fetchUsers('person', id || '');
    setShowListUsers(true);
  };

  const calculateAge = (birthday: string, deathday?: string | null) => {
    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();
    const age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-[95px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !person) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 pt-[95px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Kişi bulunamadı'}</p>
            <button
              onClick={() => navigate(-1)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Geri Dön
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{person.name} - ConnectList</title>
        <meta name="description" content={person.biography || `${person.name} hakkında bilgiler`} />
      </Helmet>

      <Header />

      {/* Desktop Layout */}
      <div className="hidden md:block min-h-screen bg-gray-100 pb-16 md:pb-0 pt-[95px]">
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
            <div className="col-span-1 space-y-6">
              <img
                src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                alt={person.name}
                className="w-full h-auto rounded-lg shadow-lg object-cover"
              />

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleAttemptAddToList}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500"
                >
                  <Plus size={20} />
                  <span>{t('listPreview.addToList')}</span>
                </button>
                <button
                  onClick={fetchListUsers}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                >
                  <Users size={20} />
                  <span>Listeye Ekleyenler</span>
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  <Share2 size={20} />
                  <span>Paylaş</span>
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="col-span-3 space-y-6">
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">{person.name}</h1>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('common.knownFor')}</p>
                    <p className="font-medium">{person.known_for_department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('common.birth')}</p>
                    <p className="font-medium">{person.place_of_birth}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('common.birthday')}</p>
                    <p className="font-medium">{person.birthday} ({calculateAge(person.birthday, person.deathday)} yaşında)</p>
                  </div>
                  {person.deathday && (
                    <div>
                      <p className="text-sm text-gray-500">{t('common.death')}</p>
                      <p className="font-medium">{person.deathday}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Known For */}
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Bilinen Yapımlar</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('movies')}
                      className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'movies' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Filmler
                    </button>
                    <button
                      onClick={() => setActiveTab('series')}
                      className={`px-4 py-2 rounded-lg text-sm ${activeTab === 'series' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Diziler
                    </button>
                  </div>
                </div>

                {activeTab === 'movies' && (
                  <div className="grid grid-cols-3 gap-3">
                    {person.movie_credits.cast.slice(0, 12).map((movie) => (
                      <div key={movie.id} className="group cursor-pointer">
                        <div className="aspect-[2/3] bg-gray-200 rounded-lg overflow-hidden mb-2">
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                              alt={movie.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-xs text-center p-2">{movie.title}</span>
                            </div>
                          )}
                        </div>
                        <h4 className="text-xs font-medium line-clamp-2">{movie.title}</h4>
                        <p className="text-xs text-gray-400">
                          {movie.release_date ? new Date(movie.release_date).getFullYear() : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'series' && (
                  <div className="grid grid-cols-3 gap-3">
                    {person.tv_credits.cast.slice(0, 12).map((show) => (
                      <div key={show.id} className="group cursor-pointer">
                        <div className="aspect-[2/3] bg-gray-200 rounded-lg overflow-hidden mb-2">
                          {show.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                              alt={show.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-xs text-center p-2">{show.name}</span>
                            </div>
                          )}
                        </div>
                        <h4 className="text-xs font-medium line-clamp-2">{show.name}</h4>
                        <p className="text-xs text-gray-400">
                          {show.first_air_date ? new Date(show.first_air_date).getFullYear() : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Comments */}
          <div className="bg-white rounded-lg p-4">
            <ContentComments
              contentType="person"
              contentId={person.id}
              contentTitle={person.name}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentType="person"
        contentId={person.id}
        contentTitle={person.name}
        contentImage={person.profile_path}
      />

      <WhoAddedModal
        isOpen={showListUsers}
        onClose={() => setShowListUsers(false)}
        users={users}
        contentType="person"
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
        title={person.name}
        description={person.biography}
      />
    </>
  );
}

export default PersonDetails;