const { createClient } = require('@supabase/supabase-js');

async function removePopularLists() {
  const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🗑️  Starting complete removal of popular_lists...');
    
    // Step 1: Try to drop all possible popular_lists objects
    console.log('\n1. Dropping all popular_lists objects...');
    
    const dropQueries = [
      'DROP MATERIALIZED VIEW IF EXISTS popular_lists CASCADE;',
      'DROP VIEW IF EXISTS popular_lists CASCADE;',
      'DROP TABLE IF EXISTS popular_lists CASCADE;'
    ];
    
    for (const query of dropQueries) {
      try {
        console.log(`Executing: ${query}`);
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        
        if (error) {
          console.log(`⚠️  ${query} - Error: ${error.message}`);
        } else {
          console.log(`✅ ${query} - Success`);
        }
      } catch (error) {
        console.log(`❌ ${query} - Exception: ${error.message}`);
      }
    }
    
    // Step 2: Check if popular_lists still exists
    console.log('\n2. Verifying popular_lists removal...');
    
    try {
      const { data: popularLists, error: popularError } = await supabase
        .from('popular_lists')
        .select('*')
        .limit(1);
      
      if (popularError) {
        if (popularError.message.includes('does not exist') || popularError.message.includes('relation') || popularError.code === '42P01') {
          console.log('✅ popular_lists successfully removed - table/view does not exist');
        } else {
          console.log('⚠️  Unexpected error when checking popular_lists:', popularError.message);
        }
      } else {
        console.log('❌ popular_lists still exists and returned data:', popularLists?.length || 0, 'records');
      }
    } catch (error) {
      console.log('✅ popular_lists successfully removed - cannot query (expected)');
    }
    
    // Step 3: Test list creation
    console.log('\n3. Testing list creation...');
    
    // Get a real user ID
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Error getting profiles for test:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      
      const { data: testList, error: testListError } = await supabase
        .from('lists')
        .insert({
          title: 'Test List After Popular Lists Removal',
          description: 'Testing list creation after removing popular_lists',
          category: 'movies',
          user_id: userId
        })
        .select()
        .single();
      
      if (testListError) {
        console.log('❌ List creation still failing:', testListError.message);
        
        if (testListError.message.includes('popular_lists')) {
          console.log('\n🔍 popular_lists is still causing issues. Manual intervention required.');
          console.log('Please run the SQL commands in remove_popular_lists.sql manually in Supabase Dashboard.');
        }
      } else {
        console.log('🎉 List creation successful! ID:', testList.id);
        
        // Clean up test list
        const { error: deleteError } = await supabase
          .from('lists')
          .delete()
          .eq('id', testList.id);
        
        if (deleteError) {
          console.log('⚠️  Error cleaning up test list:', deleteError.message);
        } else {
          console.log('✅ Test list cleaned up successfully');
        }
      }
    } else {
      console.log('⚠️  No profiles found for testing');
    }
    
    console.log('\n=== Popular Lists Removal Completed! ===');
    console.log('\nIf list creation is now working, the issue has been resolved.');
    console.log('If you still get errors, please run the SQL commands in remove_popular_lists.sql manually.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

removePopularLists();