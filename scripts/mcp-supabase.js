#!/usr/bin/env node

/**
 * Supabase MCP Server Starter
 * This script starts the MCP server for Supabase PostgreSQL connection
 */

const { spawn } = require('child_process');
const path = require('path');

// Supabase connection configuration
const SUPABASE_CONFIG = {
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ynbwiarxodetyirhmcbp',
  password: 'conn!*034',
  poolMode: 'session'
};

// Build connection string with URL encoding for special characters
const encodedPassword = encodeURIComponent(SUPABASE_CONFIG.password);
const connectionString = `postgresql://${SUPABASE_CONFIG.user}:${encodedPassword}@${SUPABASE_CONFIG.host}:${SUPABASE_CONFIG.port}/${SUPABASE_CONFIG.database}`;

console.log('🚀 Starting Supabase MCP Server...');
console.log('📊 Database:', SUPABASE_CONFIG.database);
console.log('🌐 Host:', SUPABASE_CONFIG.host);
console.log('👤 User:', SUPABASE_CONFIG.user);
console.log('🔗 Pool Mode:', SUPABASE_CONFIG.poolMode);

// Start MCP server
const mcpServer = spawn('npx', [
  '@modelcontextprotocol/server-postgres',
  connectionString
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    POSTGRES_CONNECTION_STRING: connectionString,
    MCP_SERVER_NAME: 'supabase-postgres',
    MCP_SERVER_DESCRIPTION: 'Supabase PostgreSQL Database Connection'
  }
});

mcpServer.on('error', (error) => {
  console.error('❌ MCP Server Error:', error);
  process.exit(1);
});

mcpServer.on('close', (code) => {
  console.log(`🔚 MCP Server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP Server...');
  mcpServer.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating MCP Server...');
  mcpServer.kill('SIGTERM');
}); 