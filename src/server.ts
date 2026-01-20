import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools, invokeToolCallback } from './tools/index.js';

export function createMCPServer() {
  const mcpServer = new McpServer(
    {
      name: 'trello-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  // Get underlying server for advanced request handlers
  const server = mcpServer.server;

  // Handle MCP initialization
  server.setRequestHandler(InitializeRequestSchema, async (_request) => {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: 'trello-mcp-server',
        version: '1.0.0',
      },
    };
  });

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle list resources request (required by MCP spec)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  // Handle list prompts request (required by MCP spec)
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await invokeToolCallback(name, args);
  });

  return mcpServer;
}
