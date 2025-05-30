/*
  # Add roadmap system

  1. Changes
    - Add IF NOT EXISTS checks
    - Add admin users table if not exists
    - Add is_admin function if not exists
    - Add proper error handling

  2. Security
    - Enable RLS
    - Add policies for roadmap items
*/

-- Create admin_users table if not exists
CREATE TABLE IF NOT EXISTS admin_users (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Create is_admin function if not exists
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create roadmap_items table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roadmap_status') THEN
    CREATE TYPE roadmap_status AS ENUM ('planned', 'in_progress', 'completed', 'delayed');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Only admins can insert roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Only admins can update roadmap items" ON roadmap_items;
DROP POLICY IF EXISTS "Only admins can delete roadmap items" ON roadmap_items;

-- Create or update roadmap_items table
CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status roadmap_status NOT NULL DEFAULT 'planned',
  target_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view roadmap items"
  ON roadmap_items FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert roadmap items"
  ON roadmap_items FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update roadmap items"
  ON roadmap_items FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete roadmap items"
  ON roadmap_items FOR DELETE
  USING (is_admin());

-- Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_roadmap_items_updated_at ON roadmap_items;
CREATE TRIGGER update_roadmap_items_updated_at
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();