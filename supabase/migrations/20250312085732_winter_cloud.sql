/*
  # Fix notifications read status

  1. Changes
    - Add trigger to update notifications read status
    - Add function to mark notifications as read
    - Add index for better performance
*/

-- Create index for faster queries on is_read status
CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
  ON notifications(user_id, is_read);

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(user_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = user_id_param
  AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS mark_notification_as_read(notification_id uuid);

-- Create function to mark single notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = notification_id_param
  AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;