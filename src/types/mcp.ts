import type { Tool } from "@modelcontextprotocol/sdk/types";

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
 * Response type for attachment resources.
 * Returns metadata with local file path instead of blob content for efficient large file handling.
 */
export interface AttachmentResourceResponse {
  contents: Array<{
    uri: string;
    mimeType: string;
    /**
     * Local file path where the downloaded attachment can be read.
     * The file is downloaded to the resources directory relative to the MCP server executable.
     */
    text?: string;  // MCP resource format - JSON stringified metadata
  }>;
}

export class UnsupportedResourceError extends Error {
  constructor(uri: string) {
    super(`Unsupported resource type for URI: ${uri}`);
    this.name = 'UnsupportedResourceError';
  }
}