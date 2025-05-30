// Query key factory
export const queryKeys = {
  movieDetails: (id: string) => ['movie', id],
  seriesDetails: (id: string) => ['series', id],
  bookDetails: (id: string) => ['book', id],
  gameDetails: (id: string) => ['game', id],
  personDetails: (id: string) => ['person', id],
  lists: (category?: string) => ['lists', category],
  userLists: (userId: string) => ['userLists', userId],
  listDetails: (id: string) => ['list', id],
  followers: (userId: string) => ['followers', userId],
  following: (userId: string) => ['following', userId],
  searchResults: (query: string) => ['search', query],
} as const;