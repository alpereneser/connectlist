-- Remove triggers and functions related to popular_lists
-- This script removes the remaining triggers and functions that reference popular_lists

-- Step 1: Drop the trigger from lists table
DROP TRIGGER IF EXISTS refresh_popular_lists_trigger ON lists;

-- Step 2: Drop the function that was called by the trigger
DROP FUNCTION IF EXISTS refresh_popular_lists();

-- Step 3: Verify that triggers are removed
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE action_statement LIKE '%popular_lists%';

-- Step 4: Verify that functions are removed
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%popular_lists%';

-- If both queries return no results, all popular_lists references have been successfully removed