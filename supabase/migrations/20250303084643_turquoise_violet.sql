/*
  # Add notifications system

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `type` (text)
      - `data` (jsonb)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for notifications
*/

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),

  -- Add constraint for valid notification types
  CONSTRAINT valid_notification_type CHECK (
    type IN ('like', 'comment', 'follow', 'message')
  )
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to create notification for likes
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get list owner's id
  WITH list_owner AS (
    SELECT user_id
    FROM lists
    WHERE id = NEW.list_id
  )
  INSERT INTO notifications (user_id, type, data)
  SELECT 
    user_id,
    'like',
    jsonb_build_object(
      'list_id', NEW.list_id,
      'user_id', NEW.user_id,
      'username', (SELECT username FROM profiles WHERE id = NEW.user_id),
      'avatar', (SELECT avatar FROM profiles WHERE id = NEW.user_id),
      'list_title', (SELECT title FROM lists WHERE id = NEW.list_id)
    )
  FROM list_owner
  WHERE user_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get list owner's id
  WITH list_owner AS (
    SELECT user_id
    FROM lists
    WHERE id = NEW.list_id
  )
  INSERT INTO notifications (user_id, type, data)
  SELECT 
    user_id,
    'comment',
    jsonb_build_object(
      'list_id', NEW.list_id,
      'comment_id', NEW.id,
      'user_id', NEW.user_id,
      'username', (SELECT username FROM profiles WHERE id = NEW.user_id),
      'avatar', (SELECT avatar FROM profiles WHERE id = NEW.user_id),
      'list_title', (SELECT title FROM lists WHERE id = NEW.list_id),
      'comment_text', NEW.text
    )
  FROM list_owner
  WHERE user_id != NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for follows
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, data)
  VALUES (
    NEW.following_id,
    'follow',
    jsonb_build_object(
      'user_id', NEW.follower_id,
      'username', (SELECT username FROM profiles WHERE id = NEW.follower_id),
      'avatar', (SELECT avatar FROM profiles WHERE id = NEW.follower_id)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for messages
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get other participant's id
  WITH other_participant AS (
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  )
  INSERT INTO notifications (user_id, type, data)
  SELECT 
    user_id,
    'message',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'user_id', NEW.sender_id,
      'username', (SELECT username FROM profiles WHERE id = NEW.sender_id),
      'avatar', (SELECT avatar FROM profiles WHERE id = NEW.sender_id),
      'message_text', NEW.text
    )
  FROM other_participant;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER create_like_notification_trigger
  AFTER INSERT ON list_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER create_comment_notification_trigger
  AFTER INSERT ON list_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER create_follow_notification_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

CREATE TRIGGER create_message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();