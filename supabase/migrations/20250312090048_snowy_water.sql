/*
  # Fix mark messages as read function

  1. Changes
    - Fix mark_messages_as_read function to properly handle user ID
    - Add proper error handling
    - Add better validation
*/

-- Drop existing function
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);

-- Create improved mark_messages_as_read function
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id_param uuid)
RETURNS void AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is part of conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Mark messages as read
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conversation_id_param
  AND sender_id != current_user_id
  AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;