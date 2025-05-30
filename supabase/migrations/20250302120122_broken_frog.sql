/*
  # Fix username handling and uniqueness checks

  1. Changes
    - Add case-insensitive unique index for usernames
    - Add username format validation
    - Improve error handling for username conflicts

  2. Security
    - Maintain existing RLS policies
    - Add additional validation in database functions
*/

-- Drop existing username constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Create case-insensitive unique index for usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles (LOWER(username));

-- Add check constraint for username format
ALTER TABLE profiles
  ADD CONSTRAINT username_format_check 
  CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');

-- Create function to check username availability
CREATE OR REPLACE FUNCTION check_username_available(username_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE LOWER(username) = LOWER(username_to_check)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers in correct order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function with better username handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
  full_name_val text;
  referral_code_val text;
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
  IF NOT check_username_available(username_val) THEN
    RAISE EXCEPTION 'Username % is already taken', username_val;
  END IF;

  -- Extract and validate full name
  full_name_val := NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), '');
  IF full_name_val IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Process referral code if provided
  referral_code_val := UPPER(TRIM(new.raw_user_meta_data->>'referral_code'));
  IF referral_code_val IS NOT NULL THEN
    -- Validate referral code
    IF NOT EXISTS (
      SELECT 1 
      FROM referral_codes 
      WHERE code = referral_code_val 
      AND NOT is_used
      FOR UPDATE
    ) THEN
      RAISE EXCEPTION 'Invalid or already used referral code: %', referral_code_val;
    END IF;

    -- Mark referral code as used
    UPDATE referral_codes
    SET 
      is_used = true,
      used_by = new.id,
      used_at = now()
    WHERE code = referral_code_val
    AND NOT is_used;
  END IF;

  -- Set avatar
  avatar_val := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'avatar'), ''),
    'https://api.dicebear.com/7.x/avataaars/svg'
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    referral_code,
    avatar,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    username_val,
    full_name_val,
    referral_code_val,
    avatar_val,
    now(),
    now()
  );

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition for concurrent registrations
    IF NOT check_username_available(username_val) THEN
      RAISE EXCEPTION 'Username % is already taken', username_val;
    ELSE
      RAISE EXCEPTION 'An unexpected error occurred. Please try again.';
    END IF;
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();