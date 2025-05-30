/*
  # Add avatar_url column to profiles table

  1. Schema Updates
    - Add avatar_url column to store avatar file path
*/

-- Add avatar_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update existing profiles to have default avatar_url
UPDATE profiles
SET avatar_url = 'default-avatar'
WHERE avatar_url IS NULL;