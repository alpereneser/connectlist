const { createClient } = require('@supabase/supabase-js');

// Supabase bağlantı bilgileri
const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabase() {
  console.log('🔍 Supabase Veritabanı Analizi Başlıyor...');
  console.log('=' .repeat(50));
  
  try {
    // Bilinen tabloları manuel olarak kontrol edelim
    const knownTables = [
      'profiles', 'lists', 'list_items', 'follows', 'likes', 
      'comments', 'messages', 'conversations', 'notifications',
      'user_email_preferences', 'categories'
    ];
    
    console.log('\n📋 TABLOLAR:');
    const existingTables = [];
    
    for (const tableName of knownTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          existingTables.push({ table_name: tableName, count });
          console.log(`✅ ${tableName} (${count} kayıt)`);
        }
      } catch (e) {
        console.log(`❌ ${tableName} - mevcut değil`);
      }
    }
    
    console.log(`\nToplam ${existingTables.length} tablo bulundu.`);
    
    // 2. Her tablo için detaylı analiz
    for (const table of existingTables) {
      await analyzeTable(table.table_name);
    }
    
    // 3. RLS Politikalarını analiz et
    console.log('\n🔒 ROW LEVEL SECURITY POLİTİKALARI:');
    await analyzeRLSPolicies();
    
    // 4. Fonksiyonları listele
    console.log('\n⚙️ FUNCTIONS:');
    await analyzeFunctions();
    
    // 5. Genel özet
    console.log('\n📈 VERİTABANI ÖZETİ:');
    console.log('-'.repeat(30));
    console.log(`Toplam Tablo: ${existingTables.length}`);
    const totalRecords = existingTables.reduce((sum, table) => sum + (table.count || 0), 0);
    console.log(`Toplam Kayıt: ${totalRecords}`);
    
  } catch (error) {
    console.error('Analiz hatası:', error);
  }
}

async function analyzeRLSPolicies() {
  try {
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies');
    
    if (!policiesError && policies) {
      policies.forEach(policy => {
        console.log(`- ${policy.tablename}: ${policy.policyname}`);
      });
    } else {
      console.log('RLS politikaları alınamadı veya mevcut değil.');
    }
  } catch (error) {
    console.log('RLS politikaları kontrol edilemedi:', error.message);
  }
}

async function analyzeFunctions() {
  try {
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public');
    
    if (!functionsError && functions) {
      functions.forEach(func => {
        console.log(`- ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('Fonksiyonlar alınamadı veya mevcut değil.');
    }
  } catch (error) {
    console.log('Fonksiyonlar kontrol edilemedi:', error.message);
  }
}

async function analyzeTable(tableName) {
  console.log(`\n\n📊 TABLO: ${tableName.toUpperCase()}`);
  console.log('-'.repeat(30));
  
  try {
    
    // Kayıt sayısını al
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`Toplam kayıt sayısı: ${count}`);
    }
    
    // İlk 5 kaydı göster ve yapıyı analiz et
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    if (!sampleError && sampleData && sampleData.length > 0) {
      // Tablo yapısını çıkar
      const firstRow = sampleData[0];
      console.log('Kolonlar:');
      Object.keys(firstRow).forEach(key => {
        const value = firstRow[key];
        const type = typeof value;
        const jsType = value === null ? 'null' : 
                      Array.isArray(value) ? 'array' :
                      value instanceof Date ? 'date' :
                      type;
        console.log(`  - ${key}: ${jsType}`);
      });
      
      console.log('\nÖrnek veriler:');
      sampleData.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    } else {
      console.log('Bu tabloda veri bulunamadı.');
    }
    
  } catch (error) {
    console.error(`${tableName} analiz hatası:`, error);
  }
}

// Analizi başlat
analyzeDatabase().then(() => {
  console.log('\n✅ Analiz tamamlandı!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analiz başarısız:', error);
  process.exit(1);
});