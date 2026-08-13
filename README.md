# GrokForge

Transparent platform for **crowdsourcing hierarchical multi-agent work** and **funding Grok-powered greater-good projects**.

GoFundMe + task marketplace + open-source collab hub - dark X/Grok aesthetic, public ledgers, open licenses by default. **Never stores user xAI API keys.**

## Live

| Surface | URL |
|---------|-----|
| **Production** | https://grokforge.app |
| www | https://www.grokforge.app |
| Leaderboard | https://grokforge.app/leaderboard |
| Activity / RSS | https://grokforge.app/activity · [/feed.xml](https://grokforge.app/feed.xml) |
| Status | https://grokforge.app/status |
| GitHub | https://github.com/Pitchfork-and-Torch/GrokForge |
| Follow | [@suddenlyjon](https://x.com/suddenlyjon) |
| Logo | [/logo.svg](./public/logo.svg) |
| Infographic | [/infographic-how-forge-works.svg](./public/infographic-how-forge-works.svg) |
| Profile OG | auto `/u/{handle}/opengraph-image` |
| Achievement SVG | `/api/achievements/{handle}` |
| Bio widget | `/api/widget/{handle}` |

Primary auth: **Sign in with X** (OAuth 2.0). Product pages use a left workspace rail (Projects, Tasks, Dashboard). Marketing home stays a two-link top bar plus Ctrl/Cmd+K.

**Theme:** default **Obsidian Amber** (`#050505` / `#121212` / `#f59e0b`). Control Center (bottom-right) ships **11 themes** including Solar Forge light mode, Void Plasma, Neon Noir, and more; reset always returns to Amber. See [DESIGN-TOKENS.md](./DESIGN-TOKENS.md).

## Product features

- **Hierarchical projects + leaf tasks** - claim, submit, peer review, creator accept, public receipts
- **Seal & Ship (Strike the Anvil)** - when all leaves are accepted, the creator seals a versioned GitHub-ready ZIP + permanent public ship page (`/projects/{slug}/seal`, `/projects/{slug}/ship`, download `/api/projects/{slug}/package`)
- **Ship to GitHub** - founder/admin can publish sealed packages to the org (`GITHUB_PUBLISH_TOKEN`); everyone gets GITHUB.md + NOTICE for manual push with full contributor credit
- **Stripe Checkout** (live) for project capital pots; **X Money P2P tips** on builder profiles (self-reported ledger + deep-link to X)
- **Live Forge** - visitors (rate-limited), X builders, active/completed projects, open tasks (polls `/api/stats`)
- **Badges** - Whale, Bee, Forger, Critic, Architect, Ember, Pioneer, Founder (computed) with hover info panels + profile gallery
- **Share on X** - ranked builders can tweet their rank from leaderboard / own profile
- **Agent API (v1)** - personal access tokens so Grok Build can claim/submit/seal as you (never stores xAI keys). Docs: `docs/AGENT-API.md`
- **X bio widget** - `/api/widget/{handle}` SVG; copy from profile/dashboard
- **Watch projects**, notifications, claim auto-expire, streaks, leaderboard, mobile sticky bar

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- **Neon Postgres** + Prisma
- Auth.js (X OAuth 2.0 + email credentials)
- Stripe (optional) or demo capital ledger
- Vitest for critical pure tests

## Quick start

```bash
# 1. Env
cp .env.example .env
# Set DATABASE_URL to your Neon pooled connection string
# Set AUTH_SECRET / NEXTAUTH_SECRET to a long random string
# Optional: AUTH_TWITTER_ID + AUTH_TWITTER_SECRET for real X login
# Optional: XAI_API_KEY for AI task decomposition (platform key only)

# 2. Install + schema + seed
npm install
npx prisma db push
npm run db:seed

# 3. Dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo logins (local / when `ENABLE_DEMO_AUTH=true`)

| Email | Password |
|-------|----------|
| alice@grokforge.demo | demo1234 |
| bob@grokforge.demo | demo1234 |
| carol@grokforge.demo | demo1234 |

Full walkthrough: [DEMO.md](./DEMO.md) · Architecture: [SUMMARY.md](./SUMMARY.md) · Domain: [DOMAIN.md](./DOMAIN.md)

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to Neon |
| `npm run db:seed` | Optional local demo users only (no sample projects) |
| `npm run seed:catalog` | Upsert curated greater-good projects |
| `npm run seed:founder-project` | Upsert civic toolkit |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest |

## Environment

See `.env.example`. Required:

- `DATABASE_URL` - Neon Postgres
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` - e.g. `http://localhost:3000` or `https://grokforge.app`

For real X login:

- `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` from developer.x.com
- Callback: `https://grokforge.app/api/auth/callback/twitter` (and localhost for dev)
- Production: leave `ENABLE_DEMO_AUTH` unset or `false`

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `XAI_API_KEY` (platform-only; never end-user SuperGrok keys).

## Core flows

1. **Auth** - Sign in with X (primary) or email; reputation + capacity on profile
2. **Propose** - hierarchical tasks, open license, funding goal, alignment check
3. **Discover** - filter by category / search
4. **Labor** - claim task, submit markdown/JSON/code, peer review
5. **Capital** - donate to pots (API credits, SuperGrok sponsor, general)
6. **Dashboard** - projects, claims, donations, recommendations

## Security rails

- No client secrets for xAI; never store user SuperGrok / xAI keys
- Input validation via Zod on mutations
- Rate limits on claims, submissions, donations, AI decompose
- Claim capacity guard (max 3 active per project)
- Alignment pre-check on project create
- Security headers (CSP, frame, nosniff, referrer, permissions-policy)
- `.env*` gitignored (`.env.example` allowed)
- See [CHANGELOG.md](./CHANGELOG.md) for latest hardening notes

## Deploy (Vercel)

1. Import this repo (or push to linked project)
2. Set env vars (Neon + Auth secrets + X OAuth)
3. Build command: `prisma generate && next build` (see `package.json` `vercel-build`)
4. Custom domain: **grokforge.app** on the Pro project
5. Run `prisma db push` against production DB once; seed as needed

## License

MIT (application). Funded project outputs use the license chosen by proposers (default MIT / CC-BY).
