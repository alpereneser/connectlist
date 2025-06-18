#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');

// Figma API configuration
const FIGMA_API_BASE = 'https://api.figma.com/v1';
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN || 'figd_ZfIVPiissKghOUGi5TQBQIjqfrIQL6uynsM7C2O8';

console.error('Starting Figma MCP Server...');
console.error(`Token: ${FIGMA_ACCESS_TOKEN ? 'Available' : 'Missing'}`);

const server = new Server(
  {
    name: 'figma-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'get_figma_file',
        description: 'Get Figma file information',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: {
              type: 'string',
              description: 'Figma file key from URL',
            },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'get_figma_components',
        description: 'Get components from a Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: {
              type: 'string',
              description: 'Figma file key from URL',
            },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'get_figma_styles',
        description: 'Get styles from a Figma file',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: {
              type: 'string',
              description: 'Figma file key from URL',
            },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'test_figma_connection',
        description: 'Test Figma API connection',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'test_figma_connection':
        return {
          content: [
            {
              type: 'text',
              text: `Figma MCP Server is working!\nToken: ${FIGMA_ACCESS_TOKEN ? 'Available' : 'Missing'}`,
            },
          ],
        };
      
      case 'get_figma_file':
        const fetch = require('node-fetch');
        const response = await fetch(`${FIGMA_API_BASE}/files/${args.fileKey}`, {
          headers: {
            'X-Figma-Token': FIGMA_ACCESS_TOKEN,
          },
        });

        if (!response.ok) {
          throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: data.name,
                lastModified: data.lastModified,
                version: data.version,
                pages: data.document.children.map(page => ({
                  id: page.id,
                  name: page.name,
                  type: page.type,
                })),
              }, null, 2),
            },
          ],
        };

      case 'get_figma_components':
        const fetchComp = require('node-fetch');
        const responseComp = await fetchComp(`${FIGMA_API_BASE}/files/${args.fileKey}/components`, {
          headers: {
            'X-Figma-Token': FIGMA_ACCESS_TOKEN,
          },
        });

        if (!responseComp.ok) {
          throw new Error(`Figma API error: ${responseComp.status} ${responseComp.statusText}`);
        }

        const dataComp = await responseComp.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataComp.meta.components, null, 2),
            },
          ],
        };

      case 'get_figma_styles':
        const fetchStyles = require('node-fetch');
        const responseStyles = await fetchStyles(`${FIGMA_API_BASE}/files/${args.fileKey}/styles`, {
          headers: {
            'X-Figma-Token': FIGMA_ACCESS_TOKEN,
          },
        });

        if (!responseStyles.ok) {
          throw new Error(`Figma API error: ${responseStyles.status} ${responseStyles.statusText}`);
        }

        const dataStyles = await responseStyles.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataStyles.meta.styles, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Figma MCP server running on stdio');
}

main().catch(console.error); 