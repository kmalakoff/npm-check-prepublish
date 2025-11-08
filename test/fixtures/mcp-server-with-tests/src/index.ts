/**
 * Test MCP Server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export async function createMcpServer() {
  const server = new Server(
    {
      name: 'test-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Test message',
              },
            },
            required: ['message'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'test-tool') {
      const message = String(request.params.arguments?.message || '');
      return {
        content: [
          {
            type: 'text',
            text: `Echoing: ${message}`,
          },
        ],
      };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
