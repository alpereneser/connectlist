/*
  # Fix profile creation and referral code handling

  1. Changes
    - Drop and recreate the handle_new_user function with proper error handling
    - Ensure profile creation with all required fields
    - Fix referral code handling
    - Add proper validation and error messages

  2. Security
    - Maintain existing RLS policies
    - Ensure secure handling of user data
*/

-- Drop existing trigger first to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with proper error handling and profile creation
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
  referral_code_val := COALESCE(new.raw_user_meta_data->>'referral_code', NULL);
  avatar_val := COALESCE(new.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg');

  -- Validate required fields
  IF username_val = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;

  IF full_name_val = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Validate and handle referral code if provided
  IF referral_code_val IS NOT NULL THEN
    -- Check if referral code exists and is not used
    IF NOT EXISTS (
      SELECT 1 FROM referral_codes 
      WHERE code = referral_code_val 
      AND NOT is_used
    ) THEN
      RAISE EXCEPTION 'Invalid or already used referral code';
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();