/*
  # Fix referral code handling and constraints

  1. Changes
    - Add unique constraint on username
    - Improve referral code validation
    - Add better error messages for common failures

  2. Security
    - Maintain existing RLS policies
    - Add additional validation in database functions
*/

-- Add unique constraint on username if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Improve referral code validation function
CREATE OR REPLACE FUNCTION validate_referral_code(code text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM referral_codes 
    WHERE code = UPPER(code) 
    AND NOT is_used
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
  full_name_val text;
  referral_code_val text;
  avatar_val text;
BEGIN
  -- Extract values from metadata with proper error handling
  username_val := COALESCE(new.raw_user_meta_data->>'username', '');
  full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', '');
  referral_code_val := UPPER(COALESCE(new.raw_user_meta_data->>'referral_code', NULL));
  avatar_val := COALESCE(new.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg');

  -- Validate username
  IF EXISTS (SELECT 1 FROM profiles WHERE username = username_val) THEN
    RAISE EXCEPTION 'Username % is already taken', username_val;
  END IF;

  -- Validate required fields
  IF username_val = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  IF full_name_val = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Validate and handle referral code if provided
  IF referral_code_val IS NOT NULL THEN
    IF NOT validate_referral_code(referral_code_val) THEN
      RAISE EXCEPTION 'Invalid or already used referral code: %', referral_code_val;
    END IF;
  END IF;

  -- Insert the profile with all fields
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

  -- If referral code exists and is valid, mark it as used
  IF referral_code_val IS NOT NULL THEN
    UPDATE referral_codes
    SET 
      is_used = true,
      used_by = new.id,
      used_at = now()
    WHERE code = referral_code_val
    AND NOT is_used;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;