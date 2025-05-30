-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can create conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

-- Create new policies for conversation_participants
CREATE POLICY "Users can view their conversations"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for inserting new participants
CREATE POLICY "Users can create conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mutual_follows
      WHERE (user_id = auth.uid() AND other_user_id = conversation_participants.user_id)
      OR (other_user_id = auth.uid() AND user_id = conversation_participants.user_id)
    )
  );

-- Create policy for deleting participants
CREATE POLICY "Users can leave conversations"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to start conversation between users
CREATE OR REPLACE FUNCTION start_conversation(user2_id uuid)
RETURNS uuid AS $$
DECLARE
  user1_id uuid;
  conversation_id uuid;
BEGIN
  -- Get current user's ID
  user1_id := auth.uid();
  
  -- Check if users can message each other
  IF NOT EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = user1_id AND other_user_id = user2_id)
    OR (user_id = user2_id AND other_user_id = user1_id)
  ) THEN
    RAISE EXCEPTION 'Users must follow each other to start a conversation';
  END IF;

  -- Check for existing conversation
  SELECT cp1.conversation_id INTO conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id 
    AND cp2.user_id = user2_id;

  -- Return existing conversation if found
  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (conversation_id, user1_id),
    (conversation_id, user2_id);

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;