/*
  # Update roadmap items

  1. Changes
    - Add initial roadmap items
    - Set target dates for each item
    - Add descriptions and statuses
*/

-- Insert initial roadmap items
INSERT INTO roadmap_items (title, description, status, target_date) VALUES
('Beta Açılış', 'Connectlist beta sürümü kullanıma açılıyor. Temel özellikler ve kullanıcı arayüzü hazır.', 'planned', '2024-04-05'),
('Sosyal Özellikler', 'Kullanıcılar arası etkileşimi artıracak yeni sosyal özellikler eklenecek. Grup oluşturma, etiketleme ve gelişmiş bildirim sistemi.', 'planned', '2024-05-15'),
('Mobil Uygulama', 'iOS ve Android için native mobil uygulamalar geliştirilecek.', 'planned', '2024-06-20'),
('İçerik Zenginleştirme', 'Yeni içerik türleri ve kategoriler eklenecek. Podcast, müzik ve etkinlik listelerinin eklenmesi.', 'planned', '2024-07-25'),
('Premium Özellikler', 'Premium üyelik sistemi ve özel özellikler eklenecek.', 'planned', '2024-08-30'),
('Reklam Yönetimi', 'Reklam yönetim sistemi entegrasyonu ve sponsorlu içerik desteği.', 'planned', '2024-09-15');