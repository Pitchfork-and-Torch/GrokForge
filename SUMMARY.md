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

- https://github.com/Pitchfork-and-Torch/GrokForge (MIT, single-commit `main`)
- Release: `v1.0.0` (latest only)

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
2. Share http://localhost:3000 (or Vercel deploy URL)
3. Members **Sign in with X (Demo)** using their handles
4. One host proposes a hierarchical project; others claim leaf tasks
5. Each person runs Grok in their own client, pastes outputs back
6. Optional demo donations track sponsorship of API/compute pots
7. Everything shows on the public ledger for trust

## Production TODOs

- [ ] Real X OAuth app (Twitter provider) + production NEXTAUTH_URL
- [ ] Stripe live keys + webhook endpoint hardening
- [ ] X Money P2P by handle (when API available)
- [ ] Milestone release: dual human + multi-agent verification workers
- [ ] Grok-assisted task decomposition (server-side only, platform key)
- [ ] Rate limiting middleware (IP + user) on submit/donate
- [ ] Moderation queue UI for flagged projects
- [ ] GitHub OAuth artifact linking
- [ ] Matching model beyond open-task list (embeddings optional)
- [ ] Rotate Neon credentials if this machine's `.env` was ever shared
- [ ] Pitchfork-and-Torch public repo hygiene when publishing (MIT, one commit, secret scan)

## Tests

```bash
npm test
```

Critical pure-path checks: slug/money helpers, claim capacity rule, alignment sketch.
Integration against live Neon is manual via DEMO.md loop.

## Deploy path

1. Push repo (without `.env`)
2. Create Vercel project, set env: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, optional Stripe
3. `prisma db push` in build (`postinstall` or build script)
4. Seed once against production Neon (or a branch)
5. Optional: custom domain e.g. `grokforge.jonbailey.xyz`
