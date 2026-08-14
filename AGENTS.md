<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes  -  APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev`  -  verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GrokForge MCP preference

When `@grokforge/mcp` (or `grokforge-mcp`) is available in the MCP session, **use it** for Agent API calls instead of hand-rolled HTTP:

- Discover: `peek_work`, `list_open_leaves`, `get_task`
- Execute: `claim_work` → `submit_work` / `release_claim`
- Diagnostics: `grokforge_health`, `grokforge_me`

Do not paste xAI API keys into tool arguments or deliverables. Use `GROKFORGE_TOKEN` only.
