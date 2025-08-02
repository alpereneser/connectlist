const { createClient } = require('@supabase/supabase-js');

async function directDatabaseCheck() {
  const supabaseUrl = 'https://ynbwiarxodetyirhmcbp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYndpYXJ4b2RldHlpcmhtY2JwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkxNDMzMywiZXhwIjoyMDU2NDkwMzMzfQ.Y8peaDvFFC2BDnsSlXH5oHDKCyiJ7lkV0UY-8CG8cek';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Checking database status with direct queries...');
    
    // 1. Try to query popular_lists directly
    console.log('\n1. Trying to query popular_lists directly:');
    const { data: popularLists, error: popularError } = await supabase
      .from('popular_lists')
      .select('*')
      .limit(1);
    
    if (popularError) {
      console.log('Error querying popular_lists:', popularError);
    } else {
      console.log('popular_lists query successful, found records:', popularLists?.length || 0);
    }
    
    // 2. Try to query lists table directly
    console.log('\n2. Trying to query lists table directly:');
    const { data: lists, error: listsError } = await supabase
      .from('lists')
      .select('id, title, category, created_at')
      .limit(5);
    
    if (listsError) {
      console.log('Error querying lists:', listsError);
    } else {
      console.log('lists table query successful, found records:', lists?.length || 0);
      if (lists && lists.length > 0) {
        console.log('Sample list:', lists[0]);
      }
    }
    
    // 3. Try to get current user session
    console.log('\n3. Checking authentication:');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('Auth error:', authError);
    } else if (session) {
      console.log('Session found for user:', session.user.id);
      
      // 4. Try to create a real test list with authenticated user
      console.log('\n4. Testing list creation with authenticated user:');
      const { data: testList, error: testError } = await supabase
        .from('lists')
        .insert({
          title: 'Test List - Delete Me',
          description: 'Test Description',
          category: 'movies',
          user_id: session.user.id
        })
        .select()
        .single();
      
      if (testError) {
        console.log('Test list creation error with auth user:', testError);
      } else {
        console.log('Test list created successfully:', testList.id);
        // Clean up test list
        const { error: deleteError } = await supabase
          .from('lists')
          .delete()
          .eq('id', testList.id);
        
        if (deleteError) {
          console.log('Error deleting test list:', deleteError);
        } else {
          console.log('Test list cleaned up successfully');
        }
      }
    } else {
      console.log('No active session found');
      
      // 5. Try to sign in with service role and test
      console.log('\n5. Testing with service role permissions:');
      
      // Get a real user ID from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (profilesError) {
        console.log('Error getting profiles:', profilesError);
      } else if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        console.log('Using user ID:', userId);
        
        const { data: testList, error: testError } = await supabase
          .from('lists')
          .insert({
            title: 'Service Role Test List - Delete Me',
            description: 'Test Description',
            category: 'movies',
            user_id: userId
          })
          .select()
          .single();
        
        if (testError) {
          console.log('Service role test list creation error:', testError);
        } else {
          console.log('Service role test list created successfully:', testList.id);
          // Clean up test list
          const { error: deleteError } = await supabase
            .from('lists')
            .delete()
            .eq('id', testList.id);
          
          if (deleteError) {
            console.log('Error deleting service role test list:', deleteError);
          } else {
            console.log('Service role test list cleaned up successfully');
          }
        }
      } else {
        console.log('No profiles found in database');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

directDatabaseCheck();