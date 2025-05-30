/*
  # Add username update function

  1. Changes
    - Add function to check username availability
    - Add function to update username
    - Add proper validation for username format
    - Add transaction support for username updates

  2. Security
    - Maintain RLS policies
    - Add proper validation checks
*/

-- Function to check username availability
CREATE OR REPLACE FUNCTION check_username_available(username_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE LOWER(username) = LOWER(username_to_check)
    AND id != auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update username
CREATE OR REPLACE FUNCTION update_username(new_username text)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated';
  END IF;

  -- Validate username format
  IF NOT new_username ~ '^[a-zA-Z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  END IF;

  -- Check if username is available
  IF NOT check_username_available(new_username) THEN
    RAISE EXCEPTION 'Username is already taken';
  END IF;

  -- Update username
  UPDATE profiles
  SET 
    username = new_username,
    updated_at = now()
  WHERE id = current_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user lists with content status
CREATE OR REPLACE FUNCTION get_user_lists_with_content_status(
  content_type_param text,
  content_id_param text,
  category_param text
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  items_count integer,
  has_content boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.category,
    l.items_count,
    EXISTS (
      SELECT 1 
      FROM list_items li 
      WHERE li.list_id = l.id 
      AND li.type = content_type_param 
      AND li.external_id = content_id_param
    ) as has_content
  FROM lists l
  WHERE l.user_id = auth.uid()
  AND l.category = category_param
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;