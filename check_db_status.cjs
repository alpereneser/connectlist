const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkDatabaseStatus() {
  const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Checking database status...');
    
    // 1. Check if materialized view exists
    console.log('\n1. Checking for materialized view:');
    const { data: matViews, error: matViewError } = await supabase
      .from('pg_matviews')
      .select('schemaname, matviewname, matviewowner, definition')
      .eq('matviewname', 'popular_lists');
    
    if (matViewError) {
      console.log('Error checking materialized views:', matViewError.message);
    } else {
      console.log('Materialized views found:', matViews);
    }
    
    // 2. Check if regular view exists
    console.log('\n2. Checking for regular view:');
    const { data: views, error: viewError } = await supabase
      .from('pg_views')
      .select('schemaname, viewname, viewowner, definition')
      .eq('viewname', 'popular_lists');
    
    if (viewError) {
      console.log('Error checking views:', viewError.message);
    } else {
      console.log('Views found:', views);
    }
    
    // 3. Check if popular_lists exists as any object type
    console.log('\n3. Checking for any object named popular_lists:');
    const { data: objects, error: objectError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          n.nspname as schema_name,
          c.relname as object_name,
          CASE c.relkind 
              WHEN 'r' THEN 'table'
              WHEN 'v' THEN 'view'
              WHEN 'm' THEN 'materialized view'
              WHEN 'i' THEN 'index'
              WHEN 'S' THEN 'sequence'
              WHEN 's' THEN 'special'
              WHEN 'f' THEN 'foreign table'
              WHEN 'p' THEN 'partitioned table'
              WHEN 'I' THEN 'partitioned index'
              ELSE c.relkind::text
          END as object_type,
          pg_get_userbyid(c.relowner) as owner
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'popular_lists'
        AND n.nspname = 'public';
      `
    });
    
    if (objectError) {
      console.log('Error checking objects:', objectError.message);
    } else {
      console.log('Objects found:', objects);
    }
    
    // 4. Check triggers on lists table
    console.log('\n4. Checking triggers on lists table:');
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_statement,
          action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'lists';
      `
    });
    
    if (triggerError) {
      console.log('Error checking triggers:', triggerError.message);
    } else {
      console.log('Triggers found:', triggers);
    }
    
    // 5. Try to create a simple test list to see the exact error
    console.log('\n5. Testing list creation:');
    const { data: testList, error: testError } = await supabase
      .from('lists')
      .insert({
        title: 'Test List',
        description: 'Test Description',
        category: 'movies',
        user_id: '00000000-0000-0000-0000-000000000000' // dummy user id
      })
      .select()
      .single();
    
    if (testError) {
      console.log('Test list creation error:', testError);
    } else {
      console.log('Test list created successfully:', testList);
      // Clean up test list
      await supabase.from('lists').delete().eq('id', testList.id);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDatabaseStatus();