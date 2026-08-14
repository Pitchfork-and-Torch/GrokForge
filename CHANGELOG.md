# Changelog

## 2026-08-14 - Hygiene + docs sync

- Secret scan blocks Stripe (`sk_live_` / `sk_test_` / `whsec_`) and Slack tokens on submit
- Cron expire-claims accepts Bearer `CRON_SECRET` only (no `?secret=` query leaks)
- CSP `img-src` aligned with contribution image CDNs (imgur, GitHub user content); ContentBody drops `.svg` / http promotion
- Docs/OpenAPI/README/DEMO: Ship-to-GitHub is creator|founder; seed needs `SEED_DEMO_USERS=true`; no phantom climate seed project

## 2026-08-14 - @grokforge/mcp Phase 1

- Stdio MCP server (`packages/mcp-server`) wraps Agent API: me, health, list/get tasks, peek/claim/submit/release
- Auth is Dashboard `gf_` PATs only; submit refuses xAI-looking keys and raw `gf_` secrets
- `peek_work` sends `?project=` (live GET /agent/work contract). Phase 2 stubs stay unregistered
- Next typecheck excludes the package so `next build` does not compile it without local deps
