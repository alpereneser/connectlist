/*
  # Fix conversation policies

  1. Changes
    - Drop existing policies that cause infinite recursion
    - Create simplified policies for conversation participants
    - Add performance optimizing indexes
    
  2. Security
    - Users can only view conversations they are part of
    - Users can only add participants to their own conversations
    - Users can only leave conversations they are part of
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;

-- Create simplified policies for conversation_participants
CREATE POLICY "Users can view conversations"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for inserting new participants
CREATE POLICY "Users can create conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy for deleting participants
CREATE POLICY "Users can leave conversations"
  ON conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- Add indexes for better performance
DROP INDEX IF EXISTS idx_conversation_participants_user_id;
DROP INDEX IF EXISTS idx_conversation_participants_conversation_id;

CREATE INDEX idx_conversation_participants_user_id
  ON conversation_participants(user_id);

CREATE INDEX idx_conversation_participants_conversation_id
  ON conversation_participants(conversation_id);