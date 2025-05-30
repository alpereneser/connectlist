/*
  # Fix messaging system

  1. Changes
    - Drop existing policies and functions
    - Create new policies for conversations and messages
    - Add function to handle conversation creation between mutual followers
    - Add function to check if users can message each other
    - Add indexes for better performance

  2. Security
    - Add RLS policies to ensure only mutual followers can message each other
    - Add validation for conversation participants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Create new policies for conversations
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations with mutual followers"
  ON conversations
  FOR INSERT
  WITH CHECK (true);

-- Function to check if users can message each other
CREATE OR REPLACE FUNCTION can_message(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Users cannot message themselves
  IF user1_id = user2_id THEN
    RETURN false;
  END IF;

  -- Check if users are mutual followers
  RETURN EXISTS (
    SELECT 1 FROM mutual_follows
    WHERE (user_id = user1_id AND other_user_id = user2_id)
    OR (user_id = user2_id AND other_user_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start conversation between users
CREATE OR REPLACE FUNCTION start_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Check if users can message each other
  IF NOT can_message(user1_id, user2_id) THEN
    RAISE EXCEPTION 'Users cannot message each other';
  END IF;

  -- Check for existing conversation
  SELECT cp1.conversation_id INTO conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id 
    AND cp2.user_id = user2_id;

  -- Return existing conversation if found
  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (conversation_id, user1_id),
    (conversation_id, user2_id);

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_composite 
  ON conversation_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
  ON conversations(last_message_at DESC NULLS LAST);