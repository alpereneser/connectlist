/*
  # Add Profile Fields

  1. Changes
    - Add avatar, bio, website, and location fields to profiles table
    - Set default avatar URL
    - Add policy for users to update their own profile

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS avatar text DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg',
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS location text;

-- Update the profiles update policy to include new fields
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);