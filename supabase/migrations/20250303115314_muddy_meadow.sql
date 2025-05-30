/*
  # Fix likes functionality

  1. Changes
    - Add RLS policies for list_likes table
    - Add indexes for better performance
    - Add content_lists policies
*/

-- Add missing RLS policies for list_likes
DROP POLICY IF EXISTS "Users can view list likes" ON list_likes;
DROP POLICY IF EXISTS "Users can like lists" ON list_likes;
DROP POLICY IF EXISTS "Users can unlike lists" ON list_likes;

CREATE POLICY "Users can view list likes"
  ON list_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like lists"
  ON list_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike lists"
  ON list_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing RLS policies for content_lists
DROP POLICY IF EXISTS "Content lists are viewable by everyone" ON content_lists;
DROP POLICY IF EXISTS "Users can add content to their lists" ON content_lists;
DROP POLICY IF EXISTS "Users can remove content from their lists" ON content_lists;

CREATE POLICY "Content lists are viewable by everyone"
  ON content_lists FOR SELECT
  USING (true);

CREATE POLICY "Users can add content to their lists"
  ON content_lists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE id = list_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove content from their lists"
  ON content_lists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE id = list_id
      AND user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_list_likes_list_id ON list_likes(list_id);
CREATE INDEX IF NOT EXISTS idx_list_likes_user_id ON list_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_list_likes_composite ON list_likes(list_id, user_id);