/*
  # Lists and List Items Schema

  1. New Tables
    - `lists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_public` (boolean)
      - `likes_count` (integer)
      - `items_count` (integer)

    - `list_items`
      - `id` (uuid, primary key)
      - `list_id` (uuid, references lists)
      - `external_id` (text)
      - `title` (text)
      - `image_url` (text)
      - `type` (text)
      - `year` (text)
      - `description` (text)
      - `position` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for CRUD operations
*/

-- Create lists table
CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT true,
  likes_count integer DEFAULT 0,
  items_count integer DEFAULT 0,

  -- Add constraint for valid categories
  CONSTRAINT valid_category CHECK (
    category IN ('movies', 'series', 'books', 'games', 'people', 'videos')
  )
);

-- Create list_items table
CREATE TABLE list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  image_url text,
  type text NOT NULL,
  year text,
  description text,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Add constraint for valid types
  CONSTRAINT valid_type CHECK (
    type IN ('movie', 'series', 'book', 'game', 'person', 'video')
  )
);

-- Create index for faster list item ordering
CREATE INDEX list_items_position_idx ON list_items (list_id, position);

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Lists policies
CREATE POLICY "Users can view public lists"
  ON lists
  FOR SELECT
  USING (is_public OR auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
  ON lists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
  ON lists
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- List items policies
CREATE POLICY "Users can view items of accessible lists"
  ON list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (lists.is_public OR lists.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create items in their lists"
  ON list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their lists"
  ON list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their lists"
  ON list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Function to update list items count
CREATE OR REPLACE FUNCTION update_list_items_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists
    SET items_count = items_count + 1
    WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists
    SET items_count = items_count - 1
    WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to maintain items count
CREATE TRIGGER update_list_items_count_trigger
  AFTER INSERT OR DELETE ON list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_list_items_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain updated_at
CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();