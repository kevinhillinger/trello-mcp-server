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
import type { TrelloCredentials } from './types/trello.js';
import { createTrelloClient } from './trello/client.js';

export class TrelloServer {
  static serverInfo = {
    name: 'trello-mcp-server',
    version: '1.2.0',
  };

  private mcpServer: McpServer;
  private credentials: TrelloCredentials;

  constructor(credentials: TrelloCredentials) {
    this.credentials = credentials;
    this.mcpServer = new McpServer(
      TrelloServer.serverInfo,
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    createTrelloClient(this.credentials);
    this.setupHandlers();
  }

  private setupHandlers() {
    const server = this.mcpServer.server;

    server.setRequestHandler(InitializeRequestSchema, async (_request) => {
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: TrelloServer.serverInfo,
      };
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: listAttachmentResources(),
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      try {
        const type = getResourceType(uri);

        if (type === TrelloResourceType.fileAttachment) {
          return await handleAttachmentResource(uri, this.credentials.apiKey, this.credentials.token);
        }

        throw new Error(`Unsupported resource type: ${type}`);
      } catch (error) {
        throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Inject credentials into arguments
      const argsWithCredentials = {
        ...args,
        apiKey: this.credentials.apiKey,
        token: this.credentials.token
      };

      return await invokeToolCallback(name, argsWithCredentials);
    });
  }

  async connect(transport: Parameters<McpServer['connect']>[0]) {
    await this.mcpServer.connect(transport);
  }

  get server() {
    return this.mcpServer;
  }
}
