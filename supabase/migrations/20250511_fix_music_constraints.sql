-- Ensure music categories are allowed in lists and list_items
-- Safe to run multiple times

-- Lists.category: drop any existing check constraints then add unified one
ALTER TABLE public.lists DROP CONSTRAINT IF EXISTS lists_category_check;
ALTER TABLE public.lists DROP CONSTRAINT IF EXISTS valid_category;
ALTER TABLE public.lists
  ADD CONSTRAINT valid_category
  CHECK (category IN ('movies','series','books','games','people','videos','places','musics'));

-- List items type: include 'music'
ALTER TABLE public.list_items DROP CONSTRAINT IF EXISTS list_items_type_check;
ALTER TABLE public.list_items DROP CONSTRAINT IF EXISTS valid_type;
ALTER TABLE public.list_items
  ADD CONSTRAINT valid_type
  CHECK (type IN ('movie','series','book','game','person','video','place','music'));

-- Optional: content_lists.content_type if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'content_lists'
  ) THEN
    ALTER TABLE public.content_lists DROP CONSTRAINT IF EXISTS content_lists_content_type_check;
    ALTER TABLE public.content_lists DROP CONSTRAINT IF EXISTS valid_content_type;
    ALTER TABLE public.content_lists
      ADD CONSTRAINT valid_content_type
      CHECK (content_type IN ('movie','series','book','game','person','music'));
  END IF;
END $$;

