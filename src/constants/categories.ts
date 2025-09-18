export const HOME_CATEGORIES = [
  'movies',
  'series',
  'books',
  'games',
  'people',
  'videos',
  'places',
  'musics',
] as const;

export type HomeCategory = (typeof HOME_CATEGORIES)[number];

export const DEFAULT_HOME_CATEGORY: HomeCategory = HOME_CATEGORIES[0];
