import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  apiRequest,
  errorResult,
  jsonResult,
  loadConfig,
  siteOriginFromApiBase,
} from "../client.js";

export function registerHealthTools(server: McpServer): void {
  server.registerTool(
    "grokforge_health",
    {
      title: "GrokForge Health",
      description:
        "Check GrokForge site health (GET {origin}/api/forge-health). If GROKFORGE_TOKEN is set, also calls GET /me. Origin is derived by stripping /api/v1 from GROKFORGE_API.",
      inputSchema: z.object({
        includeMe: z
          .boolean()
          .optional()
          .describe("If true (default when token present), also fetch /me"),
      }),
    },
    async ({ includeMe }) => {
      try {
        const config = loadConfig();
        const origin = siteOriginFromApiBase(config.apiBase);
        const healthUrl = `${origin}/api/forge-health`;
        const health = await apiRequest(healthUrl, { absoluteUrl: healthUrl }, config);

        const shouldMe = includeMe ?? Boolean(config.token);
        let me: unknown = undefined;
        if (shouldMe && config.token) {
          me = await apiRequest("/me", { requireAuth: true }, config);
        }

        return jsonResult(
          { origin, healthUrl, health, me: me ?? null, tokenConfigured: Boolean(config.token) },
          me
            ? "API and identity look reachable. Peek or claim work next."
            : "Health fetched. Set GROKFORGE_TOKEN to also verify identity.",
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
