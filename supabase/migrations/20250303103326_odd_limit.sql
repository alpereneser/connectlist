/*
  # Fix details tables

  1. Changes
    - Rename cast and crew columns to cast_members and crew_members to avoid reserved words
    - Add insert policies for details tables
    - Add indexes for faster lookups

  2. Security
    - Enable RLS for all tables
    - Add policies for inserting details
*/

-- Drop existing tables
DROP TABLE IF EXISTS content_lists;
DROP TABLE IF EXISTS movie_details;
DROP TABLE IF EXISTS series_details;
DROP TABLE IF EXISTS book_details;
DROP TABLE IF EXISTS game_details;
DROP TABLE IF EXISTS person_details;

-- Create movie_details table
CREATE TABLE movie_details (
  id text PRIMARY KEY,
  title text NOT NULL,
  overview text,
  poster_path text,
  backdrop_path text,
  release_date date,
  runtime integer,
  vote_average numeric(3,1),
  vote_count integer,
  genres jsonb,
  cast_members jsonb,
  crew_members jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create series_details table
CREATE TABLE series_details (
  id text PRIMARY KEY,
  title text NOT NULL,
  overview text,
  poster_path text,
  backdrop_path text,
  first_air_date date,
  last_air_date date,
  number_of_seasons integer,
  number_of_episodes integer,
  vote_average numeric(3,1),
  vote_count integer,
  genres jsonb,
  cast_members jsonb,
  crew_members jsonb,
  seasons jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create book_details table
CREATE TABLE book_details (
  id text PRIMARY KEY,
  title text NOT NULL,
  authors text[],
  publisher text,
  published_date date,
  description text,
  page_count integer,
  categories text[],
  image_links jsonb,
  language text,
  preview_link text,
  info_link text,
  created_at timestamptz DEFAULT now()
);

-- Create game_details table
CREATE TABLE game_details (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  released date,
  background_image text,
  metacritic integer,
  rating numeric(3,1),
  ratings_count integer,
  platforms jsonb,
  genres jsonb,
  developers jsonb,
  publishers jsonb,
  esrb_rating text,
  created_at timestamptz DEFAULT now()
);

-- Create person_details table
CREATE TABLE person_details (
  id text PRIMARY KEY,
  name text NOT NULL,
  biography text,
  birthday date,
  deathday date,
  place_of_birth text,
  profile_path text,
  known_for_department text,
  also_known_as text[],
  movie_credits jsonb,
  tv_credits jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create content_lists table to track which content is in which lists
CREATE TABLE content_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Add constraint for valid content types
  CONSTRAINT valid_content_type CHECK (
    content_type IN ('movie', 'series', 'book', 'game', 'person')
  ),
  
  -- Add unique constraint to prevent duplicates
  CONSTRAINT unique_content_in_list UNIQUE (list_id, content_type, content_id)
);

-- Enable RLS
ALTER TABLE movie_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_lists ENABLE ROW LEVEL SECURITY;

-- Create select policies
CREATE POLICY "Details are viewable by everyone"
  ON movie_details FOR SELECT
  USING (true);

CREATE POLICY "Details are viewable by everyone"
  ON series_details FOR SELECT
  USING (true);

CREATE POLICY "Details are viewable by everyone"
  ON book_details FOR SELECT
  USING (true);

CREATE POLICY "Details are viewable by everyone"
  ON game_details FOR SELECT
  USING (true);

CREATE POLICY "Details are viewable by everyone"
  ON person_details FOR SELECT
  USING (true);

CREATE POLICY "Content lists are viewable by everyone"
  ON content_lists FOR SELECT
  USING (true);

-- Create insert policies
CREATE POLICY "Anyone can insert movie details"
  ON movie_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert series details"
  ON series_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert book details"
  ON book_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert game details"
  ON game_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert person details"
  ON person_details FOR INSERT
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_movie_details_id ON movie_details(id);
CREATE INDEX idx_series_details_id ON series_details(id);
CREATE INDEX idx_book_details_id ON book_details(id);
CREATE INDEX idx_game_details_id ON game_details(id);
CREATE INDEX idx_person_details_id ON person_details(id);
CREATE INDEX idx_content_lists_list_id ON content_lists(list_id);
CREATE INDEX idx_content_lists_content ON content_lists(content_type, content_id);