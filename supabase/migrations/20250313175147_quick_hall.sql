/*
  # Fix messaging system

  1. Changes
    - Fix message sending functionality
    - Add proper return values for functions
    - Add better error handling
    - Fix transaction handling

  2. Security
    - Maintain RLS policies
    - Add proper validation
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS send_message(uuid, text);
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);

-- Create function to send message
CREATE OR REPLACE FUNCTION send_message(conversation_id_param uuid, message_text text)
RETURNS SETOF messages AS $$
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

  -- Insert and return the new message
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

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id_param uuid)
RETURNS SETOF messages AS $$
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