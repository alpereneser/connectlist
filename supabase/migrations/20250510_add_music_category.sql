-- Add 'musics' to valid_category constraint for lists table
ALTER TABLE lists DROP CONSTRAINT IF EXISTS valid_category;
ALTER TABLE lists ADD CONSTRAINT valid_category CHECK (category IN ('movies', 'series', 'books', 'games', 'people', 'videos', 'places', 'musics'));

-- Add 'music' to valid_type constraint for list_items table
ALTER TABLE list_items DROP CONSTRAINT IF EXISTS valid_type;
ALTER TABLE list_items ADD CONSTRAINT valid_type CHECK (type IN ('movie', 'series', 'book', 'game', 'person', 'video', 'place', 'music'));

-- Add 'music' to valid_content_type constraint for content_lists table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_lists') THEN
        ALTER TABLE content_lists DROP CONSTRAINT IF EXISTS valid_content_type;
        ALTER TABLE content_lists ADD CONSTRAINT valid_content_type CHECK (content_type IN ('movie', 'series', 'book', 'game', 'person', 'music'));
    END IF;
END $$;