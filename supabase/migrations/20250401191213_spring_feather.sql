/*
  # Add function to get user lists with content status

  1. New Functions
    - `get_user_lists_with_content_status`: Returns user lists with a flag indicating if content is already in the list
    
  2. Purpose
    - Simplify checking if content is already in a list
    - Improve UI for adding content to lists
    - Optimize database queries
*/

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