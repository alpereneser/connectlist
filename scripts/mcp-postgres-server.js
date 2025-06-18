#!/usr/bin/env node

/**
 * Supabase MCP PostgreSQL Server
 * This script creates an MCP server for Supabase PostgreSQL connection
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { Client } = require('pg');

// Get configuration from environment variables
const config = {
  host: process.env.POSTGRES_HOST || 'aws-0-us-east-1.pooler.supabase.com',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'postgres',
  user: process.env.POSTGRES_USER || 'postgres.ynbwiarxodetyirhmcbp',
  password: process.env.POSTGRES_PASSWORD || 'conn!*034',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.error('🚀 Starting Supabase MCP PostgreSQL Server...');
console.error('📊 Database:', config.database);
console.error('🌐 Host:', config.host);
console.error('👤 User:', config.user);

// Create PostgreSQL client
let client = null;

async function connectToDatabase() {
  try {
    client = new Client(config);
    await client.connect();
    console.error('✅ Connected to Supabase PostgreSQL');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    return false;
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'supabase-postgres',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query',
        description: 'Execute a PostgreSQL query on Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'The SQL query to execute'
            }
          },
          required: ['sql']
        }
      },
      {
        name: 'list_tables',
        description: 'List all tables in the public schema',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'describe_table',
        description: 'Get the structure of a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the table to describe'
            }
          },
          required: ['table_name']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!client) {
    const connected = await connectToDatabase();
    if (!connected) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Could not connect to database'
          }
        ]
      };
    }
  }

  try {
    switch (name) {
      case 'query': {
        const { sql } = args;
        const result = await client.query(sql);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                rows: result.rows,
                rowCount: result.rowCount,
                fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }))
              }, null, 2)
            }
          ]
        };
      }

      case 'list_tables': {
        const result = await client.query(`
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.rows, null, 2)
            }
          ]
        };
      }

      case 'describe_table': {
        const { table_name } = args;
        const result = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, [table_name]);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.rows, null, 2)
            }
          ]
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ]
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🎉 Supabase MCP Server is running!');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down MCP Server...');
  if (client) {
    await client.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 Terminating MCP Server...');
  if (client) {
    await client.end();
  }
  process.exit(0);
});

main().catch(console.error); 