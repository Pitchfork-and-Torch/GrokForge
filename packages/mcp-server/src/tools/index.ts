import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMeTools } from "./me.js";
import { registerHealthTools } from "./health.js";
import { registerTaskTools } from "./tasks.js";
import { registerWorkTools } from "./work.js";

/** Register all Phase 1 GrokForge MCP tools. */
export function registerAllTools(server: McpServer): void {
  registerMeTools(server);
  registerHealthTools(server);
  registerTaskTools(server);
  registerWorkTools(server);
}

export { registerMeTools } from "./me.js";
export { registerHealthTools } from "./health.js";
export { registerTaskTools } from "./tasks.js";
export { registerWorkTools } from "./work.js";
