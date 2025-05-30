/*
  # Create referral codes system

  1. New Tables
    - `referral_codes`
      - `code` (text, primary key)
      - `is_used` (boolean)
      - `used_by` (uuid, references profiles.id)
      - `used_at` (timestamp with time zone)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `referral_codes` table
    - Add policies for:
      - Everyone can read referral codes
      - Only system can update referral codes
*/

-- Create referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  code text PRIMARY KEY,
  is_used boolean DEFAULT false,
  used_by uuid REFERENCES profiles(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Referral codes are viewable by everyone" ON referral_codes
  FOR SELECT USING (true);

-- Function to generate random referral code
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

-- Function to generate initial referral codes
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

-- Function to handle referral code usage
CREATE OR REPLACE FUNCTION use_referral_code(code_to_use text, user_id uuid)
RETURNS boolean AS $$
DECLARE
  code_exists boolean;
  code_is_used boolean;
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