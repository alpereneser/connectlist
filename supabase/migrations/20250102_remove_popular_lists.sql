-- Remove popular_lists view completely
-- This migration removes the popular_lists view that was causing issues with list creation

-- Drop the view if it exists
DROP VIEW IF EXISTS popular_lists CASCADE;

-- Drop materialized view if it exists (just in case)
DROP MATERIALIZED VIEW IF EXISTS popular_lists CASCADE;

-- Drop table if it exists (just in case)
DROP TABLE IF EXISTS popular_lists CASCADE;

-- Verify removal
-- The following query should return no results if successful
-- SELECT * FROM information_schema.tables WHERE table_name = 'popular_lists';
-- SELECT * FROM information_schema.views WHERE table_name = 'popular_lists';