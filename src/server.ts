import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools, invokeToolCallback } from './tools/index.js';
import { handleAttachmentResource, listAttachmentResources, getResourceType } from './resources/index.js';
import { TrelloResourceType } from './types/mcp.js';

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
      resources: listAttachmentResources(),
    };
  });

  // Handle resource read requests - download attachment files on-demand
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    // Get credentials from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;

    if (!apiKey || !token) {
      throw new Error('TRELLO_API_KEY and TRELLO_TOKEN environment variables must be set');
    }

    try {
      const type = getResourceType(uri);

      if (type === TrelloResourceType.fileAttachment) {
        return await handleAttachmentResource(uri, apiKey, token);
      }

      throw new Error(`Unsupported resource type: ${type}`);
    } catch (error) {
      throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
