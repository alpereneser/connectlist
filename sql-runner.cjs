const { createClient } = require('@supabase/supabase-js');

// Supabase konfigürasyonu
const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(query) {
  console.log('🔍 SQL Sorgusu Çalıştırılıyor:');
  console.log('=' .repeat(50));
  console.log(query);
  console.log('=' .repeat(50));
  
  try {
    // Doğrudan PostgreSQL REST API kullan
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ sql_query: query })
    });
    
    if (!response.ok) {
      console.error('❌ HTTP Hata:', response.status, response.statusText);
      
      // Alternatif: Basit SELECT sorguları için from() kullan
      if (query.toLowerCase().includes('select') && query.toLowerCase().includes('from')) {
        console.log('\n🔄 Alternatif yöntem deneniyor...');
        await runAlternativeQuery(query);
      }
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Sonuç:');
    if (Array.isArray(data)) {
      console.table(data);
    } else {
      console.log(data);
    }
    
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error);
    
    // Alternatif yöntem dene
    if (query.toLowerCase().includes('select') && query.toLowerCase().includes('from')) {
      console.log('\n🔄 Alternatif yöntem deneniyor...');
      await runAlternativeQuery(query);
    }
  }
}

async function runAlternativeQuery(query) {
  // Basit SELECT sorgularını parse et
  const match = query.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+(.+))?/i);
  if (!match) {
    console.log('❌ Sorgu parse edilemedi');
    return;
  }
  
  const [, columns, tableName, conditions] = match;
  
  try {
    let queryBuilder = supabase.from(tableName);
    
    if (columns.trim() === '*') {
      queryBuilder = queryBuilder.select('*');
    } else {
      queryBuilder = queryBuilder.select(columns.trim());
    }
    
    // LIMIT ekle
    if (conditions && conditions.toLowerCase().includes('limit')) {
      const limitMatch = conditions.match(/limit\s+(\d+)/i);
      if (limitMatch) {
        queryBuilder = queryBuilder.limit(parseInt(limitMatch[1]));
      }
    } else {
      queryBuilder = queryBuilder.limit(10); // Varsayılan limit
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      console.error('❌ Alternatif sorgu hatası:', error);
      return;
    }
    
    console.log('✅ Alternatif sonuç:');
    if (Array.isArray(data)) {
      console.table(data);
    } else {
      console.log(data);
    }
    
  } catch (error) {
    console.error('❌ Alternatif sorgu beklenmeyen hatası:', error);
  }
}

async function main() {
  console.log('🚀 Supabase SQL Runner Başlatıldı');
  console.log('Kullanım: node sql-runner.cjs "SELECT * FROM profiles LIMIT 5"');
  
  const sqlQuery = process.argv[2];
  
  if (!sqlQuery) {
    console.log('\n📋 Örnek Sorgular:');
    console.log('node sql-runner.cjs "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'"');
    console.log('node sql-runner.cjs "SELECT * FROM profiles LIMIT 5"');
    console.log('node sql-runner.cjs "SELECT COUNT(*) as total FROM lists"');
    console.log('node sql-runner.cjs "SHOW TABLES"');
    return;
  }
  
  await runSQL(sqlQuery);
}

main().catch(console.error);