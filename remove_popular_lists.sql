-- REMOVE POPULAR_LISTS COMPLETELY
-- This script will completely remove popular_lists view/materialized view
-- since it's not used in the frontend and only causes issues with list creation

-- Step 1: Drop the materialized view completely (with CASCADE to remove dependencies)
DROP MATERIALIZED VIEW IF EXISTS popular_lists CASCADE;

-- Step 2: Also drop if it exists as a regular view
DROP VIEW IF EXISTS popular_lists CASCADE;

-- Step 3: Drop any table with this name (just in case)
DROP TABLE IF EXISTS popular_lists CASCADE;

-- Step 4: Check for any remaining references and constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%popular_lists%';

-- Step 5: Check for triggers that might reference popular_lists
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%popular_lists%';

-- Step 6: Verify that popular_lists is completely removed
SELECT 
  n.nspname as schema_name,
  c.relname as object_name,
  CASE c.relkind 
      WHEN 'r' THEN 'table'
      WHEN 'v' THEN 'view'
      WHEN 'm' THEN 'materialized view'
      WHEN 'i' THEN 'index'
      WHEN 'S' THEN 'sequence'
      WHEN 's' THEN 'special'
      WHEN 'f' THEN 'foreign table'
      WHEN 'p' THEN 'partitioned table'
      WHEN 'I' THEN 'partitioned index'
      ELSE c.relkind::text
  END as object_type,
  pg_get_userbyid(c.relowner) as owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'popular_lists'
AND n.nspname = 'public';

-- If the above query returns no results, popular_lists has been successfully removed

-- Step 7: Test list creation to ensure it works now
-- This should be tested after running the above commands
-- You can test by creating a list through the application