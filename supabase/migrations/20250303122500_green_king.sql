-- Create type for storing partial dates
CREATE TYPE partial_date AS (
  year integer,
  month integer,
  day integer
);

-- Function to parse year from text
CREATE OR REPLACE FUNCTION extract_year(date_str text)
RETURNS integer AS $$
BEGIN
  RETURN CASE 
    WHEN date_str ~ '^\d{4}' THEN 
      (regexp_match(date_str, '^\d{4}'))[1]::integer
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse month from text
CREATE OR REPLACE FUNCTION extract_month(date_str text)
RETURNS integer AS $$
BEGIN
  RETURN CASE 
    WHEN date_str ~ '^\d{4}-\d{2}' THEN 
      (regexp_match(date_str, '^\d{4}-(\d{2})'))[1]::integer
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to parse day from text
CREATE OR REPLACE FUNCTION extract_day(date_str text)
RETURNS integer AS $$
BEGIN
  RETURN CASE 
    WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
      (regexp_match(date_str, '^\d{4}-\d{2}-(\d{2})'))[1]::integer
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Modify book_details table
ALTER TABLE book_details
  ALTER COLUMN published_date TYPE text,
  ADD COLUMN published_year integer GENERATED ALWAYS AS (extract_year(published_date)) STORED,
  ADD COLUMN published_month integer GENERATED ALWAYS AS (extract_month(published_date)) STORED,
  ADD COLUMN published_day integer GENERATED ALWAYS AS (extract_day(published_date)) STORED;

-- Modify game_details table
ALTER TABLE game_details
  ALTER COLUMN released TYPE text,
  ADD COLUMN released_year integer GENERATED ALWAYS AS (extract_year(released)) STORED,
  ADD COLUMN released_month integer GENERATED ALWAYS AS (extract_month(released)) STORED,
  ADD COLUMN released_day integer GENERATED ALWAYS AS (extract_day(released)) STORED;

-- Add indexes for better query performance
CREATE INDEX idx_book_details_published_year ON book_details(published_year);
CREATE INDEX idx_book_details_published_month ON book_details(published_month);
CREATE INDEX idx_book_details_published_day ON book_details(published_day);

CREATE INDEX idx_game_details_released_year ON game_details(released_year);
CREATE INDEX idx_game_details_released_month ON game_details(released_month);
CREATE INDEX idx_game_details_released_day ON game_details(released_day);