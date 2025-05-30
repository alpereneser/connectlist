/*
  # Fix send message function

  1. Changes
    - Fix syntax error in send_message function
    - Add proper table alias handling
    - Improve error handling
    - Add better validation

  2. Security
    - Maintain existing RLS policies
    - Keep security checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS send_message(uuid, text);

-- Create improved send_message function with proper table aliases
CREATE OR REPLACE FUNCTION send_message(conversation_id_param uuid, message_text text)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  text text,
  created_at timestamptz,
  is_read boolean
) AS $$
DECLARE
  recipient_id uuid;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Get recipient ID with proper table alias
  SELECT cp.user_id INTO recipient_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = conversation_id_param
  AND cp.user_id != auth.uid()
  LIMIT 1;

  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_id_param
    AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Check if users can message each other
  IF NOT can_message(auth.uid(), recipient_id) THEN
    RAISE EXCEPTION 'Users must follow each other to send messages';
  END IF;

  -- Insert new message and return it
  RETURN QUERY
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
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;