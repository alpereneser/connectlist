/*
  # Add social features for lists

  1. New Tables
    - `list_likes`
      - `list_id` (uuid, references lists.id)
      - `user_id` (uuid, references profiles.id)
      - `created_at` (timestamptz)

    - `list_comments`
      - `id` (uuid, primary key)
      - `list_id` (uuid, references lists.id)
      - `user_id` (uuid, references profiles.id)
      - `parent_id` (uuid, references list_comments.id)
      - `text` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for likes and comments
*/

-- Create list_likes table
CREATE TABLE list_likes (
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

-- Create list_comments table
CREATE TABLE list_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES list_comments(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE list_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for list_likes
CREATE POLICY "Users can view list likes"
  ON list_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like lists"
  ON list_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike lists"
  ON list_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for list_comments
CREATE POLICY "Users can view list comments"
  ON list_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON list_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON list_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update list likes count
CREATE OR REPLACE FUNCTION update_list_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists
    SET likes_count = likes_count + 1
    WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists
    SET likes_count = likes_count - 1
    WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for likes count
CREATE TRIGGER update_list_likes_count_trigger
  AFTER INSERT OR DELETE ON list_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_list_likes_count();