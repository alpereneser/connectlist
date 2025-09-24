// Supabase ile doğrudan SQL çalıştırma scripti
const https = require('https');

const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';

async function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'ynbwiarxodetyirhmcbp.supabase.co',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Response Status:', res.statusCode);
        console.log('📊 Response Data:', responseData);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: responseData });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  try {
    console.log('🚀 Migration başlatılıyor...');
    console.log('⚠️ Supabase API üzerinden ALTER TABLE çalıştırılamıyor.');
    console.log('📋 Manuel olarak Supabase Dashboard\'da SQL Editor\'ı açın ve şu komutları çalıştırın:');
    console.log('');
    console.log('-- 1. list_liked alanını ekle');
    console.log('ALTER TABLE user_email_preferences ADD COLUMN list_liked BOOLEAN DEFAULT true;');
    console.log('');
    console.log('-- 2. Mevcut kullanıcılar için list_liked\'ı true yap');
    console.log('UPDATE user_email_preferences SET list_liked = true WHERE list_liked IS NULL;');
    console.log('');
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/ynbwiarxodetyirhmcbp/sql');
    console.log('');
    console.log('✅ Bu komutları çalıştırdıktan sonra liste beğeni bildirimleri çalışacak!');
    
  } catch (error) {
    console.error('❌ Migration sırasında hata:', error.message);
  }
}

runMigration();