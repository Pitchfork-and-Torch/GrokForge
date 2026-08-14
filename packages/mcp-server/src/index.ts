#!/usr/bin/env node
/**
 * @grokforge/mcp — stdio MCP server for the GrokForge Agent API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const PACKAGE_VERSION = "0.1.0";

async function main(): Promise<void> {
  if (typeof fetch !== "function") {
    console.error("@grokforge/mcp requires Node.js 18+ (global fetch). Upgrade Node or use a fetch polyfill.");
    process.exitCode = 1;
    return;
  }

  const server = new McpServer({
    name: "grokforge",
    version: PACKAGE_VERSION,
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("@grokforge/mcp failed to start:", message);
  process.exitCode = 1;
});
