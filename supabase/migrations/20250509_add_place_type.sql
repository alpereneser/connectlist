-- Mevcut kısıtlamayı kaldır
ALTER TABLE list_items DROP CONSTRAINT valid_type;

-- Yeni kısıtlamayı ekle (place türünü içerecek şekilde)
ALTER TABLE list_items ADD CONSTRAINT valid_type CHECK (
  type IN ('movie', 'series', 'book', 'game', 'person', 'video', 'place')
);
