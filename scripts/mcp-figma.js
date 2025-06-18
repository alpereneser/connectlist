#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Figma API configuration
const FIGMA_API_BASE = 'https://api.figma.com/v1';
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN || 'figd_ZfIVPiissKghOUGi5TQBQIjqfrIQL6uynsM7C2O8';

console.error(`Starting Figma MCP Server...`);
console.error(`Token available: ${FIGMA_ACCESS_TOKEN ? 'Yes' : 'No'}`);

if (!FIGMA_ACCESS_TOKEN) {
  console.error('FIGMA_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

class FigmaMCPServer {
  constructor() {
    this.server = new Server(
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

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_figma_file',
            description: 'Get Figma file information and structure',
            inputSchema: {
              type: 'object',
              properties: {
                fileKey: {
                  type: 'string',
                  description: 'Figma file key from the URL',
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
                  description: 'Figma file key from the URL',
                },
              },
              required: ['fileKey'],
            },
          },
          {
            name: 'get_figma_styles',
            description: 'Get styles (colors, typography, effects) from a Figma file',
            inputSchema: {
              type: 'object',
              properties: {
                fileKey: {
                  type: 'string',
                  description: 'Figma file key from the URL',
                },
              },
              required: ['fileKey'],
            },
          },
          {
            name: 'export_figma_images',
            description: 'Export images from Figma nodes',
            inputSchema: {
              type: 'object',
              properties: {
                fileKey: {
                  type: 'string',
                  description: 'Figma file key from the URL',
                },
                nodeIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of node IDs to export',
                },
                format: {
                  type: 'string',
                  enum: ['jpg', 'png', 'svg', 'pdf'],
                  default: 'png',
                  description: 'Export format',
                },
                scale: {
                  type: 'number',
                  default: 1,
                  description: 'Export scale (1-4)',
                },
              },
              required: ['fileKey', 'nodeIds'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_figma_file':
            return await this.getFigmaFile(args.fileKey);
          case 'get_figma_components':
            return await this.getFigmaComponents(args.fileKey);
          case 'get_figma_styles':
            return await this.getFigmaStyles(args.fileKey);
          case 'export_figma_images':
            return await this.exportFigmaImages(
              args.fileKey,
              args.nodeIds,
              args.format || 'png',
              args.scale || 1
            );
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
  }

  async makeRequest(endpoint) {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
      headers: {
        'X-Figma-Token': FIGMA_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFigmaFile(fileKey) {
    const data = await this.makeRequest(`/files/${fileKey}`);
    
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
  }

  async getFigmaComponents(fileKey) {
    const data = await this.makeRequest(`/files/${fileKey}/components`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data.meta.components, null, 2),
        },
      ],
    };
  }

  async getFigmaStyles(fileKey) {
    const data = await this.makeRequest(`/files/${fileKey}/styles`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data.meta.styles, null, 2),
        },
      ],
    };
  }

  async exportFigmaImages(fileKey, nodeIds, format, scale) {
    const nodeIdsParam = nodeIds.join(',');
    const data = await this.makeRequest(
      `/images/${fileKey}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data.images, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma MCP server running on stdio');
  }
}

const server = new FigmaMCPServer();
server.run().catch(console.error); 