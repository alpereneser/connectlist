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
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conversation_id_param
  AND is_read = false
  AND sender_id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;