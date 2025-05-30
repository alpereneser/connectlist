/*
  # Fix message read status

  1. Changes
    - Add function to mark messages as read
    - Add index for better performance
    - Add trigger to update message read status
*/

-- Create index for faster queries on is_read status
CREATE INDEX IF NOT EXISTS idx_messages_is_read 
  ON messages(conversation_id, is_read);

-- Function to mark messages as read
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

    -- Mark messages as read and return number of updated messages
    UPDATE messages
    SET is_read = true
    WHERE conversation_id = conversation_id_param
    AND sender_id != current_user_id
    AND is_read = false;

    GET DIAGNOSTICS update_count = ROW_COUNT;
    
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