import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolCallback } from '../types/mcp.js';

import { cardTools } from './cards.js';
import { boardTools } from './boards.js';
import { listTools } from './lists.js';
import { memberTools } from './members.js';
import { searchTools } from './search.js';
import { labelTools } from './labels.js';
import { advancedTools } from './advanced.js';

// Combine all tool maps
const allToolMaps = [
  cardTools,
  boardTools,
  listTools,
  memberTools,
  searchTools,
  labelTools,
  advancedTools
];

// Build the tools array from all ExecutableTool maps
export const tools: Tool[] = allToolMaps.flatMap(toolMap =>
  Array.from(toolMap.values()).map(executableTool => executableTool.tool)
);

// Build the callbacks map from all ExecutableTool maps
export const callbacks: Map<string, ToolCallback> = new Map(
  allToolMaps.flatMap(toolMap =>
    Array.from(toolMap.entries()).map(([name, executableTool]) =>
      [name, executableTool.callback] as [string, ToolCallback]
    )
  )
);

/**
 * Invokes a tool callback by name with the provided arguments.
 * @param name - The name of the tool to invoke
 * @param args - The arguments to pass to the tool callback
 * @returns The result of the tool execution
 * @throws Error if the tool name is unknown
 */
export async function invokeToolCallback(name: string, args: unknown): Promise<ReturnType<ToolCallback>> {
  const callback = callbacks.get(name);

  if (!callback) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return await callback(args);
}

// Re-export the individual tool maps for direct access if needed
export { cardTools } from './cards.js';
export { boardTools } from './boards.js';
export { listTools } from './lists.js';
export { memberTools } from './members.js';
export { searchTools } from './search.js';
export { labelTools } from './labels.js';
export { advancedTools } from './advanced.js';
