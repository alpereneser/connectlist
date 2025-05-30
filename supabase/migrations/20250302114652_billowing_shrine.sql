/*
  # Fix Database Schema and Constraints

  1. Changes
    - Drop existing tables and functions to ensure clean state
    - Create tables in correct order with proper constraints
    - Recreate functions and triggers
    - Re-add referral codes

  2. Security
    - Maintain RLS policies
    - Keep security definer functions
*/

-- Drop existing objects in correct order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS use_referral_code(text, uuid);
DROP FUNCTION IF EXISTS generate_referral_code(integer);
DROP TABLE IF EXISTS referral_codes;
DROP TABLE IF EXISTS profiles;

-- Create profiles table first
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  referral_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create referral_codes table
CREATE TABLE referral_codes (
  code text PRIMARY KEY,
  is_used boolean DEFAULT false,
  used_by uuid REFERENCES profiles(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on referral_codes
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Create referral_codes policies
CREATE POLICY "Referral codes are viewable by everyone" ON referral_codes
  FOR SELECT USING (true);

-- Create function to generate random referral code
CREATE OR REPLACE FUNCTION generate_referral_code(length integer DEFAULT 8)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
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

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to handle referral code usage
CREATE OR REPLACE FUNCTION use_referral_code(code_to_use text, user_id uuid)
RETURNS boolean AS $$
DECLARE
  code_exists boolean;
BEGIN
  -- Check if code exists and is not used
  SELECT EXISTS (
    SELECT 1 
    FROM referral_codes 
    WHERE code = code_to_use
    AND NOT is_used
  ) INTO code_exists;

  IF code_exists THEN
    -- Update the code as used
    UPDATE referral_codes
    SET 
      is_used = true,
      used_by = user_id,
      used_at = now()
    WHERE code = code_to_use;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate initial referral codes
DO $$
DECLARE
  i integer := 0;
  new_code text;
BEGIN
  WHILE i < 10000 LOOP
    new_code := generate_referral_code();
    BEGIN
      INSERT INTO referral_codes (code) VALUES (new_code);
      i := i + 1;
    EXCEPTION WHEN unique_violation THEN
      -- If duplicate code generated, try again
      NULL;
    END;
  END LOOP;
END $$;