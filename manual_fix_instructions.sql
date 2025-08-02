-- MANUAL FIX FOR POPULAR_LISTS MATERIALIZED VIEW ISSUE
-- Please run these commands in Supabase Dashboard > SQL Editor

-- Step 1: Drop the materialized view completely (with CASCADE to remove dependencies)
DROP MATERIALIZED VIEW IF EXISTS popular_lists CASCADE;

-- Step 2: Also drop if it exists as a regular view
DROP VIEW IF EXISTS popular_lists CASCADE;

-- Step 3: Create a new simple view instead
CREATE OR REPLACE VIEW popular_lists AS
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

-- Step 4: Grant necessary permissions
GRANT SELECT ON popular_lists TO authenticated;
GRANT SELECT ON popular_lists TO anon;
GRANT SELECT ON popular_lists TO service_role;

-- Step 5: Test the view
SELECT * FROM popular_lists LIMIT 5;

-- If you still get the error after running these commands,
-- there might be a trigger or constraint that references the old materialized view.
-- In that case, also run:

-- Check for any remaining references
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%popular_lists%';

-- Check for triggers that might reference popular_lists
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%popular_lists%';

-- If any constraints or triggers are found, they need to be dropped as well.