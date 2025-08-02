const { createClient } = require('@supabase/supabase-js');

async function fixMaterializedView() {
  const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Starting materialized view fix...');
    
    // Step 1: Drop the materialized view completely
    console.log('\n1. Dropping materialized view popular_lists...');
    
    // First try to drop with CASCADE to remove any dependencies
    const dropQueries = [
      'DROP MATERIALIZED VIEW IF EXISTS popular_lists CASCADE;',
      'DROP VIEW IF EXISTS popular_lists CASCADE;',
      'DROP TABLE IF EXISTS popular_lists CASCADE;'
    ];
    
    for (const query of dropQueries) {
      try {
        console.log(`Executing: ${query}`);
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ sql: query })
        });
        
        if (response.ok) {
          console.log(`✓ ${query} executed successfully`);
        } else {
          const error = await response.text();
          console.log(`✗ ${query} failed: ${error}`);
        }
      } catch (error) {
        console.log(`✗ ${query} failed with exception:`, error.message);
      }
    }
    
    // Step 2: Create a simple view instead
    console.log('\n2. Creating new simple view...');
    
    const createViewQuery = `
      CREATE OR REPLACE VIEW popular_lists AS
      SELECT 
        l.id,
        l.title,
        l.description,
        l.category,
        l.created_at,
        l.likes_count,
        l.items_count,
        l.user_id,
        p.username,
        p.full_name,
        p.avatar
      FROM lists l
      JOIN profiles p ON l.user_id = p.id
      WHERE l.is_public = true
      ORDER BY l.likes_count DESC, l.created_at DESC;
    `;
    
    try {
      console.log('Creating view...');
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql: createViewQuery })
      });
      
      if (response.ok) {
        console.log('✓ View created successfully');
      } else {
        const error = await response.text();
        console.log('✗ View creation failed:', error);
      }
    } catch (error) {
      console.log('✗ View creation failed with exception:', error.message);
    }
    
    // Step 3: Grant permissions
    console.log('\n3. Granting permissions...');
    
    const permissionQueries = [
      'GRANT SELECT ON popular_lists TO authenticated;',
      'GRANT SELECT ON popular_lists TO anon;',
      'GRANT SELECT ON popular_lists TO service_role;'
    ];
    
    for (const query of permissionQueries) {
      try {
        console.log(`Executing: ${query}`);
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ sql: query })
        });
        
        if (response.ok) {
          console.log(`✓ ${query} executed successfully`);
        } else {
          const error = await response.text();
          console.log(`✗ ${query} failed: ${error}`);
        }
      } catch (error) {
        console.log(`✗ ${query} failed with exception:`, error.message);
      }
    }
    
    // Step 4: Test the new view
    console.log('\n4. Testing the new view...');
    const { data: testData, error: testError } = await supabase
      .from('popular_lists')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.log('✗ View test failed:', testError);
    } else {
      console.log('✓ View test successful, found records:', testData?.length || 0);
    }
    
    // Step 5: Test list creation
    console.log('\n5. Testing list creation...');
    
    // Get a real user ID
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.log('✗ Error getting profiles:', profilesError);
    } else if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      
      const { data: testList, error: testListError } = await supabase
        .from('lists')
        .insert({
          title: 'Final Test List - Delete Me',
          description: 'Testing after materialized view fix',
          category: 'movies',
          user_id: userId
        })
        .select()
        .single();
      
      if (testListError) {
        console.log('✗ List creation still failing:', testListError);
      } else {
        console.log('✓ List creation successful! ID:', testList.id);
        
        // Clean up
        const { error: deleteError } = await supabase
          .from('lists')
          .delete()
          .eq('id', testList.id);
        
        if (deleteError) {
          console.log('✗ Error cleaning up test list:', deleteError);
        } else {
          console.log('✓ Test list cleaned up successfully');
        }
      }
    }
    
    console.log('\n=== Fix completed! ===');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixMaterializedView();