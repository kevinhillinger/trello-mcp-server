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