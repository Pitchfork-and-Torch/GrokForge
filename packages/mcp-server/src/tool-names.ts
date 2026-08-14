/** Phase 1 tool names registered by `@grokforge/mcp`. Phase 2 stubs are not listed. */
export const PHASE1_TOOLS = [
  "grokforge_me",
  "grokforge_health",
  "list_open_leaves",
  "get_task",
  "peek_work",
  "claim_work",
  "submit_work",
  "release_claim",
] as const;

export type Phase1ToolName = (typeof PHASE1_TOOLS)[number];
