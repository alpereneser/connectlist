import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { BottomMenu } from '../components/BottomMenu';
import { searchUsers, searchLists, searchTMDB, searchGames, searchBooks } from '../lib/api';
import { searchPlaces, getDefaultPlaceImage } from '../lib/api-places';
import { Movie, Show, Person, Game, Book as BookType, User } from '../types/search';
import { List } from '../types/supabase';
import { AuthPopup } from '../components/AuthPopup';
import { TMDB_LANGUAGE, TMDB_ACCESS_TOKEN, RAWG_API_KEY, GOOGLE_BOOKS_API_KEY } from '../lib/api'; 
import { Home, Film, Tv, Book, Users2, Gamepad2, ListChecks, MapPin } from 'lucide-react';

// TMDB sonuçları için genişletilmiş tipler
interface TMDBMovie extends Movie {
  media_type: 'movie';
}

interface TMDBShow extends Show {
  media_type: 'tv';
}

interface TMDBPerson extends Person {
  media_type: 'person';
}

export function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState<{
    users: User[];
    lists: Array<{
      id: string;
      title: string;
      items_count: number;
      category: string;
      profiles: {
        username: string;
        full_name: string;
        avatar: string;
      };
    }>;
    movies: Movie[];
    shows: Show[];
    people: Person[];
    games: Game[];
    books: BookType[];
    places: Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      country: string;
      categories: string[];
      image: string;
      latitude?: number;
      longitude?: number;
    }>;
  }>({
    users: [],
    lists: [],
    movies: [],
    shows: [],
    people: [],
    games: [],
    books: [],
    places: [],
  });
  const [discoverContent, setDiscoverContent] = useState<Array<{
    id: string | number;
    title: string;
    type: string;
    image: string;
    year?: string;
    category?: string;
  }>>([]);
  const [visibleContent, setVisibleContent] = useState<Array<{
    id: string | number;
    title: string;
    type: string;
    image: string;
    year?: string;
    category?: string;
  }>>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const observer = useRef<IntersectionObserver | null>(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  // Auth mesajı için state (kullanılmasa da ileride kullanılabilir)
  const [authMessage] = useState('');

  // Arama işlemini useCallback ile sarıyoruz
  const performSearch = useCallback(async () => {
    // Sayfa yüklendiğinde en üste kaydır
    window.scrollTo(0, 0);
    
    setIsLoading(true);
    try {
      // Hata yönetimi için her API çağrısını ayrı ayrı yap
      let usersResults: User[] = [];
      let listsResults: List[] = [];
      let tmdbResults: Array<TMDBMovie | TMDBShow | TMDBPerson> = [];
      let gamesResults: Game[] = [];
      let booksResults: BookType[] = [];
      let placesResults: any[] = [];
      
      try {
        usersResults = await searchUsers(query);
      } catch (error) {
        console.error('Error searching users:', error);
      }
      
      try {
        listsResults = await searchLists(query);
      } catch (error) {
        console.error('Error searching lists:', error);
      }
      
      try {
        tmdbResults = await searchTMDB(query);
      } catch (error) {
        console.error('Error searching TMDB:', error);
      }
      
      try {
        gamesResults = await searchGames(query);
      } catch (error) {
        console.error('Error searching games:', error);
      }
      
      try {
        booksResults = await searchBooks(query);
      } catch (error) {
        console.error('Error searching books:', error);
      }
      
      try {
        placesResults = await searchPlaces(query);
      } catch (error) {
        console.error('Error searching places:', error);
      }

      setResults({
        users: usersResults,
        lists: listsResults,
        movies: tmdbResults.filter((item) => item.media_type === 'movie') as TMDBMovie[],
        shows: tmdbResults.filter((item) => item.media_type === 'tv') as TMDBShow[],
        people: tmdbResults.filter((item) => item.media_type === 'person') as TMDBPerson[],
        games: gamesResults,
        books: booksResults,
        places: placesResults,
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  // URL'deki query parametresi değiştiğinde aramayı tekrarla
  useEffect(() => {
    const newQuery = searchParams.get('q');
    if (newQuery) {
      setQuery(newQuery);
    }
  }, [searchParams]);
  
  useEffect(() => {
    // Sayfa yüklendiğinde en üste kaydır
    window.scrollTo(0, 0);
    
    if (query) {
      performSearch();
    }
  }, [query, performSearch]);

  // Sayfa yüklendiğinde rastgele içerik getir
  useEffect(() => {
    if (!query) {
      fetchRandomContent();
    }
  }, [query]);

  // Kategori değiştiğinde içerikleri filtrele
  useEffect(() => {
    if (selectedCategory === 'all') {
      setVisibleContent(discoverContent.slice(0, page * 15));
      setHasMore(discoverContent.length > page * 15);
    } else {
      const filtered = discoverContent.filter(item => item.category === selectedCategory);
      setVisibleContent(filtered.slice(0, page * 15));
      setHasMore(filtered.length > page * 15);
    }
  }, [selectedCategory, discoverContent, page]);

  // Lazy loading için IntersectionObserver
  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, {
      root: document.querySelector('.overflow-y-auto'),
      rootMargin: '0px 0px 200px 0px',
      threshold: 0.1
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  const fetchRandomContent = async () => {
    setIsLoading(true);
    setPage(1);
    try {
      let moviesData = [];
      let showsData = [];
      let gamesData = [];
      let booksData = [];
      
      try {
        // TMDB için popüler filmler
        const movieResponse = await fetch(
          `https://api.themoviedb.org/3/movie/popular?language=${TMDB_LANGUAGE}&page=1`,
          {
            headers: {
              'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors'
          }
        );
        
        if (movieResponse.ok) {
          const data = await movieResponse.json();
          // Poster resmi olan filmleri filtrele
          moviesData = data.results.filter((item: any) => item.poster_path !== null).map((item: any) => ({
            ...item,
            media_type: 'movie'
          }));
        }
      } catch (error) {
        console.error('Error fetching popular movies:', error);
      }
      
      try {
        // TMDB için popüler diziler
        const tvResponse = await fetch(
          `https://api.themoviedb.org/3/tv/popular?language=${TMDB_LANGUAGE}&page=1`,
          {
            headers: {
              'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors'
          }
        );
        
        if (tvResponse.ok) {
          const data = await tvResponse.json();
          // Poster resmi olan dizileri filtrele
          showsData = data.results.filter((item: any) => item.poster_path !== null).map((item: any) => ({
            ...item,
            media_type: 'tv'
          }));
        }
      } catch (error) {
        console.error('Error fetching popular TV shows:', error);
      }
      
      try {
        // RAWG için popüler oyunlar
        const gameResponse = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&page_size=20`,
          {
            headers: {
              'Accept': 'application/json'
            },
            mode: 'cors'
          }
        );
        
        if (gameResponse.ok) {
          const data = await gameResponse.json();
          // Resmi olan oyunları filtrele
          gamesData = (data.results || []).filter((item: any) => item.background_image !== null);
        }
      } catch (error) {
        console.error('Error fetching popular games:', error);
      }
      
      try {
        // Google Books için popüler kitaplar
        const bookResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=subject:fiction&orderBy=relevance&maxResults=20&key=${GOOGLE_BOOKS_API_KEY}`,
          {
            headers: {
              'Accept': 'application/json'
            },
            mode: 'cors'
          }
        );
        
        if (bookResponse.ok) {
          const data = await bookResponse.json();
          // Kapak resmi olan kitapları filtrele
          booksData = (data.items || []).filter((item: any) => item.volumeInfo.imageLinks?.thumbnail);
        }
      } catch (error) {
        console.error('Error fetching popular books:', error);
      }

      const allContent = [
        ...moviesData.filter((item: any) => item.media_type === 'movie').map((item: any) => ({
          id: item.id,
          title: item.title,
          image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
          type: 'movie',
          year: item.release_date?.split('-')[0],
          category: 'movie'
        })),
        ...showsData.filter((item: any) => item.media_type === 'tv').map((item: any) => ({
          id: item.id,
          title: item.name,
          image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
          type: 'series',
          year: item.first_air_date?.split('-')[0],
          category: 'series'
        })),
        ...gamesData.map((item: any) => ({
          id: item.id,
          title: item.name,
          image: item.background_image,
          type: 'game',
          year: item.released?.split('-')[0],
          category: 'game'
        })),
        ...booksData.map((item: any) => ({
          id: item.id,
          title: item.volumeInfo.title,
          image: item.volumeInfo.imageLinks?.thumbnail,
          type: 'book',
          year: item.volumeInfo.publishedDate?.split('-')[0],
          category: 'book'
        }))
      ];

      // İçerikleri karıştır
      const shuffled = allContent.sort(() => Math.random() - 0.5);
      setDiscoverContent(shuffled);
      
      // İlk sayfayı göster
      setVisibleContent(shuffled.slice(0, 15));
      setHasMore(shuffled.length > 15);
    } catch (error) {
      console.error('Error fetching random content:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const renderUsers = (limit?: number) => {
    const usersToShow = limit ? results.users.slice(0, limit) : results.users;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {usersToShow.map((user) => (
          <div
            key={user.id}
            onClick={() => navigate(`/profile/${user.id}`)}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
          >
            <img
              src={user.avatar}
              alt={user.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-medium">{user.full_name}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMovies = (limit?: number) => {
    const moviesToShow = limit ? results.movies.slice(0, limit) : results.movies;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {moviesToShow.map((movie) => (
          <div key={movie.id} className="cursor-pointer" onClick={() => navigate(`/movie/${movie.id}`)}>
            <div className="aspect-[2/3] relative group">
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-sm truncate">{movie.title}</h3>
              <p className="text-xs text-gray-500">{movie.release_date?.split('-')[0]}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderShows = (limit?: number) => {
    const showsToShow = limit ? results.shows.slice(0, limit) : results.shows;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {showsToShow.map((show) => (
          <div key={show.id} className="cursor-pointer" onClick={() => navigate(`/series/${show.id}`)}>
            <div className="aspect-[2/3] relative group">
              <img
                src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                alt={show.name}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-sm truncate">{show.name}</h3>
              <p className="text-xs text-gray-500">{show.first_air_date?.split('-')[0]}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPeople = (limit?: number) => {
    const peopleToShow = limit ? results.people.slice(0, limit) : results.people;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {peopleToShow.map((person) => (
          <div key={person.id} className="cursor-pointer" onClick={() => navigate(`/person/${person.id}`)}>
            <div className="aspect-[2/3] relative group">
              <img
                src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                alt={person.name}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-sm truncate">{person.name}</h3>
              <p className="text-xs text-gray-500">{person.known_for_department}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGames = (limit?: number) => {
    const gamesToShow = limit ? results.games.slice(0, limit) : results.games;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {gamesToShow.map((game) => (
          <div key={game.id} className="cursor-pointer" onClick={() => navigate(`/game/${game.id}`)}>
            <div className="aspect-[2/3] relative group">
              <img
                src={game.background_image}
                alt={game.name}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-sm truncate">{game.name}</h3>
              <p className="text-xs text-gray-500">{game.released?.split('-')[0]}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBooks = (limit?: number) => {
    const booksToShow = limit ? results.books.slice(0, limit) : results.books;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {booksToShow.map((book) => (
          <div key={book.id} className="cursor-pointer" onClick={() => navigate(`/book/${book.id}`)}>
            <div className="aspect-[2/3] relative group">
              <img
                src={book.image_url}
                alt={book.title}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-sm truncate">{book.title}</h3>
              <p className="text-xs text-gray-500">{book.authors?.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPlaces = (limit?: number) => {
    const placesToShow = limit ? results.places.slice(0, limit) : results.places;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {placesToShow.map((place) => (
          <div 
            key={place.id} 
            className="cursor-pointer" 
            onClick={() => navigate(`/place/${place.id}/${encodeURIComponent(place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`)}
          >
            <div className="aspect-[2/3] relative group">
              <img
                src={place.image || getDefaultPlaceImage(place.name)}
                alt={place.name}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
            </div>
            <div className="mt-2">
              <h3 className="font-medium text-sm truncate">{place.name}</h3>
              <p className="text-xs text-gray-500">{place.city || place.address}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const tabs = useMemo(() => [
    { id: 'all', label: t('common.categories.all'), icon: Home, count: results.users.length + results.lists.length + results.movies.length + results.shows.length + results.people.length + results.games.length + results.books.length + results.places.length },
    { id: 'users', label: t('profile.users'), icon: Users2, count: results.users.length },
    { id: 'lists', label: t('common.lists.all') || 'Listeler', icon: ListChecks, count: results.lists.length },
    { id: 'movies', label: t('common.categories.movies'), icon: Film, count: results.movies.length },
    { id: 'series', label: t('common.categories.series'), icon: Tv, count: results.shows.length },
    { id: 'books', label: t('common.categories.books'), icon: Book, count: results.books.length },
    { id: 'games', label: t('common.categories.games'), icon: Gamepad2, count: results.games.length },
    { id: 'places', label: t('common.categories.place') || 'Mekanlar', icon: MapPin, count: results.places.length },
  ], [t, results]);

  const renderResults = () => {
    switch (activeTab) {
      case 'places':
        return results.places.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              {renderPlaces()}
            </div>
          </div>
        ) : null;
      case 'lists':
        return results.lists.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                {results.lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => navigate(`/list/${list.id}`, { state: { listId: list.id } })}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={Array.isArray(list.profiles) ? list.profiles[0]?.avatar : list.profiles?.avatar}
                        alt={Array.isArray(list.profiles) ? list.profiles[0]?.full_name : list.profiles?.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium">{list.title}</h3>
                        <p className="text-sm text-gray-500">@{Array.isArray(list.profiles) ? list.profiles[0]?.username : list.profiles?.username}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {list.items_count} {t('listPreview.listDetails.noContent')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      case 'users':
        return results.users.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {results.users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="flex flex-col items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-center"
                  >
                    <img
                      src={user.avatar}
                      alt={user.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-sm line-clamp-1">{user.full_name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      case 'movies':
        return results.movies.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {results.movies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => navigate(`/movie/${movie.id}`)}
                    className="aspect-[2/3] relative group cursor-pointer"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="font-medium text-xs line-clamp-1">{movie.title}</h3>
                      <p className="text-xs">{movie.release_date?.split('-')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      case 'shows':
        return results.shows.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {results.shows.map((show) => (
                  <div
                    key={show.id}
                    onClick={() => navigate(`/series/${show.id}`)}
                    className="aspect-[2/3] relative group cursor-pointer"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                      alt={show.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="font-medium text-xs line-clamp-1">{show.name}</h3>
                      <p className="text-xs">{show.first_air_date?.split('-')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      case 'people':
        return results.people.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {results.people.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => navigate(`/person/${person.id}`)}
                    className="aspect-[2/3] relative group cursor-pointer"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                      alt={person.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="font-medium text-xs line-clamp-1">{person.name}</h3>
                      <p className="text-xs">{person.known_for_department}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      case 'games':
        return results.games.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {results.games.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => navigate(`/game/${game.id}`)}
                    className="aspect-[2/3] relative group cursor-pointer"
                  >
                    <img
                      src={game.background_image}
                      alt={game.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="font-medium text-xs line-clamp-1">{game.name}</h3>
                      <p className="text-xs">{game.released?.split('-')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      case 'books':
        return results.books.length ? (
          <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {results.books.slice(0, 16).map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="aspect-[2/3] relative group cursor-pointer"
                  >
                    <img
                      src={book.volumeInfo.imageLinks?.thumbnail}
                      alt={book.volumeInfo.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="font-medium text-xs line-clamp-1">{book.volumeInfo.title}</h3>
                      <p className="text-xs line-clamp-1">{book.volumeInfo.authors?.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      default:
        return (
          <div className="space-y-8">
            {/* Users */}
            {results.users.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <Users2 size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('profile.followers')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderUsers(6)}
                  {results.users.length > 6 && (
                    <button
                      onClick={() => setActiveTab('users')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lists */}
            {results.lists.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <ListChecks size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('profile.lists')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  <div className="space-y-4">
                    {results.lists.slice(0, 5).map((list) => (
                      <div
                        key={list.id}
                        onClick={() => navigate(`/list/${list.id}/${encodeURIComponent(list.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`)}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={Array.isArray(list.profiles) ? list.profiles[0]?.avatar : list.profiles?.avatar}
                            alt={Array.isArray(list.profiles) ? list.profiles[0]?.full_name : list.profiles?.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="font-medium">{list.title}</h3>
                            <p className="text-sm text-gray-500">@{Array.isArray(list.profiles) ? list.profiles[0]?.username : list.profiles?.username}</p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {list.items_count} {t('listPreview.listDetails.noContent')}
                        </div>
                      </div>
                    ))}
                  </div>
                  {results.lists.length > 5 && (
                    <button
                      onClick={() => setActiveTab('lists')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Movies */}
            {results.movies.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <Film size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('common.categories.movies')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderMovies(8)}
                  {results.movies.length > 8 && (
                    <button
                      onClick={() => setActiveTab('movies')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Shows */}
            {results.shows.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <Tv size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('common.categories.series')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderShows(8)}
                  {results.shows.length > 8 && (
                    <button
                      onClick={() => setActiveTab('shows')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* People */}
            {results.people.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <Users2 size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('common.categories.people')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderPeople(8)}
                  {results.people.length > 8 && (
                    <button
                      onClick={() => setActiveTab('people')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Games */}
            {results.games.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <Gamepad2 size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('common.categories.games')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderGames(8)}
                  {results.games.length > 8 && (
                    <button
                      onClick={() => setActiveTab('games')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Books */}
            {results.books.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <Book size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('common.categories.books')}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderBooks(8)}
                  {results.books.length > 8 && (
                    <button
                      onClick={() => setActiveTab('books')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Places */}
            {results.places.length > 0 && (
              <div className="bg-[rgb(245,245,245)] rounded-lg shadow-sm overflow-hidden">
                <div className="p-3 bg-orange-100 border-b border-orange-200 flex items-center">
                  <MapPin size={16} className="text-orange-500 mr-2" />
                  <h2 className="text-sm font-medium text-orange-800">{t('common.categories.place') || 'Mekanlar'}</h2>
                </div>
                <div className="p-4 md:p-6">
                  {renderPlaces(8)}
                  {results.places.length > 8 && (
                    <button
                      onClick={() => setActiveTab('places')}
                      className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                    >
                      {t('common.seeAll')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-white overflow-hidden fixed inset-0">
      <Header />
      
      {/* Web ölçülerinde arama alanı - SubHeader alanında */}
      <div className="hidden md:block bg-gray-100 border-b border-gray-200 fixed top-16 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[55px]">
            <div className="flex h-full items-center space-x-4 overflow-visible">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`flex h-full items-center space-x-2 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'border-b-2 border-orange-500 text-orange-500'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-1 py-0 ml-1">{tab.count}</span>}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 pt-[10px] mt-0 md:pt-[55px] h-[calc(100vh-64px)] overflow-auto fixed inset-x-0 top-[64px] bottom-0">
        <div className="space-y-4">
          {/* Arama Input - Sadece mobil görünümde */}
          <div className="md:hidden bg-white border-b border-gray-200 mb-2 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (query) {
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                  }
                }}>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('common.searchPlaceholder')}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </form>
              </div>
            </div>
          </div>
          
          {/* 2. Kategori Menüsü - Sadece mobil görünümde */}
          {query ? (
            <div className="md:hidden bg-gray-100 border-b border-gray-200 sticky top-[60px] z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-[45px] py-0 my-0">
                  <div className="flex h-full items-center space-x-2 overflow-x-auto scrollbar-hide py-0 my-0">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          className={`flex h-full items-center space-x-1 px-1 text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                            activeTab === tab.id
                              ? 'border-b-2 border-orange-500 text-orange-500'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          <Icon size={12} className="w-4 h-4" />
                          <span>{tab.label}</span>
                          {tab.count > 0 && <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-1 py-0 ml-1">{tab.count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="md:hidden bg-white border-b border-gray-200 mb-4 sticky top-[60px] z-30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-[45px] py-0 my-0 overflow-x-auto scrollbar-hide">
                  <div className="flex h-full items-center space-x-2 overflow-x-auto scrollbar-hide">
                    <button
                      className={`flex h-full items-center space-x-1 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === 'all' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => setSelectedCategory('all')}
                    >
                      <Home className="w-4 h-4" />
                      <span>{t('common.categories.all')}</span>
                    </button>
                    <button
                      className={`flex h-full items-center space-x-1 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === 'movie' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => setSelectedCategory('movie')}
                    >
                      <Film className="w-4 h-4" />
                      <span>{t('common.categories.movies')}</span>
                    </button>
                    <button
                      className={`flex h-full items-center space-x-1 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === 'series' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => setSelectedCategory('series')}
                    >
                      <Tv className="w-4 h-4" />
                      <span>{t('common.categories.series')}</span>
                    </button>
                    <button
                      className={`flex h-full items-center space-x-1 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === 'game' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => setSelectedCategory('game')}
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span>{t('common.categories.games')}</span>
                    </button>
                    <button
                      className={`flex h-full items-center space-x-1 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === 'book' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => setSelectedCategory('book')}
                    >
                      <Book className="w-4 h-4" />
                      <span>{t('common.categories.books')}</span>
                    </button>
                    <button
                      className={`flex h-full items-center space-x-1 px-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === 'place' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => setSelectedCategory('place')}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{t('common.categories.place') || 'Mekanlar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 3. Arama Sonuçları veya Keşfet İçeriği */}
          <div className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : query ? (
              renderResults()
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-4 pb-[80px] overflow-y-auto">
                {visibleContent.map((item, index) => (
                  <div 
                    key={`${item.type}-${item.id}-${index}`} 
                    className="cursor-pointer" 
                    onClick={() => navigate(`/${item.type}/${item.id}`)}
                    ref={visibleContent.length === index + 1 ? lastItemRef : undefined}
                  >
                    <div className="aspect-[2/3] relative group">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg" />
                    </div>
                    <div className="mt-2">
                      <h3 className="font-medium text-sm truncate">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.year || ''}</p>
                    </div>
                  </div>
                ))}
                
                {/* Yükleniyor göstergesi - Grid içinde */}
                {isLoading && (
                  <div className="flex items-center justify-center py-8 col-span-5">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomMenu />
      
      {showAuthPopup && (
        <AuthPopup
          isOpen={showAuthPopup}
          message={authMessage}
          onClose={() => setShowAuthPopup(false)}
        />
      )}
    </div>
  );
}