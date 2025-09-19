export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar: string;
  bio?: string;
  website?: string;
  email?: string;
  created_at?: string;
}

export interface List {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  likes_count: number;
  items_count: number;
  profiles: Profile | Profile[];
  user_id?: string;
  updated_at?: string;
  image_url?: string;
  list_items?: ListItem[];
  items?: ListItem[];
}

export interface ListItem {
  id: string;
  list_id: string;
  content_id: string;
  content_type: string;
  content_title: string;
  content_image: string;
  content_year?: string;
  content_description?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  poster_path?: string;
  thumbnail?: string;
  background_image?: string;
  profile_path?: string;
  // Additional properties for compatibility
  external_id?: string;
  title?: string;
  image_url?: string;
  type?: string;
  year?: string;
  description?: string;
  url?: string;
  order?: number;
  updated_at?: string;
  position?: number;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  avatar?: string;
  created_at?: string;
  bio?: string;
  website?: string;
  email?: string;
}

export interface Comment {
  id: string;
  list_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user?: User;
}

export interface Like {
  id: string;
  list_id: string;
  user_id: string;
  created_at: string;
  user?: User;
}
