/*
  # Fix messaging system functions

  1. Changes
    - Fix return type handling in messaging functions
    - Add proper transaction support
    - Improve error handling
    - Fix query destination issue

  2. Security
    - Maintain existing RLS policies
    - Keep security checks
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);
DROP FUNCTION IF EXISTS send_message(uuid, text);

-- Create improved mark_messages_as_read function
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id_param uuid)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  text text,
  created_at timestamptz,
  is_read boolean
) AS $$
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Mark messages as read and return updated messages
  RETURN QUERY
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conversation_id_param
  AND sender_id != auth.uid()
  AND is_read = false
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved send_message function
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
  new_message messages;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Get recipient ID
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = conversation_id_param
  AND user_id != auth.uid()
  LIMIT 1;

  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = auth.uid()
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