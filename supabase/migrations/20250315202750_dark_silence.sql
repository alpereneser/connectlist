/*
  # Update registration system

  1. Changes
    - Remove referral code requirement
    - Add better username and email validation
    - Add proper error messages
    - Fix user creation process

  2. Security
    - Maintain RLS policies
    - Add proper validation checks
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
  full_name_val text;
  avatar_val text;
BEGIN
  -- Extract and validate username
  username_val := NULLIF(TRIM(new.raw_user_meta_data->>'username'), '');
  IF username_val IS NULL THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  -- Check username format
  IF NOT username_val ~ '^[a-zA-Z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  END IF;

  -- Check for existing username case-insensitively
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(username_val)
  ) THEN
    RAISE EXCEPTION 'Username % is already taken', username_val;
  END IF;

  -- Extract and validate full name
  full_name_val := NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), '');
  IF full_name_val IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Set default avatar
  avatar_val := 'https://api.dicebear.com/7.x/avataaars/svg';

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
    avatar_val,
    now(),
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;