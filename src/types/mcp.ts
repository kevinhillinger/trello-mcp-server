import type { Tool, ReadResourceResult, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Custom callback type for our tool implementations.
 * Takes args as input and returns a CallToolResult.
 */
export type ToolCallback = (args: unknown) => Promise<CallToolResult>;

export interface ExecutableTool {
  definition: Tool,
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