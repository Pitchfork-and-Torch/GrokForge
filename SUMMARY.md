# GrokForge - architecture summary

## Decisions

| Choice | Decision | Why |
|--------|----------|-----|
| Framework | Next.js 16 App Router + TypeScript | Fast full-stack, Vercel-ready |
| UI | Tailwind 4 + hand-rolled X/Grok dark chrome | High contrast, neon accents, no heavy UI kit lock-in |
| Database | **Neon Postgres** from day one | Operator request; serverless Postgres; Prisma schema portable |
| ORM | Prisma 5 | Stable Neon story; typed models |
| Auth | Auth.js (next-auth v5) Credentials | Demo **X OAuth stand-in** + email register/login; JWT sessions |
| Payments | Stripe Checkout when `STRIPE_SECRET_KEY` set; else **demo donate** writes ledger | Full loop without Stripe account |
| Keys policy | Never store user xAI / SuperGrok credentials | Platform integrity + ToS safety |
| Hierarchy | Task adjacency list (`parentId`) | Simple nested multi-agent trees |
| Transparency | `LedgerEntry` for LABOR / CAPITAL / MILESTONE | Public fund + work trail |

## Neon

- Project: `GrokForge` (`fancy-poetry-92960151`)
- Region: AWS us-east-1
- DB: `neondb` on branch `main`
- Connection: pooled URL in local `.env` (gitignored)

## Public repo

- https://github.com/Pitchfork-and-Torch/GrokForge (MIT)
- Release: see GitHub Releases / tags on `main`

## Phase status

### Phase 1 (done)

- Auth (X demo + email)
- Project CRUD with hierarchy
- List / filter / detail
- Claim + submit + manual peer review
- Seed: climate + public-goods software projects

### Phase 2 (done in MVP form)

- Fund pots + demo/Stripe donation path
- Public ledger
- Personal dashboard (projects, claims, donations, reputation, capacity)
- Project leaderboard + artifacts

### Phase 3 (shipped light)

- Basic open-task recommendations on dashboard
- 48h claim window + max 3 active claims/project
- Alignment pre-check on create
- Peer-review scoring
- **AI task decompose** via `POST /api/decompose` (platform `XAI_API_KEY` only; heuristic fallback)
- In-memory rate limits on create / submit / donate / decompose

## How X Vibe Chat can use it tomorrow

1. Clone / open `GrokForge`, set Neon `DATABASE_URL`, `npm run db:push && npm run db:seed && npm run dev`
2. Share https://grokforge.app (or local http://localhost:3000)
3. Members **Sign in with X** (real OAuth) or email fallback
4. One host proposes a hierarchical project; others claim leaf tasks
5. Each person runs Grok in their own client, pastes outputs back
6. Optional demo donations track sponsorship of API/compute pots
7. Everything shows on the public ledger for trust

## Production TODOs

### Done (shipped)

- [x] Real X OAuth app + production NEXTAUTH_URL (grokforge.app)
- [x] Stripe live Checkout + webhook
- [x] X Money P2P profile tips (deep-link + self-reported CAPITAL ledger; no bank API yet)
- [x] Grok-assisted task decomposition (`POST /api/decompose`, platform key)
- [x] Rate limiting on submit / donate / claim / creator mod (IP+user hash helpers)
- [x] Creator moderation + comment report queue on dashboard
- [x] Public GitHub hygiene (MIT, single commit, secret scan)

### Done (this backlog wave)

- [x] Milestone dual verification (human + agent/heuristic or XAI worker)
- [x] GitHub artifact linking (URL + optional AUTH_GITHUB_* OAuth)
- [x] Ship to GitHub for sealed packages (project creator or founder + `GITHUB_PUBLISH_TOKEN`; GitHub-ready ZIP for all)
- [x] Task matching scorer (category / watch / keywords / funding / recency)
- [x] X Money provider adapter (deeplink now; native mode env-gated when API exists)

### Done (agent API)

- [x] Personal access tokens (`ApiToken`, SHA-256 at rest, scopes, revoke, expiry)
- [x] REST `/api/v1` me / tasks / claim / release / submit
- [x] Dashboard **Agent API tokens** UI
- [x] Shared `task-ops` for browser actions + Agent API
- [x] Docs: `docs/AGENT-API.md`

### Later

- [ ] Native X Money third-party API fill-in when X ships credentials (adapter ready)
- [ ] Embeddings-based matching optional upgrade
- [ ] OpenAPI export + official Grok Build skill for Agent API (shipped; MCP Phase 1 in `packages/mcp-server`)
- [ ] MCP Phase 2: peer review / moderate / seal / heartbeat tools (stubs only today)
- [ ] Rotate Neon credentials if this machine's `.env` was ever shared

## Tests

```bash
npm test
```

Critical pure-path checks: slug/money helpers, claim capacity rule, alignment sketch.
Integration against live Neon is manual via DEMO.md loop.

## Production (2026-08-05+)

| Item | Value |
|------|--------|
| Canonical | https://grokforge.app |
| www | 308 → https://grokforge.app (except `/api/auth/*`) |
| Team / project | **grok-forge** Pro · project `grokforge` |
| DB | Neon Postgres (pooled `DATABASE_URL`) |
| Auth | X OAuth 2.0 primary (`AUTH_TWITTER_*`) + email fallback |
| Demo X | `ENABLE_DEMO_AUTH=false` in production |
| GitHub | https://github.com/Pitchfork-and-Torch/GrokForge |

### Auth notes (AccessDenied fix)

Auth.js calls `callbacks.signIn` **before** `createUser` on first OAuth login (temp UUID not in DB). Never `prisma.user.update` there on first-time X users - throws become `error=AccessDenied`. Enrich handle/avatar in `events.signIn` / `jwt` after the adapter creates the row.

## Deploy path

1. Push `main` (without `.env`) - linked Vercel Pro project builds
2. Env: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://grokforge.app`, `AUTH_URL`, `AUTH_TWITTER_ID`, `AUTH_TWITTER_SECRET`, optional `XAI_API_KEY` / Stripe
3. `prisma generate` in build; schema already on Neon
4. Seed: `npm run db:seed` against Neon when needed
5. Archive junk demos: `npx tsx scripts/archive-junk-projects.ts`
