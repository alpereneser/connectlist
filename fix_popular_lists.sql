-- Fix popular_lists materialized view issue
-- This script should be run in Supabase SQL Editor

-- Drop the materialized view if it exists to prevent permission errors
DROP MATERIALIZED VIEW IF EXISTS popular_lists;

-- Create a simple view for popular lists based on likes_count
CREATE VIEW IF NOT EXISTS popular_lists AS
SELECT 
  l.id,
  l.title,
  l.description,
  l.category,
  l.created_at,
  l.likes_count,
  l.items_count,
  l.user_id,
  p.username,
  p.full_name,
  p.avatar
FROM lists l
JOIN profiles p ON l.user_id = p.id
WHERE l.is_public = true
ORDER BY l.likes_count DESC, l.created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON popular_lists TO authenticated;
GRANT SELECT ON popular_lists TO anon;

-- Test the view
SELECT COUNT(*) FROM popular_lists LIMIT 1;