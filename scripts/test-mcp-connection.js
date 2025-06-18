#!/usr/bin/env node

/**
 * Test Supabase MCP Connection
 * This script tests the connection to Supabase via MCP
 */

const { Client } = require('pg');

// Supabase connection configuration
const SUPABASE_CONFIG = {
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ynbwiarxodetyirhmcbp',
  password: 'conn!*034',
  ssl: {
    rejectUnauthorized: false
  }
};

async function testConnection() {
  console.log('🔍 Testing Supabase PostgreSQL Connection...');
  console.log('📊 Database:', SUPABASE_CONFIG.database);
  console.log('🌐 Host:', SUPABASE_CONFIG.host);
  console.log('👤 User:', SUPABASE_CONFIG.user);
  
  const client = new Client(SUPABASE_CONFIG);
  
  try {
    console.log('\n⏳ Connecting to database...');
    await client.connect();
    console.log('✅ Successfully connected to Supabase!');
    
    // Test basic query
    console.log('\n🔍 Testing basic query...');
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ Query successful!');
    console.log('📋 Database Info:');
    console.log('   Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    
    // Test tables query
    console.log('\n📊 Checking available tables...');
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tablesResult.rows.length} tables in public schema:`);
    tablesResult.rows.forEach(row => {
      console.log(`   📋 ${row.table_name} (${row.table_type})`);
    });
    
    // Test profiles table specifically
    console.log('\n👤 Testing profiles table...');
    const profilesResult = await client.query('SELECT COUNT(*) as count FROM profiles');
    console.log(`✅ Profiles table has ${profilesResult.rows[0].count} records`);
    
    console.log('\n🎉 All tests passed! MCP connection is ready.');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('🔧 Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔚 Connection closed.');
  }
}

// Run the test
testConnection().catch(console.error); 