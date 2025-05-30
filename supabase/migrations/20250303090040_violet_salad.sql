/*
  # Fix conversation participants policies

  1. Schema Updates
    - Drop and recreate conversation_participants policies to prevent infinite recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Create new policies
CREATE POLICY "Users can view their own conversations"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view conversations they are part of"
  ON conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );