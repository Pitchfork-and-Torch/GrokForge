import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest, errorResult, jsonResult, loadConfig } from "../client.js";

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    "list_open_leaves",
    {
      title: "List Open Leaves",
      description:
        "List open (or filtered) GrokForge tasks / leaves. GET /tasks?status=OPEN&project=&limit=. Token preferred (tasks:read).",
      inputSchema: {
        status: z.string().optional().describe("Task status filter (default OPEN)"),
        project: z.string().optional().describe("Optional project slug or id"),
        limit: z.number().int().positive().max(100).optional().describe("Max tasks to return (default 20)"),
      },
    },
    async ({ status, project, limit }) => {
      try {
        const config = loadConfig();
        const data = await apiRequest(
          "/tasks",
          {
            query: {
              status: status ?? "OPEN",
              project: project ?? undefined,
              limit: limit ?? 20,
            },
          },
          config,
        );
        return jsonResult(data, "Pick a taskId then get_task or claim_work.");
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "get_task",
    {
      title: "Get Task",
      description: "Fetch a single GrokForge task by id. GET /tasks/{taskId}",
      inputSchema: {
        taskId: z.string().describe("Task id"),
      },
    },
    async ({ taskId }) => {
      try {
        const config = loadConfig();
        const data = await apiRequest(`/tasks/${encodeURIComponent(taskId)}`, {}, config);
        return jsonResult(data, "If OPEN and ready, claim_work then submit_work. Use release_claim to abandon.");
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
