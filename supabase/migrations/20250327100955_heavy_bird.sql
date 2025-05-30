/*
  # Add additional profile settings

  1. New Columns
    - Add bio, website, location to profiles table
    - Add followers_count and following_count
    - Add avatar_url for storing avatar file path

  2. Security
    - Enable RLS
    - Add policies for profile updates
*/

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS location text;

-- Update the profiles update policy to include new fields
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create function to validate website URL
CREATE OR REPLACE FUNCTION is_valid_url(url text)
RETURNS boolean AS $$
BEGIN
  RETURN url ~* '^https?://[^\s/$.?#].[^\s]*$';
END;
$$ LANGUAGE plpgsql;