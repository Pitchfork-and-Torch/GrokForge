import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest, errorResult, jsonResult, loadConfig, peekWorkQuery } from "../client.js";
import { assertNoSecretLeak } from "../secrets.js";

export function registerWorkTools(server: McpServer): void {
  server.registerTool(
    "peek_work",
    {
      title: "Peek Work",
      description:
        "Peek the next ready OPEN leaf without claiming. GET /agent/work?project=. Uses args.projectSlug or GROKFORGE_DEFAULT_PROJECT. Query param is `project` (slug).",
      inputSchema: z.object({
        projectSlug: z
          .string()
          .optional()
          .describe("Project slug; falls back to GROKFORGE_DEFAULT_PROJECT"),
      }),
    },
    async ({ projectSlug }) => {
      try {
        const config = loadConfig();
        const slug = projectSlug ?? config.defaultProject;
        const data = await apiRequest(
          "/agent/work",
          { query: peekWorkQuery(slug), requireAuth: true },
          config,
        );
        return jsonResult(
          { projectSlug: slug ?? null, peek: data },
          "This did NOT claim. Call claim_work to take the leaf, or list_open_leaves to browse.",
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "claim_work",
    {
      title: "Claim Work",
      description:
        "Claim a GrokForge leaf. If taskId is set: POST /tasks/{taskId}/claim. " +
        "If projectSlugs (or action cycle/claim with multi-project) is set: POST /agent/worker. " +
        "Otherwise prefer POST /agent/work with { projectSlug?, taskId? }. Requires claims:write.",
      inputSchema: z.object({
        taskId: z.string().optional().describe("Specific task to claim"),
        projectSlug: z.string().optional().describe("Single project slug"),
        projectSlugs: z
          .array(z.string())
          .optional()
          .describe("Multi-project allowlist; uses POST /agent/worker"),
        action: z
          .enum(["claim", "cycle"])
          .optional()
          .describe("Worker action when using /agent/worker (default claim)"),
        useWorker: z
          .boolean()
          .optional()
          .describe("Force POST /agent/worker instead of /agent/work"),
      }),
    },
    async ({ taskId, projectSlug, projectSlugs, action, useWorker }) => {
      try {
        const config = loadConfig();
        const slug = projectSlug ?? config.defaultProject;

        // Explicit task claim endpoint
        if (taskId && !useWorker && !projectSlugs?.length) {
          const data = await apiRequest(
            `/tasks/${encodeURIComponent(taskId)}/claim`,
            { method: "POST", requireAuth: true, body: {} },
            config,
          );
          return jsonResult(data, "Claimed via /tasks/{id}/claim. Do the work, then submit_work. release_claim to abandon.");
        }

        const preferWorker = Boolean(useWorker || (projectSlugs && projectSlugs.length > 0));
        if (preferWorker) {
          const data = await apiRequest(
            "/agent/worker",
            {
              method: "POST",
              requireAuth: true,
              body: {
                action: action ?? "claim",
                projectSlug: slug,
                projectSlugs,
                taskId,
              },
            },
            config,
          );
          return jsonResult(data, "Claim/cycle via /agent/worker. Submit with submit_work when done.");
        }

        const data = await apiRequest(
          "/agent/work",
          {
            method: "POST",
            requireAuth: true,
            body: { projectSlug: slug, taskId },
          },
          config,
        );
        return jsonResult(data, "Claimed via POST /agent/work. Follow submitHint, then submit_work.");
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "submit_work",
    {
      title: "Submit Work",
      description:
        "Submit a deliverable for a claimed task. POST /tasks/{taskId}/submit. " +
        "Rejects bodies that look like xAI/model API keys or raw gf_ PATs. Never send SuperGrok keys.",
      inputSchema: z.object({
        taskId: z.string().describe("Claimed task id"),
        body: z.string().min(20).describe("Deliverable body (markdown/code/text)"),
        sources: z.string().optional().describe("Optional sources / citations"),
        contentType: z
          .string()
          .optional()
          .describe("Content type hint (markdown, json, agent/markdown;model=..., ...)"),
      }),
    },
    async ({ taskId, body, sources, contentType }) => {
      try {
        assertNoSecretLeak(body);
        if (sources) assertNoSecretLeak(sources);
        const config = loadConfig();
        const payload: Record<string, string> = { body };
        if (sources !== undefined) payload.sources = sources;
        if (contentType !== undefined) payload.contentType = contentType;
        const data = await apiRequest(
          `/tasks/${encodeURIComponent(taskId)}/submit`,
          { method: "POST", requireAuth: true, body: payload },
          config,
        );
        return jsonResult(data, "Submitted. Wait for moderation or peek_work for the next leaf.");
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "release_claim",
    {
      title: "Release Claim",
      description: "Release your claim on a task. POST /tasks/{taskId}/release",
      inputSchema: z.object({
        taskId: z.string().describe("Task id to release"),
      }),
    },
    async ({ taskId }) => {
      try {
        const config = loadConfig();
        const data = await apiRequest(
          `/tasks/${encodeURIComponent(taskId)}/release`,
          { method: "POST", requireAuth: true, body: {} },
          config,
        );
        return jsonResult(data, "Claim released. peek_work or list_open_leaves for other tasks.");
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
