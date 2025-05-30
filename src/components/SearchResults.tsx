import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../hooks/useSearch';
import { getDefaultPlaceImage } from '../lib/api-places';

interface SearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
}

export function SearchResults({
  isOpen,
  onClose,
  searchQuery,
}: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState('all');
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Veri tipi tanımlaması
  interface SearchData {
    users?: any[];
    lists?: any[];
    movies?: any[];
    shows?: any[];
    people?: any[];
    games?: any[];
    books?: any[];
    places?: any[];
  }
  
  const { data, isLoading } = useSearch(searchQuery) as { data: SearchData | null, isLoading: boolean };

  // Sonuçlar için tip tanımlaması
  interface SearchResults {
    users: any[];
    lists: any[];
    movies: any[];
    shows: any[];
    people: any[];
    games: any[];
    books: any[];
    places: any[];
  }

  const results = useMemo<SearchResults>(() => ({
    users: data?.users || [],
    lists: data?.lists || [],
    movies: (data?.movies || []).filter((movie: any) => movie.poster_path),
    shows: (data?.shows || []).filter((show: any) => show.poster_path),
    people: (data?.people || []).filter((person: any) => person.profile_path),
    games: (data?.games || []).filter((game: any) => game.background_image),
    books: (data?.books || []).filter((book: any) => book.volumeInfo.imageLinks?.thumbnail),
    places: data?.places || [],
  }), [data]);

  if (!isOpen) return null;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'all', label: t('common.categories.all') },
    { id: 'users', label: t('profile.followers'), count: results.users.length },
    { id: 'lists', label: t('profile.lists'), count: results.lists.length },
    { id: 'movies', label: t('common.categories.movies'), count: results.movies.length },
    { id: 'shows', label: t('common.categories.series'), count: results.shows.length },
    { id: 'people', label: t('common.categories.people'), count: results.people.length },
    { id: 'games', label: t('common.categories.games'), count: results.games.length },
    { id: 'books', label: t('common.categories.books'), count: results.books.length },
    { id: 'places', label: t('common.categories.place') || 'Mekanlar', count: results.places.length }
  ];

  const getFilteredResults = () => {
    switch (activeTab) {
      case 'lists':
        return results.lists.length ? (
          <div className="space-y-2">
            {results.lists.map((list) => (
              <div
                key={list.id}
                onClick={() => {
                  // ListDetails sayfasına doğru formatta yönlendirme yap
                  // URL formatı: /:username/list/:slug
                  const slug = list.title.toLowerCase()
                    .replace(/ğ/g, 'g')
                    .replace(/ü/g, 'u')
                    .replace(/ş/g, 's')
                    .replace(/ı/g, 'i')
                    .replace(/ö/g, 'o')
                    .replace(/ç/g, 'c')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                  
                  navigate(`/${list.profiles.username}/list/${slug}`, {
                    state: { listId: list.id }
                  });
                  onClose();
                }}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={list.profiles.avatar}
                    alt={list.profiles.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-medium">{list.title}</h3>
                    <p className="text-sm text-gray-500">@{list.profiles.username}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {list.items_count} {t('listPreview.listDetails.noContent')}
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'users':
        return results.users.length ? (
          <div className="space-y-2">
            {results.users.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  navigate(`/profile/${user.username}`);
                  onClose();
                }}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-12 h-12 object-cover rounded-full"
                  />
                  <div>
                    <h3 className="font-medium">{user.full_name}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 hover:text-orange-500 rounded-full hover:bg-gray-100">
                    <UserPlus size={20} />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-blue-500 rounded-full hover:bg-gray-100">
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'movies':
        return results.movies.length ? (
          <div className="space-y-2">
            {results.movies.map((movie) => (
              <div key={movie.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <img
                  src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                  alt={movie.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div
                  onClick={() => {
                    navigate(`/movie/${movie.id}/${encodeURIComponent(movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-medium">{movie.title}</h3>
                  <p className="text-gray-500">{movie.release_date?.split('-')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'shows':
        return results.shows.length ? (
          <div className="space-y-2">
            {results.shows.map((show) => (
              <div key={show.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <img
                  src={`https://image.tmdb.org/t/p/w185${show.poster_path}`}
                  alt={show.name}
                  className="w-12 h-16 object-cover rounded"
                />
                <div
                  onClick={() => {
                    navigate(`/series/${show.id}/${encodeURIComponent(show.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-medium">{show.name}</h3>
                  <p className="text-gray-500">{show.first_air_date?.split('-')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'people':
        return results.people.length ? (
          <div className="space-y-2">
            {results.people.map((person) => (
              <div key={person.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <img
                  src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                  alt={person.name}
                  className="w-12 h-12 object-cover rounded-full"
                />
                <div
                  onClick={() => {
                    navigate(`/person/${person.id}/${encodeURIComponent(person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-medium">{person.name}</h3>
                  <p className="text-gray-500">{person.known_for_department}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'games':
        return results.games.length ? (
          <div className="space-y-2">
            {results.games.map((game) => (
              <div key={game.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <img
                  src={game.background_image}
                  alt={game.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div
                  onClick={() => {
                    navigate(`/game/${game.id}/${encodeURIComponent(game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-medium">{game.name}</h3>
                  <p className="text-gray-500">{game.released?.split('-')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'books':
        return results.books.length ? (
          <div className="space-y-2">
            {results.books.map((book) => (
              <div key={book.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <img
                  src={book.volumeInfo.imageLinks?.thumbnail}
                  alt={book.volumeInfo.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div
                  onClick={() => {
                    navigate(`/book/${book.id}/${encodeURIComponent(book.volumeInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`); 
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-medium">{book.volumeInfo.title}</h3>
                  <p className="text-sm text-gray-500">
                    {book.volumeInfo.authors?.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      case 'places':
        return results.places.length ? (
          <div className="space-y-2">
            {results.places.map((place) => (
              <div key={place.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <img
                  src={place.image || getDefaultPlaceImage(place.name)}
                  alt={place.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div
                  onClick={() => {
                    navigate(`/place/${place.id}/${encodeURIComponent(place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`); 
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-medium">{place.name}</h3>
                  <p className="text-sm text-gray-500">
                    {place.address || place.city || place.country}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      default:
        return (
          <div className="space-y-6">
            {results.places.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.place') || 'Mekanlar'}</h2>
                <div className="space-y-2">
                  {results.places.slice(0, 3).map((place) => (
                    <div key={place.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img
                        src={place.image || getDefaultPlaceImage(place.name)}
                        alt={place.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div
                        onClick={() => {
                          navigate(`/place/${place.id}/${encodeURIComponent(place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`); 
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-medium">{place.name}</h3>
                        <p className="text-sm text-gray-500">
                          {place.address || place.city || place.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.users.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.people')}</h2>
                <div className="space-y-2">
                  {results.users.slice(0, 3).map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        navigate(`/profile/${user.id}`);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.full_name}
                          className="w-12 h-12 object-cover rounded-full"
                        />
                        <div>
                          <h3 className="font-medium">{user.full_name}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-600 hover:text-orange-500 rounded-full hover:bg-gray-100">
                          <UserPlus size={20} />
                        </button>
                        <button className="p-2 text-gray-600 hover:text-blue-500 rounded-full hover:bg-gray-100">
                          <MessageCircle size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {results.movies.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.movies')}</h2>
                <div className="space-y-2">
                  {results.movies.slice(0, 3).map((movie) => (
                    <div key={movie.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div
                        onClick={() => {
                          navigate(`/movie/${movie.id}/${encodeURIComponent(movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-medium">{movie.title}</h3>
                        <p className="text-sm text-gray-500">{movie.release_date?.split('-')[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.shows.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.series')}</h2>
                <div className="space-y-2">
                  {results.shows.slice(0, 3).map((show) => (
                    <div key={show.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img
                        src={`https://image.tmdb.org/t/p/w92${show.poster_path}`}
                        alt={show.name}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div
                        onClick={() => {
                          navigate(`/series/${show.id}/${encodeURIComponent(show.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-medium">{show.name}</h3>
                        <p className="text-sm text-gray-500">{show.first_air_date?.split('-')[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.people.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.people')}</h2>
                <div className="space-y-2">
                  {results.people.slice(0, 3).map((person) => (
                    <div key={person.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img
                        src={`https://image.tmdb.org/t/p/w92${person.profile_path}`}
                        alt={person.name}
                        className="w-12 h-12 object-cover rounded-full"
                      />
                      <div
                        onClick={() => {
                          navigate(`/person/${person.id}/${encodeURIComponent(person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-medium">{person.name}</h3>
                        <p className="text-sm text-gray-500">{person.known_for_department}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.games.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.games')}</h2>
                <div className="space-y-2">
                  {results.games.slice(0, 3).map((game) => (
                    <div key={game.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img
                        src={game.background_image}
                        alt={game.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div
                        onClick={() => {
                          navigate(`/game/${game.id}/${encodeURIComponent(game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-medium">{game.name}</h3>
                        <p className="text-sm text-gray-500">{game.released?.split('-')[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.books.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('common.categories.books')}</h2>
                <div className="space-y-2">
                  {results.books.slice(0, 3).map((book) => (
                    <div key={book.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <img
                        src={book.volumeInfo.imageLinks?.thumbnail}
                        alt={book.volumeInfo.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div
                        onClick={() => {
                          navigate(`/book/${book.id}/${encodeURIComponent(book.volumeInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                          onClose();
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        <h3 className="font-medium">{book.volumeInfo.title}</h3>
                        <p className="text-sm text-gray-500">
                          {book.volumeInfo.authors?.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg mt-1 max-h-[80vh] overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.id !== 'all' && tab.count && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(80vh - 64px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {getFilteredResults()}
            {!isLoading && 
              ((activeTab === 'all' && 
                results.users.length === 0 &&
                results.lists.length === 0 && 
                results.movies.length === 0 && 
                results.shows.length === 0 && 
                results.people.length === 0 && 
                results.games.length === 0 && 
                results.books.length === 0) ||
              (activeTab === 'lists' && results.lists.length === 0) ||
              (activeTab === 'users' && results.users.length === 0) ||
              (activeTab === 'movies' && results.movies.length === 0) ||
              (activeTab === 'shows' && results.shows.length === 0) ||
              (activeTab === 'people' && results.people.length === 0) ||
              (activeTab === 'games' && results.games.length === 0) ||
              (activeTab === 'books' && results.books.length === 0)) && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {activeTab === 'all'
                    ? t('search.noResults')
                    : t('search.noCategoryResults', { category: tabs.find(t => t.id === activeTab)?.label })}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}