/*
  # Fix mark messages as read function

  1. Changes
    - Fix ambiguous column reference in mark_messages_as_read function
    - Add proper table aliases
    - Improve error handling
    - Add better validation

  2. Security
    - Maintain existing RLS policies
    - Keep security checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);

-- Create improved mark_messages_as_read function with proper table aliases
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
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_id_param
    AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not part of this conversation';
  END IF;

  -- Mark messages as read and return updated messages
  RETURN QUERY
  UPDATE messages m
  SET is_read = true
  WHERE m.conversation_id = conversation_id_param
  AND m.sender_id != auth.uid()
  AND m.is_read = false
  RETURNING m.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;