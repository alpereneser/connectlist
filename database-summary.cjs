const { createClient } = require('@supabase/supabase-js');

// Supabase konfigürasyonu
const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateDatabaseSummary() {
  console.log('📊 CONNECTLIST VERİTABANI KAPSAMLI ANALİZ RAPORU');
  console.log('=' .repeat(60));
  console.log('Tarih:', new Date().toLocaleString('tr-TR'));
  console.log('Veritabanı:', 'connectlist');
  console.log('Proje ID:', 'ynbwiarxodetyirhmcbp');
  console.log('=' .repeat(60));
  
  const tables = [
    'profiles', 'lists', 'list_items', 'follows', 'likes', 
    'comments', 'messages', 'conversations', 'notifications',
    'user_email_preferences', 'categories'
  ];
  
  let totalRecords = 0;
  const tableStats = [];
  
  console.log('\n🗂️  TABLO İSTATİSTİKLERİ:');
  console.log('-'.repeat(60));
  
  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        totalRecords += count || 0;
        tableStats.push({ table: tableName, count: count || 0 });
        console.log(`📋 ${tableName.padEnd(25)} : ${(count || 0).toString().padStart(6)} kayıt`);
      } else {
        console.log(`❌ ${tableName.padEnd(25)} : Erişim hatası`);
      }
    } catch (e) {
      console.log(`❌ ${tableName.padEnd(25)} : Mevcut değil`);
    }
  }
  
  console.log('-'.repeat(60));
  console.log(`📊 TOPLAM KAYIT SAYISI      : ${totalRecords.toString().padStart(6)}`);
  console.log(`📊 AKTİF TABLO SAYISI       : ${tableStats.length.toString().padStart(6)}`);
  
  // En büyük tablolar
  const sortedTables = tableStats.sort((a, b) => b.count - a.count);
  console.log('\n🏆 EN BÜYÜK TABLOLAR:');
  console.log('-'.repeat(40));
  sortedTables.slice(0, 5).forEach((table, index) => {
    console.log(`${index + 1}. ${table.table.padEnd(20)} : ${table.count} kayıt`);
  });
  
  // Detaylı tablo analizleri
  console.log('\n\n🔍 DETAYLI TABLO ANALİZLERİ:');
  console.log('=' .repeat(60));
  
  await analyzeProfilesTable();
  await analyzeListsTable();
  await analyzeListItemsTable();
  await analyzeFollowsTable();
  await analyzeLikesTable();
  await analyzeCommentsTable();
  await analyzeMessagesTable();
  await analyzeConversationsTable();
  await analyzeNotificationsTable();
  await analyzeUserEmailPreferencesTable();
  
  console.log('\n\n✅ RAPOR TAMAMLANDI!');
  console.log('=' .repeat(60));
}

async function analyzeProfilesTable() {
  console.log('\n👤 PROFILES TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      const profile = data[0];
      console.log('Kolonlar:');
      Object.keys(profile).forEach(key => {
        const value = profile[key];
        const type = value === null ? 'null' : typeof value;
        console.log(`  • ${key}: ${type}`);
      });
      
      // Kullanıcı istatistikleri
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { count: usersWithBio } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('bio', 'is', null);
      
      console.log(`\nİstatistikler:`);
      console.log(`  • Toplam kullanıcı: ${totalUsers}`);
      console.log(`  • Bio'su olan: ${usersWithBio}`);
      console.log(`  • Bio'su olmayan: ${totalUsers - usersWithBio}`);
    }
  } catch (error) {
    console.log('❌ Profiles analiz hatası:', error.message);
  }
}

async function analyzeListsTable() {
  console.log('\n📝 LISTS TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      const list = data[0];
      console.log('Kolonlar:');
      Object.keys(list).forEach(key => {
        const value = list[key];
        const type = value === null ? 'null' : typeof value;
        console.log(`  • ${key}: ${type}`);
      });
      
      // Liste istatistikleri
      const { count: totalLists } = await supabase
        .from('lists')
        .select('*', { count: 'exact', head: true });
      
      const { count: publicLists } = await supabase
        .from('lists')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);
      
      console.log(`\nİstatistikler:`);
      console.log(`  • Toplam liste: ${totalLists}`);
      console.log(`  • Herkese açık: ${publicLists}`);
      console.log(`  • Özel: ${totalLists - publicLists}`);
    }
  } catch (error) {
    console.log('❌ Lists analiz hatası:', error.message);
  }
}

async function analyzeListItemsTable() {
  console.log('\n📋 LIST_ITEMS TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      const item = data[0];
      console.log('Kolonlar:');
      Object.keys(item).forEach(key => {
        const value = item[key];
        const type = value === null ? 'null' : typeof value;
        console.log(`  • ${key}: ${type}`);
      });
      
      // Item istatistikleri
      const { count: totalItems } = await supabase
        .from('list_items')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\nİstatistikler:`);
      console.log(`  • Toplam item: ${totalItems}`);
    }
  } catch (error) {
    console.log('❌ List Items analiz hatası:', error.message);
  }
}

async function analyzeFollowsTable() {
  console.log('\n👥 FOLLOWS TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalFollows } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam takip ilişkisi: ${totalFollows}`);
  } catch (error) {
    console.log('❌ Follows analiz hatası:', error.message);
  }
}

async function analyzeLikesTable() {
  console.log('\n❤️  LIKES TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalLikes } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam beğeni: ${totalLikes}`);
  } catch (error) {
    console.log('❌ Likes analiz hatası:', error.message);
  }
}

async function analyzeCommentsTable() {
  console.log('\n💬 COMMENTS TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam yorum: ${totalComments}`);
  } catch (error) {
    console.log('❌ Comments analiz hatası:', error.message);
  }
}

async function analyzeMessagesTable() {
  console.log('\n✉️  MESSAGES TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam mesaj: ${totalMessages}`);
  } catch (error) {
    console.log('❌ Messages analiz hatası:', error.message);
  }
}

async function analyzeConversationsTable() {
  console.log('\n💭 CONVERSATIONS TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam konuşma: ${totalConversations}`);
  } catch (error) {
    console.log('❌ Conversations analiz hatası:', error.message);
  }
}

async function analyzeNotificationsTable() {
  console.log('\n🔔 NOTIFICATIONS TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam bildirim: ${totalNotifications}`);
  } catch (error) {
    console.log('❌ Notifications analiz hatası:', error.message);
  }
}

async function analyzeUserEmailPreferencesTable() {
  console.log('\n📧 USER_EMAIL_PREFERENCES TABLOSU:');
  console.log('-'.repeat(40));
  
  try {
    const { count: totalPreferences } = await supabase
      .from('user_email_preferences')
      .select('*', { count: 'exact', head: true });
    
    console.log(`İstatistikler:`);
    console.log(`  • Toplam e-posta tercihi: ${totalPreferences}`);
  } catch (error) {
    console.log('❌ User Email Preferences analiz hatası:', error.message);
  }
}

generateDatabaseSummary().catch(console.error);