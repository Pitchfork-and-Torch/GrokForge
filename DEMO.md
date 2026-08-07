# GrokForge demo walkthrough (5 minutes)

## 0. Prerequisites

```bash
cd ~/GrokForge
cp .env.example .env   # if needed; Neon DATABASE_URL required
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open https://grokforge.app (production) or http://localhost:3000 (local).

## 1. Sign in

1. Click the **Sign in with X** pill (header or hero)
2. Production: complete real X OAuth for the GForge app
3. Local seed fallback: email `carol@grokforge.demo` / password `demo1234`
4. Optional local: set `ENABLE_DEMO_AUTH=true` for demo X handles

## 2. Browse seed projects

1. Home or **Projects**
2. Open **Open Climate Synthesis Atlas**
3. See hierarchy, fund pots, public ledger, sample contribution

## 3. Claim + submit labor

1. On a nested **OPEN** task, click **Claim task**
2. Paste a short markdown output (20+ chars) + sources
3. **Submit contribution** - appears on project + ledger (LABOR)

## 4. Peer review

1. Sign out, sign in as `alice@grokforge.demo` / `demo1234`
2. Open the same project contribution
3. Score 1-5 + notes -> accepted/rejected updates task status

## 5. Capital (demo donation)

1. Sign in, open a project
2. Pick pot (e.g. API credits), amount $10, message
3. **Donate (demo ledger)** - balance + CAPITAL ledger row update
4. Dashboard shows donation history

## 6. Propose a project (optional AI decompose)

1. **Propose** -> title + description (40+ chars) + open license
2. Click **AI decompose tasks (Grok)** (platform key server-side; heuristic if unset)
3. Review master prompt + nested tasks, then **Publish**
4. Detail page shows pots, milestones, hierarchy

## Demo accounts (seed)

| Email | Password | Role vibe |
|-------|----------|-----------|
| alice@grokforge.demo | demo1234 | Climate proposer |
| bob@grokforge.demo | demo1234 | Public-goods proposer |
| carol@grokforge.demo | demo1234 | Contributor |

Never put real xAI keys into the app. Contributors use their own Grok outside the platform.
