#!/usr/bin/env node

// Initialize logging first - this sets up file transport and console overrides
import './utils/logger.js';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createMCPServer } from './server.js';
import { invokeToolCallback } from './tools/index.js';

// Desktop-specific: Check for local credentials
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

// No console output in MCP mode - only JSON-RPC on stdout!
if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
  console.error('Error: TRELLO_API_KEY and TRELLO_TOKEN environment variables must be set.');
  console.error('Aborting.');
  process.exit(1);
}

// Create the MCP server using the shared factory
const mcpServer = createMCPServer();

// Override the tool handler to inject credentials from environment variables
mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Inject credentials into arguments
  const argsWithCredentials = {
    ...args,
    apiKey: TRELLO_API_KEY,
    token: TRELLO_TOKEN
  };
  
  // Use the shared handler with injected credentials
  return await invokeToolCallback(name, argsWithCredentials);
});

// Error handler
process.on('uncaughtException', (_error) => {
  process.exit(1);
});

process.on('unhandledRejection', (_reason) => {
  process.exit(1);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  
  // Server is running - no output needed
}

main().catch((_error) => {
  process.exit(1);
});