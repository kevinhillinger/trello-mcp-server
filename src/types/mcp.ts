import type { Tool, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

// Simple callback type for tool handlers
export type ToolCallback = (args: unknown) => Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}>;

export interface ExecutableTool {
  tool: Tool,
  callback: ToolCallback
}

export enum TrelloResourceType {
  fileAttachment = 'fileAttachment',
}

/**
 * Response type for file attachment resources.
 * Uses the MCP SDK's ReadResourceResult type for proper compatibility.
 */
export type FileAttachmentResourceResult = ReadResourceResult;

export class UnsupportedResourceError extends Error {
  constructor(uri: string) {
    super(`Unsupported resource type for URI: ${uri}`);
    this.name = 'UnsupportedResourceError';
  }
}