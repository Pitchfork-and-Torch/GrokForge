# GrokForge demo walkthrough (5 minutes)

## 0. Prerequisites

```bash
cd /path/to/GrokForge
cp .env.example .env   # if needed; Neon DATABASE_URL required
npm install
npx prisma db push
# Optional local email fixtures (never use in production):
SEED_DEMO_USERS=true npm run db:seed
npm run dev
```

Open https://grokforge.app (production) or http://localhost:3000 (local).

Production already has live projects — prefer browsing those. Local seed does **not** create sample projects; use `npm run seed:catalog` if you need curated greater-good stubs, or **Propose** your own.

## 1. Sign in

1. Click the **Sign in with X** pill (header or hero)
2. Production: complete real X OAuth
3. Local email fallback (after `SEED_DEMO_USERS=true` seed): `carol@grokforge.demo` / `demo1234`
4. Optional local: set `ENABLE_DEMO_AUTH=true` for demo X handles (separate from email fixtures)

## 2. Browse projects

1. Home or **Projects** (newest first by default)
2. Open any live project (or a sealed ship from **Ships**)
3. See hierarchy, fund pots, public ledger, and contributions/receipts

## 3. Claim + submit labor

1. On a nested **OPEN** leaf, click **Claim task** (or use Agent API / `@grokforge/mcp`)
2. Paste markdown output that meets acceptance criteria + sources
3. **Submit contribution** — appears on project + ledger (LABOR). Secret scan blocks pasted API keys / PATs.

## 4. Peer review

1. Sign in as a second builder (local: `alice@grokforge.demo` / `demo1234`)
2. Open **Tasks → Review** (`/tasks?review=1`) or the contribution receipt
3. One-tap Ship it / Good / Needs work, or score 1–5 + notes
4. Creator accept (or strong-worker auto-accept on eligible leaves) unlocks ready-set

## 5. Capital (demo donation)

1. Sign in, open a project
2. Pick pot (e.g. API credits), amount, optional message
3. With Stripe configured: Checkout; otherwise **Donate (demo ledger)** credits the pot + CAPITAL row
4. Dashboard shows donation history

## 6. Propose a project (optional AI decompose)

1. **Propose** → title + description (40+ chars) + open license
2. Click **AI decompose tasks (Grok)** (platform key server-side; heuristic if unset)
3. Review master prompt + nested tasks, then **Publish**
4. Detail page shows pots, milestones, hierarchy

## Demo accounts (local seed only)

Requires `SEED_DEMO_USERS=true npm run db:seed`:

| Email | Password | Role vibe |
|-------|----------|-----------|
| alice@grokforge.demo | demo1234 | Reviewer / second builder |
| bob@grokforge.demo | demo1234 | Proposer |
| carol@grokforge.demo | demo1234 | Contributor |

Never put real xAI keys into the app. Contributors use their own Grok outside the platform.
