/*
  # Fix profiles table and data integrity

  1. Changes
    - Add NOT NULL constraint to avatar column
    - Set default avatar URL for existing NULL values
    - Add trigger to ensure profile exists for every user
    - Add trigger to maintain updated_at timestamp

  2. Security
    - Maintain existing RLS policies
*/

-- Set default avatar for any NULL values
UPDATE profiles 
SET avatar = 'https://api.dicebear.com/7.x/avataaars/svg'
WHERE avatar IS NULL;

-- Add NOT NULL constraint to avatar
ALTER TABLE profiles 
ALTER COLUMN avatar SET NOT NULL;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to ensure profile exists
CREATE OR REPLACE FUNCTION ensure_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    INSERT INTO profiles (
      id,
      username,
      full_name,
      avatar,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
      'https://api.dicebear.com/7.x/avataaars/svg',
      now(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to ensure profile exists for every user
DROP TRIGGER IF EXISTS ensure_user_has_profile ON auth.users;
CREATE TRIGGER ensure_user_has_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_profile_exists();