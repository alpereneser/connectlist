/*
  # Add SEO improvements to database schema

  1. Changes
    - Add slug column to lists table
    - Add function to generate slugs from titles
    - Add trigger to automatically update slugs when titles change
    - Add indexes for better performance

  2. Security
    - Maintain RLS policies
    - Add proper validation checks
*/

-- Add slug column to lists table if it doesn't exist
ALTER TABLE lists
ADD COLUMN IF NOT EXISTS slug text;

-- Create function to generate slugs
CREATE OR REPLACE FUNCTION generate_slug(title text)
RETURNS text AS $$
DECLARE
  slug text;
  base_slug text;
  counter integer := 1;
  turkish_map jsonb := '{
    "ı": "i", "İ": "I",
    "ğ": "g", "Ğ": "G",
    "ü": "u", "Ü": "U",
    "ş": "s", "Ş": "S",
    "ö": "o", "Ö": "O",
    "ç": "c", "Ç": "C"
  }';
  normalized text;
  k text;
  v text;
BEGIN
  -- Replace Turkish characters
  normalized := title;
  
  -- Iterate through the Turkish character map
  FOR k, v IN SELECT * FROM jsonb_each_text(turkish_map)
  LOOP
    normalized := replace(normalized, k, v);
  END LOOP;
  
  -- Create base slug
  base_slug := lower(regexp_replace(normalized, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use 'untitled'
  IF base_slug = '' THEN
    base_slug := 'untitled';
  END IF;
  
  -- Check for uniqueness
  slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM lists WHERE lists.slug = slug AND lists.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update slug when title changes
CREATE OR REPLACE FUNCTION update_list_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update slug if title changed or slug is NULL
  IF NEW.title != OLD.title OR NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_list_slug_trigger
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_list_slug();

-- Create trigger for new lists
CREATE TRIGGER insert_list_slug_trigger
  BEFORE INSERT ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_list_slug();

-- Update existing lists to have slugs
UPDATE lists
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_lists_slug ON lists(slug);
CREATE INDEX IF NOT EXISTS idx_lists_user_id_slug ON lists(user_id, slug);

-- Create function to find list by username and slug
CREATE OR REPLACE FUNCTION find_list_by_username_and_slug(username_param text, slug_param text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  user_id uuid,
  username text,
  full_name text,
  avatar text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.category,
    l.user_id,
    p.username,
    p.full_name,
    p.avatar
  FROM lists l
  JOIN profiles p ON l.user_id = p.id
  WHERE p.username = username_param
  AND l.slug = slug_param
  AND l.is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;