-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversation_participants;

-- Create simplified policies for conversation_participants
CREATE POLICY "Users can view their conversations"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for inserting new participants
CREATE POLICY "Users can add participants"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id
      FROM conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
    )
  );

-- Create policy for deleting participants
CREATE POLICY "Users can leave conversations"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
  ON conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
  ON conversation_participants(conversation_id);