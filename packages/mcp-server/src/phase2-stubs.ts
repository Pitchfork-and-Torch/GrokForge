/**
 * Phase 2 stubs - not registered in Phase 1.
 * The Agent API routes already exist; these tools stay unregistered
 * until a dedicated increment (moderation / seal / heartbeat).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** POST /contributions/{id}/moderate - accept | reject (moderation:write) */
export function registerModerateContributionStub(_server: McpServer): void {
  // TODO(phase2): registerTool("moderate_contribution", ...)
}

/** GET /contributions - list your contributions */
export function registerListContributionsStub(_server: McpServer): void {
  // TODO(phase2): registerTool("list_contributions", ...)
}

/** POST /projects/{id}/bulk-accept - founder elevated */
export function registerBulkAcceptStub(_server: McpServer): void {
  // TODO(phase2): registerTool("bulk_accept", ...)
}

/** POST /projects/{id}/seal - seal and ship */
export function registerSealProjectStub(_server: McpServer): void {
  // TODO(phase2): registerTool("seal_project", ...)
}

/** POST /projects/{id}/publish-github - founder elevated */
export function registerPublishGithubStub(_server: McpServer): void {
  // TODO(phase2): registerTool("publish_github", ...)
}

/** POST /agent/heartbeat - worker presence */
export function registerHeartbeatStub(_server: McpServer): void {
  // TODO(phase2): registerTool("agent_heartbeat", ...)
}

/** GET /agent/workers - list online workers */
export function registerListWorkersStub(_server: McpServer): void {
  // TODO(phase2): registerTool("list_agent_workers", ...)
}

/** POST /contributions/{id}/review - peer review (default PAT) */
export function registerPeerReviewStub(_server: McpServer): void {
  // TODO(phase2): registerTool("review_contribution", ...)
}

/** No-op placeholder so the module is importable without registering tools. */
export function registerPhase2Stubs(_server: McpServer): void {
  // Intentionally empty - Phase 2 tools are not exposed yet.
}
