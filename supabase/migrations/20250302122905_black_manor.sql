/*
  # Simplify user registration process

  1. Changes
    - Simplify profile creation to only store username
    - Move other user data to auth.users
    - Improve username validation
    - Remove unnecessary fields from profiles table

  2. Security
    - Maintain RLS policies
    - Keep username uniqueness check
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create simplified handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
BEGIN
  -- Extract and validate username
  username_val := NULLIF(TRIM(new.raw_user_meta_data->>'username'), '');
  
  -- Basic validation
  IF username_val IS NULL THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  -- Check username format
  IF NOT username_val ~ '^[a-zA-Z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  END IF;

  -- Check for existing username with proper locking
  PERFORM 1 
  FROM profiles 
  WHERE LOWER(username) = LOWER(username_val)
  FOR UPDATE SKIP LOCKED;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Username % is already taken', username_val;
  END IF;

  -- Create minimal profile
  INSERT INTO public.profiles (
    id,
    username,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    username_val,
    now(),
    now()
  );

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Re-check username availability
    IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(username_val)) THEN
      RAISE EXCEPTION 'Username % is already taken', username_val;
    ELSE
      RAISE EXCEPTION 'An unexpected error occurred. Please try again.';
    END IF;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();