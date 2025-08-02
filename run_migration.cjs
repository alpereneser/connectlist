const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://wnqhqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration to remove popular_lists...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250102_remove_popular_lists.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL commands by semicolon and filter out empty commands
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('SELECT'));
    
    console.log('Executing SQL commands:');
    
    for (const command of commands) {
      if (command) {
        console.log(`Executing: ${command}`);
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.error(`Error executing command: ${command}`);
          console.error('Error details:', error);
        } else {
          console.log('✓ Command executed successfully');
        }
      }
    }
    
    // Verify that popular_lists is removed
    console.log('\nVerifying removal...');
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'popular_lists');
    
    if (tableError) {
      console.log('Could not check tables (this is expected if popular_lists is removed)');
    } else {
      console.log('Tables with name popular_lists:', tables?.length || 0);
    }
    
    const { data: views, error: viewError } = await supabase
      .from('information_schema.views')
      .select('*')
      .eq('table_name', 'popular_lists');
    
    if (viewError) {
      console.log('Could not check views (this is expected if popular_lists is removed)');
    } else {
      console.log('Views with name popular_lists:', views?.length || 0);
    }
    
    // Test list creation
    console.log('\nTesting list creation...');
    
    const { data: testList, error: createError } = await supabase
      .from('lists')
      .insert({
        title: 'Test List After Migration',
        description: 'Testing if list creation works after removing popular_lists',
        category: 'Movies',
        is_public: true,
        user_id: '00000000-0000-0000-0000-000000000000' // placeholder user_id
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ List creation still failing:', createError.message);
    } else {
      console.log('✅ List creation successful! Test list created with ID:', testList.id);
      
      // Clean up test list
      await supabase.from('lists').delete().eq('id', testList.id);
      console.log('Test list cleaned up.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();