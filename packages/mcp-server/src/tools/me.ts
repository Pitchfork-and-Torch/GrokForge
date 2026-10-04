import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest, errorResult, jsonResult, loadConfig } from "../client.js";

export function registerMeTools(server: McpServer): void {
  server.registerTool(
    "grokforge_me",
    {
      title: "GrokForge Me",
      description:
        "Return the current GrokForge token identity (user + scopes). Requires GROKFORGE_TOKEN. GET /me",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const config = loadConfig();
        const data = await apiRequest("/me", { requireAuth: true }, config);
        return jsonResult(data, "Use scopes to decide which claim/submit tools you can call.");
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
