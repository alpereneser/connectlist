/*
  # Fix messaging system policies

  1. Changes
    - Add mutual followers check for messaging
    - Update conversation and message policies
    - Add better validation for message sending
    - Fix function return type issue

  2. Security
    - Only allow messaging between mutual followers
    - Add proper validation checks
*/

-- Create view for mutual followers if not exists
CREATE OR REPLACE VIEW mutual_follows AS
SELECT 
  f1.follower_id as user_id,
  f1.following_id as other_user_id
FROM follows f1
JOIN follows f2 ON f1.follower_id = f2.following_id 
  AND f1.following_id = f2.follower_id;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Mutual followers can view messages" ON messages;
DROP POLICY IF EXISTS "Mutual followers can send messages" ON messages;

-- Create new message policies
CREATE POLICY "Mutual followers can view messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN mutual_follows mf ON 
        ((mf.user_id = cp.user_id AND mf.other_user_id = auth.uid())
        OR (mf.other_user_id = cp.user_id AND mf.user_id = auth.uid()))
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
        ((mf.user_id = cp.user_id AND mf.other_user_id = auth.uid())
        OR (mf.other_user_id = cp.user_id AND mf.user_id = auth.uid()))
      WHERE cp.conversation_id = messages.conversation_id
    )
  );

-- Function to check if users can message each other
CREATE OR REPLACE FUNCTION can_message(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if users are mutual followers
  RETURN EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = user1_id AND other_user_id = user2_id)
    OR (user_id = user2_id AND other_user_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function before recreating with new return type
DROP FUNCTION IF EXISTS send_message(uuid, text);

-- Function to send message
CREATE OR REPLACE FUNCTION send_message(conversation_id_param uuid, message_text text)
RETURNS messages AS $$
DECLARE
  recipient_id uuid;
  new_message messages;
BEGIN
  -- Get recipient ID
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = conversation_id_param
  AND user_id != auth.uid()
  LIMIT 1;

  -- Check if users can message each other
  IF NOT can_message(auth.uid(), recipient_id) THEN
    RAISE EXCEPTION 'Users must follow each other to send messages';
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