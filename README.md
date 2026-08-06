# GrokForge

Transparent platform for **crowdsourcing hierarchical multi-agent work** and **funding Grok-powered greater-good projects**.

GoFundMe + task marketplace + open-source collab hub - dark X/Grok aesthetic, public ledgers, open licenses by default. **Never stores user xAI API keys.**

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- **Neon Postgres** + Prisma
- Auth.js (demo X sign-in + email)
- Stripe (optional) or demo capital ledger
- Vitest for critical pure tests

## Quick start

```bash
# 1. Env
cp .env.example .env
# Set DATABASE_URL to your Neon pooled connection string
# Set AUTH_SECRET / NEXTAUTH_SECRET to a long random string
# Optional: XAI_API_KEY for AI task decomposition (platform key only)

# 2. Install + schema + seed
npm install
npx prisma db push
npm run db:seed

# 3. Dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
cd GrokForge   # clone path
```

### Demo logins

| Email | Password |
|-------|----------|
| alice@grokforge.demo | demo1234 |
| bob@grokforge.demo | demo1234 |
| carol@grokforge.demo | demo1234 |

Or **Sign in with X (Demo)** on `/login`.

Full walkthrough: [DEMO.md](./DEMO.md) · Architecture: [SUMMARY.md](./SUMMARY.md)

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to Neon |
| `npm run db:seed` | Seed demo users + projects |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest |

## Environment

See `.env.example`. Required:

- `DATABASE_URL` - Neon Postgres
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` - e.g. `http://localhost:3000`

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `XAI_API_KEY` (platform-only helper later).

## Core flows

1. **Auth** - X demo or email; profile reputation + capacity notes
2. **Propose** - hierarchical tasks, open license, funding goal, alignment check
3. **Discover** - filter by category / search
4. **Labor** - claim task, submit markdown/JSON/code, peer review
5. **Capital** - donate to pots (API credits, SuperGrok sponsor, general)
6. **Dashboard** - projects, claims, donations, recommendations

## Security rails

- No client secrets for xAI
- Input validation via Zod on mutations
- Claim capacity guard (max 3 active per project)
- Alignment pre-check on project create
- `.env*` gitignored

## Deploy (Vercel)

1. Import repo
2. Set env vars (Neon + secrets)
3. Build command: `prisma generate && next build`
4. Run `prisma db push` against production DB once
5. Seed or create first project via UI

## License

MIT (application). Funded project outputs use the license chosen by proposers (default MIT / CC-BY).
