/*
  # Fix send message function

  1. Changes
    - Fix send_message function to properly handle return data
    - Add proper transaction handling
    - Fix query destination issue
    - Add better error handling

  2. Security
    - Maintain RLS policies
    - Keep security checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS send_message(uuid, text);

-- Create improved send_message function
CREATE OR REPLACE FUNCTION send_message(conversation_id_param uuid, message_text text)
RETURNS SETOF messages AS $$
DECLARE
  current_user_id uuid;
  recipient_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Get recipient ID
  SELECT cp.user_id INTO recipient_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = conversation_id_param
  AND cp.user_id != current_user_id
  LIMIT 1;

  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_id_param
    AND cp.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Check if users can message each other
  IF NOT EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = current_user_id AND other_user_id = recipient_id)
    OR (user_id = recipient_id AND other_user_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Users must follow each other to send messages';
  END IF;

  -- Insert new message and return it
  RETURN QUERY
  WITH new_message AS (
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
    RETURNING *
  )
  SELECT * FROM new_message;

  -- Update conversation last message
  UPDATE conversations
  SET 
    last_message_at = now(),
    last_message_text = message_text
  WHERE id = conversation_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;