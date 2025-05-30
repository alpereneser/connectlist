export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

export interface Show {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
}

export interface Person {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
}

export interface Game {
  id: number;
  name: string;
  background_image: string;
  released: string;
}

export interface Book {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail: string;
    };
  };
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  avatar: string;
}

export interface List {
  id: string;
  title: string;
  description: string;
  category: string;
  items_count: number;
  profiles: {
    username: string;
    full_name: string;
    avatar: string;
  };
}