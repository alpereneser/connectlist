/*
  # Fix user registration error

  1. Changes
    - Drop existing triggers and functions for a clean slate
    - Add better transaction handling
    - Improve error handling and validation
    - Add proper locking mechanisms
    - Fix race conditions

  2. Security
    - Maintain RLS policies
    - Ensure secure profile creation
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
  referral_code_val text;
  avatar_val text;
BEGIN
  -- Lock the profiles table to prevent concurrent username checks
  LOCK TABLE profiles IN SHARE MODE;
  
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
    SELECT 1 
    FROM profiles 
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

  -- Process referral code if provided
  referral_code_val := UPPER(TRIM(new.raw_user_meta_data->>'referral_code'));
  IF referral_code_val IS NOT NULL THEN
    -- Lock and validate referral code
    PERFORM 1
    FROM referral_codes
    WHERE code = referral_code_val
    AND NOT is_used
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
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

  -- Create profile with explicit transaction
  BEGIN
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
  EXCEPTION
    WHEN unique_violation THEN
      -- Re-check username availability for accurate error message
      IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(username_val)) THEN
        RAISE EXCEPTION 'Username % is already taken', username_val;
      ELSE
        RAISE EXCEPTION 'An unexpected error occurred. Please try again.';
      END IF;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error creating profile: %', SQLERRM;
  END;

  RETURN new;
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'System is busy, please try again in a moment';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();