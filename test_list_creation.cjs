const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testListCreation() {
  try {
    console.log('Testing list creation after removing popular_lists...');
    
    // Get a real user ID first
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError || !profiles || profiles.length === 0) {
      console.error('❌ Could not get a valid user ID for testing:', profilesError?.message || 'No profiles found');
      return false;
    }
    
    const userId = profiles[0].id;
    console.log('Using user ID for test:', userId);
    
    // Test creating a simple list
    const testListData = {
      title: 'Test List After Fix',
      description: 'Testing if list creation works after removing popular_lists triggers',
      category: 'movies',
      is_public: true,
      user_id: userId
    };
    
    console.log('Attempting to create test list...');
    
    const { data: newList, error: createError } = await supabase
      .from('lists')
      .insert(testListData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ List creation failed:', createError.message);
      console.error('Error details:', createError);
      return false;
    }
    
    console.log('✅ List creation successful!');
    console.log('Created list:', {
      id: newList.id,
      title: newList.title,
      category: newList.category
    });
    
    // Clean up the test list
    console.log('\nCleaning up test list...');
    const { error: deleteError } = await supabase
      .from('lists')
      .delete()
      .eq('id', newList.id);
    
    if (deleteError) {
      console.error('Warning: Could not delete test list:', deleteError.message);
    } else {
      console.log('✅ Test list cleaned up successfully');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Also test if we can query lists table normally
async function testListsQuery() {
  try {
    console.log('\nTesting lists table query...');
    
    const { data: lists, error: queryError } = await supabase
      .from('lists')
      .select('id, title, category')
      .limit(5);
    
    if (queryError) {
      console.error('❌ Lists query failed:', queryError.message);
      return false;
    }
    
    console.log('✅ Lists query successful');
    console.log(`Found ${lists?.length || 0} lists`);
    return true;
    
  } catch (error) {
    console.error('❌ Lists query test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== LIST CREATION TEST SUITE ===\n');
  
  const queryTest = await testListsQuery();
  const createTest = await testListCreation();
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Lists Query Test: ${queryTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`List Creation Test: ${createTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (queryTest && createTest) {
    console.log('\n🎉 All tests passed! List creation is working properly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

runTests();