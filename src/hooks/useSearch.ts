import { useQuery } from '@tanstack/react-query';
import { searchTMDB, searchGames, searchBooks, searchUsers, searchLists } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.searchResults(query),
    queryFn: async () => {
      const [usersResults, tmdbResults, gamesResults, booksResults, listsResults] = await Promise.all([
        searchUsers(query),
        searchTMDB(query),
        searchGames(query),
        searchBooks(query),
        searchLists(query)
      ]);

      return {
        users: usersResults,
        movies: tmdbResults.filter(item => item.media_type === 'movie' && item.poster_path),
        shows: tmdbResults.filter(item => item.media_type === 'tv' && item.poster_path),
        people: tmdbResults.filter(item => item.media_type === 'person' && item.profile_path),
        games: gamesResults.filter(game => game.background_image),
        books: booksResults.filter(book => book.volumeInfo.imageLinks?.thumbnail),
        lists: listsResults || []
      };
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 dakika taze
    cacheTime: 1000 * 60 * 30, // 30 dakika cache'te tut
  });
}