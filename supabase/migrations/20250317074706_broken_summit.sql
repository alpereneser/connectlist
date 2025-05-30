/*
  # Fix messaging system

  1. Changes
    - Fix send_message function return type
    - Add proper PERFORM statement for validation
    - Improve error handling
    - Fix transaction handling

  2. Security
    - Maintain RLS policies
    - Keep security checks
*/

-- Drop existing functions and policies
DROP FUNCTION IF EXISTS send_message(uuid, text);
DROP FUNCTION IF EXISTS start_conversation(uuid);
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;

-- Create view for mutual followers if not exists
CREATE OR REPLACE VIEW mutual_follows AS
SELECT 
  f1.follower_id as user_id,
  f1.following_id as other_user_id
FROM follows f1
JOIN follows f2 ON 
  f1.follower_id = f2.following_id AND 
  f1.following_id = f2.follower_id;

-- Create function to start conversation
CREATE OR REPLACE FUNCTION start_conversation(user2_id uuid)
RETURNS uuid AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Check if users can message each other
  IF NOT EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = auth.uid() AND other_user_id = user2_id)
    OR (user_id = user2_id AND other_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Users must follow each other to start a conversation';
  END IF;

  -- Check for existing conversation
  SELECT cp1.conversation_id INTO conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() 
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
    (conversation_id, auth.uid()),
    (conversation_id, user2_id);

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send message
CREATE OR REPLACE FUNCTION send_message(conversation_id_param uuid, message_text text)
RETURNS messages AS $$
DECLARE
  new_message messages;
BEGIN
  -- Validate user is part of conversation using PERFORM
  PERFORM 1 
  FROM conversation_participants
  WHERE conversation_id = conversation_id_param
  AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Insert new message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    text,
    is_read
  )
  VALUES (
    conversation_id_param,
    auth.uid(),
    message_text,
    false
  )
  RETURNING * INTO new_message;

  RETURN new_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );