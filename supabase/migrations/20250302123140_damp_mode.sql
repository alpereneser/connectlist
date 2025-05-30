/*
  # Minimal user registration fix

  1. Changes
    - Remove all complex transaction handling
    - Simplify profile creation
    - Focus only on essential fields
    - Remove optional features temporarily

  2. Security
    - Maintain basic security checks
    - Keep username validation
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create basic handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create basic profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
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