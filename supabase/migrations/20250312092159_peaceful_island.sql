/*
  # Fix mark messages as read function

  1. Changes
    - Add better error handling
    - Add transaction support
    - Add proper validation
    - Add return value for success/failure
*/

-- Drop existing function
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);

-- Create improved mark_messages_as_read function
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id_param uuid)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
  update_count integer;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Start transaction
  BEGIN
    -- Validate user is part of conversation
    IF NOT EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversation_id_param
      AND user_id = current_user_id
      FOR UPDATE
    ) THEN
      RAISE EXCEPTION 'User is not part of this conversation';
    END IF;

    -- Mark messages as read
    WITH updated AS (
      UPDATE messages
      SET is_read = true
      WHERE conversation_id = conversation_id_param
      AND sender_id != current_user_id
      AND is_read = false
      RETURNING id
    )
    SELECT COUNT(*) INTO update_count FROM updated;

    -- Return true if any messages were updated
    RETURN update_count > 0;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error and return false
      RAISE WARNING 'Error marking messages as read: %', SQLERRM;
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;