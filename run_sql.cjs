const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runSQL() {
  const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTQzMzMsImV4cCI6MjA1NjQ5MDMzM30.zwO86rBSmPBYCEmecINSQOHG-0e5_Tsb1ZLucR8QP6Q';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Connecting to Supabase...');
    
    // Drop materialized view if exists
    console.log('Dropping materialized view...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP MATERIALIZED VIEW IF EXISTS popular_lists;'
    });
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.error('Error dropping view:', dropError);
    } else {
      console.log('Materialized view dropped successfully');
    }
    
    // Create new view
    console.log('Creating new view...');
    const createViewSQL = `
      CREATE VIEW IF NOT EXISTS popular_lists AS
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
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createViewSQL
    });
    
    if (createError) {
      console.error('Error creating view:', createError);
    } else {
      console.log('View created successfully');
    }
    
    // Grant permissions
    console.log('Granting permissions...');
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql: 'GRANT SELECT ON popular_lists TO authenticated; GRANT SELECT ON popular_lists TO anon;'
    });
    
    if (grantError) {
      console.error('Error granting permissions:', grantError);
    } else {
      console.log('Permissions granted successfully');
    }
    
    // Test the view
    console.log('Testing view...');
    const { data, error: testError } = await supabase
      .from('popular_lists')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Error testing view:', testError);
    } else {
      console.log('View test successful:', data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runSQL();