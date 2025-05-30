/*
  # Fix messaging system functions

  1. Changes
    - Fix mark_messages_as_read function to properly handle return data
    - Fix send_message function to properly handle return data
    - Add better error handling and validation
    - Add proper transaction handling

  2. Security
    - Maintain RLS policies
    - Add proper validation checks
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);
DROP FUNCTION IF EXISTS send_message(uuid, text);

-- Create improved mark_messages_as_read function
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id_param uuid)
RETURNS SETOF messages AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Mark messages as read and return updated messages
  RETURN QUERY
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conversation_id_param
  AND sender_id != current_user_id
  AND is_read = false
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved send_message function
CREATE OR REPLACE FUNCTION send_message(conversation_id_param uuid, message_text text)
RETURNS messages AS $$
DECLARE
  current_user_id uuid;
  recipient_id uuid;
  new_message messages;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Get recipient ID
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = conversation_id_param
  AND user_id != current_user_id
  LIMIT 1;

  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Check if users can message each other
  IF NOT can_message(current_user_id, recipient_id) THEN
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
    current_user_id,
    message_text,
    false
  )
  RETURNING * INTO new_message;

  RETURN new_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;