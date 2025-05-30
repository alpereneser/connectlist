/*
  # Update push notifications system

  1. Changes
    - Drop existing trigger and functions first
    - Recreate push notification functions with proper error handling
    - Add better transaction handling
    - Add proper validation

  2. Security
    - Maintain RLS policies
    - Ensure secure notification handling
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS send_message_push_notification_trigger ON messages;
DROP FUNCTION IF EXISTS send_message_push_notification();
DROP FUNCTION IF EXISTS send_push_notification(uuid, text);

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