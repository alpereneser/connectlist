/*
  # Add notification deletion functionality

  1. Changes
    - Add function to delete single notification
    - Add function to delete all notifications
    - Add delete policy for notifications table
*/

-- Add delete policy for notifications
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;

CREATE POLICY "Users can delete their notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to delete a single notification
CREATE OR REPLACE FUNCTION delete_notification(notification_id_param uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE id = notification_id_param
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete all notifications
CREATE OR REPLACE FUNCTION delete_all_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;