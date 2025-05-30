/*
  # Add push notifications table

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `endpoint` (text)
      - `auth` (text)
      - `p256dh` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for subscriptions
*/

-- Create push_subscriptions table
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  auth text NOT NULL,
  p256dh text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to send push notification
CREATE OR REPLACE FUNCTION send_push_notification(
  user_id_param uuid,
  message_text text
)
RETURNS void AS $$
BEGIN
  -- Get user's push subscription
  -- Note: Actual push notification sending would be handled by the application server
  -- This is just a placeholder function
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send push notification for new messages
CREATE OR REPLACE FUNCTION send_message_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id uuid;
BEGIN
  -- Get the recipient's ID
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id
  LIMIT 1;

  -- Send push notification
  IF recipient_id IS NOT NULL THEN
    SELECT send_push_notification(
      recipient_id,
      NEW.text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
CREATE TRIGGER send_message_push_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION send_message_push_notification();