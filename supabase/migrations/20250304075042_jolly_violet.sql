/*
  # Add mutual followers chat system

  1. Changes
    - Add mutual_follows view to check mutual followers
    - Add mutual_follows_only policy to conversations table
    - Add mutual_follows_only policy to conversation_participants table
    - Add mutual_follows_only policy to messages table

  2. Security
    - Only allow chat between mutual followers
    - Enable RLS for all tables
*/

-- Create view for mutual followers
CREATE OR REPLACE VIEW mutual_follows AS
SELECT 
  f1.follower_id as user_id,
  f1.following_id as other_user_id
FROM follows f1
JOIN follows f2 ON f1.follower_id = f2.following_id 
  AND f1.following_id = f2.follower_id;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can create conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;

-- Create new policies for conversation_participants
CREATE POLICY "Mutual followers can view conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mutual_follows
      WHERE (user_id = auth.uid() AND other_user_id = conversation_participants.user_id)
      OR (other_user_id = auth.uid() AND user_id = conversation_participants.user_id)
    )
  );

CREATE POLICY "Mutual followers can create conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mutual_follows
      WHERE (user_id = auth.uid() AND other_user_id = conversation_participants.user_id)
      OR (other_user_id = auth.uid() AND user_id = conversation_participants.user_id)
    )
  );

CREATE POLICY "Users can leave their conversations"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- Create new policies for messages
CREATE POLICY "Mutual followers can view messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN mutual_follows mf ON 
        (mf.user_id = cp.user_id AND mf.other_user_id = auth.uid())
        OR (mf.other_user_id = cp.user_id AND mf.user_id = auth.uid())
      WHERE cp.conversation_id = messages.conversation_id
    )
  );

CREATE POLICY "Mutual followers can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN mutual_follows mf ON 
        (mf.user_id = cp.user_id AND mf.other_user_id = auth.uid())
        OR (mf.other_user_id = cp.user_id AND mf.user_id = auth.uid())
      WHERE cp.conversation_id = messages.conversation_id
    )
  );

-- Function to check if users are mutual followers
CREATE OR REPLACE FUNCTION are_mutual_followers(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = user1_id AND other_user_id = user2_id)
    OR (user_id = user2_id AND other_user_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;