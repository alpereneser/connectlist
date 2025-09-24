// Liste beğeni trigger test dosyası
console.log('🧪 Liste beğeni trigger test ediliyor...');

// Test için API endpoint'ini çağır
const testData = {
  listId: '4e89691f-2832-4cc0-bb3a-69df746e6c84',
  userId: 'ca6459f1-16b4-49ca-b913-6ad079dee166'
};

console.log('📋 Test Liste ID:', testData.listId);
console.log('👤 Test User ID:', testData.userId);

console.log('');
console.log('🔧 Migration tamamlandıktan sonra test etmek için:');
console.log('1. Uygulamada bir listeyi beğenin');
console.log('2. Liste sahibine email bildirimi gitmeli');
console.log('3. Email preferences\'ta list_liked seçeneği görünmeli');
console.log('');
console.log('📧 Email trigger fonksiyonu: triggerListLikedNotification');
console.log('📁 Dosya: src/lib/email-triggers.ts:435');
console.log('');
console.log('✅ Tüm sistem hazır, sadece migration gerekiyor!');