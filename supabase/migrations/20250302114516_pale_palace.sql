/*
  # Fix profile trigger and referral code handling

  1. Changes
    - Update handle_new_user trigger function to properly handle metadata
    - Add error handling for invalid metadata
    - Ensure username and referral code are properly saved

  2. Security
    - Maintain existing RLS policies
    - Keep security definer for proper permissions
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function with better metadata handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  username_val text;
  full_name_val text;
  referral_code_val text;
BEGIN
  -- Extract values from metadata with proper error handling
  username_val := COALESCE(new.raw_user_meta_data->>'username', '');
  full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', '');
  referral_code_val := new.raw_user_meta_data->>'referral_code';

  -- Validate required fields
  IF username_val = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  IF full_name_val = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Insert the profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    referral_code
  ) VALUES (
    new.id,
    username_val,
    full_name_val,
    referral_code_val
  );

  -- If referral code exists, mark it as used
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();