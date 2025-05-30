/*
  # Fix user registration trigger

  1. Changes
    - Further simplify user registration trigger
    - Remove all transaction handling
    - Add better error messages
    - Fix username uniqueness check

  2. Security
    - Maintain RLS policies
    - Keep username validation
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create simplified handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
  full_name_val text;
BEGIN
  -- Extract username and validate
  username_val := NULLIF(TRIM(new.raw_user_meta_data->>'username'), '');
  IF username_val IS NULL THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  -- Check username format
  IF NOT username_val ~ '^[a-zA-Z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  END IF;

  -- Extract and validate full name
  full_name_val := NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), '');
  IF full_name_val IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    username_val,
    full_name_val,
    'https://api.dicebear.com/7.x/avataaars/svg',
    now(),
    now()
  );

  RETURN new;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Username is already taken';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();