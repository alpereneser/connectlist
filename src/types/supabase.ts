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
}
