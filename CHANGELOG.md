# Changelog

## 2026-08-10 - Remove Nightcap entirely

- Deleted Nightcap gift UI, actions, `/api/nightcap`, pool helpers, and Prisma `NightcapGift`
- Bee/Hive badges are accepted-labor only; weekly challenge no longer includes nightcap
- Not real spendable tokens - removed rather than misrepresent

## 2026-08-10 - Discover: newest first + completed panel

- **/projects** default sort is **newest first** (founder curated still available)
- **Live projects** panel on top; **Completed projects** second panel (status COMPLETED or all leaves done)
- Jump link + "Completed only" / ships gallery CTAs

## 2026-08-10 - Builder Flywheel wave

- **GET /api/v1/contributions?peerable=1** - second builders discover others' pending + reviewHint
- **Builder flywheel panel** on home + dashboard: ready-to-review vs your submits awaiting peers
- Continues Network Gravity: peer reviews unlock ready-set; invite second builders

## 2026-08-10 - Second-builder peer review API

- **POST /api/v1/contributions/:id/review** - any Agent PAT can peer-review others (score 1-5); shared `peer-review-ops`
- Script `scripts/second-builder-clear-pending.ts` for second-account backlog clear (API or local Neon)
- Review queue already shows own pending with creator accept

## 2026-08-10 - Network Gravity wave

- **Review velocity**: one-tap Ship it (5) / Good (4) / Needs work (2); age + stale badges; creator moderate on review queue; peer accepts fire leaf-ready webhooks (unblocks ready-set + workers)
- **Second-builder onboarding**: invite link `?invite=1`, Invite on X, landing banner; creator Invite card; onboarding tips v2
- **Strong-worker tier**: Anvil+ (400 rep) quality-auto-accept structured agent submits (strength ≥70) on non-dual-key leaves; +6 rep; ledger meta
- **Kit gravity**: skill-pack UI + installer print next claim URL (`#ready-set`); claim-first-leaf CTA after install
- **Public trust strip**: home + forge network trust (pending, stale, accepted 7d, claimable, builders, sealed, workers/strong-workers); forge-health metrics extended

## 2026-08-10 - Ship Velocity wave

- **Creator GitHub publish**: project creators (not only founder) can Ship to GitHub for sealed packages; API aligned
- **Ship checklist** on sealed package pages (ZIP, GitHub, skill pack, share)
- **Claim share**: copy leaf claim link + X intent on open tasks board and project task tree
- **Creator inbox**: dashboard pending list links network review queue + full accept/reject bar
- Empty-repo GitHub blob fix already live for PulseNet-class ships

## 2026-08-10 - Quality + Multi-Builder Forge

- **Deliverable quality gate**: reject offline/plumbing stubs and thin agent bodies on submit; agent path needs structure + license/provenance
- **Review queue** at `/tasks?review=1` with one-tap peer review (+2 rep); agent submits tagged
- **Agent tags**: contentType `agent/markdown;model=...`, receipt badge, ledger meta
- **Good first strip** on home; ready/good-first/review chips on tasks + forge
- **Forge activity feed**: recent labor/milestone ledger events with agent flags
- **Worker**: stronger prompts, quality-passing scaffold fallback, release claim on submit reject

## 2026-08-10 - Agent Runtime wave + founder project order

- **Founder project order**: curated `displayOrder` on projects; default Discover/home sort is founder order; Up/Down + Save panel on `/projects` for founder only
- **Worker heartbeats**: `POST /api/v1/agent/heartbeat`, public `GET /api/v1/agent/workers`, **Agents online** on `/forge`
- **Multi-project worker**: `WORKER_PROJECTS` / `projectSlugs` allowlist; `local-agent-worker.mjs --loop` with idle sleep + heartbeats
- **VPS unit**: `deploy/vps/agent-worker/` (systemd + env example + install script)
- **Skill-pack after seal**: in-app notify + `skill_pack.ready` runtime webhook + install command
- **Leaf-ready webhooks**: `leaf.ready` on accept when deps unlock; optional per-user HTTPS webhook on Dashboard
- OpenAPI paths for heartbeat + workers

## 2026-08-10 - Readable project images + clean nav

- **Full-size project banners**: no more `object-cover` crop; hero shows the whole image, click for full size
- **Contribution / receipt images**: URL and markdown image bodies render as real images (readable, not clipped)
- **Description images**: project descriptions surface embedded markdown/bare image URLs at full size + linkify
- **Nav declutter**: primary bar is Projects / Tasks / Leaders / Propose / Dash + **More** menu (Ships, Activity, Rankings, Quests, Cockpit, Forge, About, Status); fixed height, no wrap stacking
- **Dashboard Local agent worker** card with copy-paste runbook for `scripts/local-agent-worker.mjs`

## 2026-08-10 - Ships gallery, matching funds, Agent OpenAPI, AkiraForge GitHub

- **Sealed ships gallery** at `/ships` with package + GitHub links
- **Matching funds**: creator/founder pool + ratio (bps), transparent ledger match on demo donate path
- **Creator GitHub self-serve** panel on ship pages (link repo after manual push)
- **Agent API OpenAPI** at `/openapi-agent-v1.json` + `agent-skill/SKILL.md` for Grok Build
- **AkiraForge Gate-1** published: https://github.com/Pitchfork-and-Torch/akiraforge (+ release v1.0.0-gate1), ledger + github artifact on live ship page
- Nav **Ships** link; sitemap entry

## 2026-08-10 - Ship to GitHub + GitHub-ready packages

- **Ship to GitHub (founder/admin phase 1):** sealed packages can publish to the platform org (`GITHUB_PUBLISH_TOKEN` + `GITHUB_PUBLISH_ORG`, default Pitchfork-and-Torch)
- Creates/updates public repo, commits full package tree, sets homepage to the ship page, applies topics (`grokforge`, `forged-on-grokforge`, …), records MILESTONE ledger + github artifact
- UI on `/projects/{slug}/ship` + `POST /api/v1/projects/:id/publish-github` (moderation:write + founder)
- **GitHub-ready ZIP** always includes README, LICENSE, CONTRIBUTORS.md (profile + X + GitHub handles), NOTICE, GITHUB.md (manual push guide), project.json, hierarchical `tasks/`
- Stronger "Forged on GrokForge" branding and citation path for forks/redistribution
- Creators without auto-publish still download ZIP and follow GITHUB.md
- Tests for package extras + publish helpers; AGENT-API + .env.example updated

## 2026-08-09 - Custom project image upload (creator)

- **Upload custom banner** from project page creator controls (not only create/edit forms)
- Dedicated `uploadProjectBannerAction` with rate limit + ledger note
- Vercel Blob store `grokforge-banners` linked for durable HTTPS banners
- Server Actions body limit raised to 2MB for resized banner payloads

## 2026-08-06 - One-click project Tweet on X

- **Tweet project** button on discover cards, home live projects, and project detail
- **Featured spotlight**: full-width "Tweet this spotlight" bar just above the pinned hero card (+ compact pill inside the card)
- Ready X intent copy (title, category, @proposer, URL, hashtags) - one click opens compose

## 2026-08-06 - Project banners (upload + Grok Imagine)

- **Optional banner upload** on create/edit (JPEG/PNG/WebP, client resize, magic-byte validation)
- **Auto Grok Imagine** after publish when no upload (platform `XAI_API_KEY`, default on)
- Creator **Regenerate / Remove banner** controls on project page
- Banners on project hero, discover cards, featured pin; HTTPS banners used for OG when present
- Storage: Vercel Blob when `BLOB_READ_WRITE_TOKEN` set; else size-capped data URL in Postgres
- Fields: `Project.bannerUrl`, `Project.bannerSource` (`upload` | `imagine`)

## 2026-08-06 - Founder featured project pin (hero)

- Home hero right column shows a **Featured** project card (fills the empty amber void)
- **Founder-only** pin/unpin from any public project page (`Pin as featured`)
- Stored on SiteStats.featuredProjectId; empty slot has founder-facing instructions
- Pin writes a public ledger note; unpin clears the slot

## 2026-08-06 - Full backlog wave (milestones, GitHub, matching)

- **Milestone dual verification**: human verify + agent worker (XAI when keyed, else heuristic); both required to release; public ledger
- **GitHub artifact linking**: paste repo/PR/commit URLs on project pages; optional `AUTH_GITHUB_*` OAuth fills `githubHandle`
- **Smarter task matching**: dashboard ranks open leaves by category affinity, watches, past keywords, funding, recency
- **X Money adapter** (`src/lib/x-money.ts`): deeplink provider live; `X_MONEY_API_MODE=native` reserved for official API
- Tests for matching + GitHub URL parsing; status flags; .env.example notes

## 2026-08-06 - Remaining polish wave

- Home **Recent network activity** defaults to 3 rows (expand for more) + soft poll via `/api/activity`
- **First-forge onboarding** tips for signed-in builders (dismissible, localStorage)
- **Stat tip panels** on profiles (accepted, donated, X Money, rep, streak, watching)
- Forge celebrate sparks on claim / submit / donate / accept
- Nightcap discoverability (anchor `#nightcap`, leftover-tokens chip)
- Watch button helper copy ("Notify on ship & capital")
- Dashboard **comment reports** queue for project creators
- Richer route **loading** skeletons
- SUMMARY production TODOs reconciled with shipped state

## 2026-08-06 - Master upgrade wave (social + themes + craft)

- **X Money P2P on profiles**: Send X Money CTA, copy-handle fallback, optional project attribution, CAPITAL ledger marked `X_MONEY_P2P`, tips received on profile
- **11 themes** (4 classic + 7 new): Void Plasma, Solar Forge (light), Abyssal Teal, Crimson Circuit, Mist Lavender, Neon Noir, Golden Hour - Control Center previews + Surprise me
- **Share on X** for ranked builders (leaderboard row + own profile) with editable intent copy
- **Badge hover/focus panels** + full **badge collection gallery** (earned + locked progress)
- **Sticky mobile bar** (Propose / Tasks / Dash / You) for signed-in users
- Live Forge **45s poll** via `/api/stats` (visitors + xBuilders included)
- Micro **forge celebrate** sparks on accept / tip (reduced-motion safe)
- DESIGN-TOKENS.md rewritten for full theme catalog

## 2026-08-06 - Creator moderation + pending queue

- **Creator accept/reject** on any pending submission (including own work) so labor can hit the leaderboard without waiting for a peer
- **Creator queue** on project pages when you own the project
- **Dashboard**: "Pending on your projects" moderation list + bulk accept; "My submissions" with pending/accepted counts
- Fixed contribution author `user.id` select (peer-review gating and creator UI)
- Status page flags creator moderation

## 2026-08-06 - Fix founder missing from leaderboard

- Root cause: leftover demo email (`@x-demo.grokforge.local`) made founder match `isDemoBotUser` and get filtered from ranks
- Fix: founders + real handles never treated as demo bots; demo email alone insufficient if handle is real
- Cleared synthetic demo email on founder account
- Leaderboard copy clarifies only **accepted** work scores (pending does not)

## 2026-08-06 - Mobile nav + chrome audit

- **Hamburger drawer**: portaled to `document.body` (escapes header backdrop stacking), fully opaque `#050505` panel, dark scrim, safe-area insets, 44px+ touch targets
- Mobile header solid (no translucent blur bleed); X follow pill hidden on xs to free space
- Live Forge bar denser wrap; hero padding/type scale; main/footer mobile spacing
- Theme panel + notification dropdown use solid surfaces on small screens

## 2026-08-06 - Fix submit crash after contribution

- Root cause: after successful submit, `revalidatePath` remounted the form and `e.currentTarget.reset()` threw, showing the global error UI even though Neon saved the work
- Fix: capture form node before async; safe reset; navigate to `/c/{id}` receipt on success
- Submit action fully try/catch; notify failures non-fatal; 200k body guard; claim-less re-submit path

## 2026-08-06 - Proceed (showcase receipt + Person JSON-LD)

- First **accepted showcase receipt** (founder contribution) with public `/c/{id}` + OG
- Profile **Person** JSON-LD for AEO
- `npm run seed:showcase-receipt` (idempotent)

## 2026-08-06 - Proceed (home/receipt OG harden + sitemap profiles)

- Hardened **receipt** opengraph-image (same Satori-safe pattern)
- **Home** opengraph-image with live project/task counts
- Sitemap includes builder profiles with public activity
- Profile/project OG already live as PNG

## 2026-08-06 - Proceed (profile/project OG + tweet pack)

- Profile **opengraph-image** PNG (rep, accepted, badges)
- Project **opengraph-image** PNG (title, category, open tasks)
- Richer profile metadata (bio/rep description, twitter large image)
- Desktop **GrokForge-tweet-ready** launch pack refreshed (tweet-body + card)

## 2026-08-06 - Keep cooking (command palette, achievement cards, FAQ)

- **Command palette**: Ctrl/Cmd+K or `?`; G-then chords (H/P/T/A/L/D/N)
- **Achievement share card**: `/api/achievements/[handle]` 1200x630 SVG + Share on X on profiles
- **About FAQ** + FAQPage JSON-LD for AEO
- Layout JSON-LD graph: WebApplication + Organization

## 2026-08-06 - Keep cooking (toasts, heatmap, challenges, theme pref)

- **Badge unlock toast** when new achievements appear (localStorage snapshot)
- **Contribution heatmap** on profiles (16-week UTC grid)
- **Weekly challenges** on home (signed-in) + dashboard
- **Theme pref** persisted to account when signed in (`themePref` + localStorage)
- Tests for weekly challenges pure scoring

## 2026-08-05 - Enhance wave (premium social forge)

- **Auth-aware CTAs**: signed-in users never see Sign in with X; hero/empty states/footer swap to Propose, Tasks, Dashboard
- **Live Forge bar**: visitors (IP-hash rate limit) + X builders + projects + open tasks with count-up
- **Badge system**: Whale/Leviathan, Bee/Hive, Forger, Critic, Architect, Ember, Pioneer, Founder on leaderboard, profile, dashboard
- **Nightcap gift**: user-reported leftover tokens to platform or project (no API keys)
- **X bio widget**: `/api/widget/[handle]` SVG + copy markdown/HTML on profile/dashboard
- **Theme Control Center**: floating mac-style panel; Obsidian Amber default + Violet/Emerald/Indigo; localStorage
- **Assets**: `public/logo.svg`, `public/infographic-how-forge-works.svg`
- **`/leaders`** alias redirects to `/leaderboard`
- Plan: `docs/ENHANCE-PLAN.md`

## 2026-08-05 - Proceed (catalog seed, status, RSS)

- Seeded 3 greater-good projects (climate, open science, education) + leaf tasks under founder
- Public **`/status`** capability page; **`/feed.xml`** RSS of network ledger
- `npm run seed:catalog` for idempotent catalog upserts
- Footer links: Status + RSS

## 2026-08-05 - Keep cooking (activity, donate presets, receipts)

- **`/activity`** full network ledger page (nav + sitemap + home link)
- Donate: amount presets ($5/$10/$25/$50) + live button amount
- Project: claim **~Nh left**, Copy link, JSON-LD SoftwareSourceCode, single public ledger
- Receipt: copy link; Stripe donor **DONATION_RECEIPT** in-app notify
- Home badge shows Stripe Checkout when configured

## 2026-08-05 - Keep cooking (live Stripe Checkout)

- Vaulted operator pack → restricted `rk_live` + webhook secret under `~\.grok\secrets\`
- Vercel Production/Preview: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Stripe webhook endpoint registered for `checkout.session.completed` → `/api/stripe/webhook`
- Donate form uses live Checkout when env set (demo ledger only if secret missing)

## 2026-08-05 - Proceed (expire claims, agent-email notify)

- **Claim auto-expire**: hourly Vercel cron `/api/cron/expire-claims` + soft expire on `/tasks` and project pages
- Expired claims reopen tasks, ledger note, notify claimer + creator
- **NOTIFY_WEBHOOK** agent-email bridge format (`/send` + high-signal types only)
- Flags: `claimExpireCron`, `notifyFormat`, `claimAutoExpire`
- Stripe: still demo-ledger until `STRIPE_SECRET_KEY` is vaulted (MCP account present; secret not on disk)

## 2026-08-05 - Keep cooking (watcher labor, stats API, profiles)

- **notifyProjectWatchers** on claim, release, submit, review result, donate (+ Stripe webhook)
- Creator notified when claim released; contributor gets accept/reject outcome notify
- Public **`/api/stats`** ecosystem JSON (projects, tasks, accepted, capital, watches)
- Flags: feature map + notifyWebhook presence
- Profile: accepted/proposed/donated/watching stats + recent support + SEO metadata
- Dashboard claims: **expiry countdown** (~Nh left) + deep-link to task
- About page: watches, open tasks, receipts

## 2026-08-05 - Keep cooking (watch, open tasks, discover)

- **Watch project** bookmarks (ProjectWatch) + dashboard Watching list
- **Open tasks** board at `/tasks` with category chips + deep-link anchors
- Discover: **sort** (newest / funding / open tasks / comments) + status filter + category chips
- Project page: Watch + **Share on X** + watch count badge
- Nav/footer/sitemap/home link to Tasks
- Watchers get in-app notify on new comments

## 2026-08-05 - Keep cooking (report, network feed)

- **Report** comment (signed-in non-authors); auto-hide after 3 unique reports
- Creator notified on reports
- Homepage **Recent network activity** strip
- Dashboard **Release claim** on active claims

## 2026-08-05 - Keep cooking (edit, release claim, activity)

- Creator **Edit proposal** (title, description, impact, license)
- Claimers can **Release claim** (re-opens task when last claim)
- Notify creator on claim + submission
- Project **Recent activity** feed + per-project SEO metadata
- Header notification bell; mobile sign-out
- Layout `force-dynamic` for auth shell

## 2026-08-05 - Keep cooking (notify, streaks, moderate)

- In-app **notifications** when someone comments on your project (+ optional NOTIFY_WEBHOOK_URL)
- Creator **Hide / Unhide** comment moderation (soft hide)
- Contribution **streaks** on leaderboard, profile, dashboard
- Stripe return banners `?donated=1` / `?canceled=1`

## 2026-08-05 - Keep cooking (share OG, rate limits, drafts)

- Per-receipt Open Graph image: `/c/[id]/opengraph-image`
- Upstash-ready `rateLimitAsync` (falls back to memory)
- Donate form shows Stripe vs demo ledger from env
- `npm run tweet:top-builders` writes human-gated Desktop draft
- Flags API: `stripeConfigured`, `rateLimitBackend`

## 2026-08-05 - Keep cooking (nav, archive, discussion)

- Mobile nav drawer (Leaders, Propose, Dash, Sign in with X)
- Creator **Archive** / **Restore** for any project; **Delete** only if zero capital support
- Dashboard: creator tools per project, comment counts, receipt links, Founder badge
- Project listings show comment counts
- Proposal **Discussion** comments + delete (author or creator)

## 2026-08-05 - Wave A trust + receipts

- X OAuth required to propose projects (email-only blocked on `/projects/new` + server action)
- Curated founder project seed: Open Agent Civic Toolkit (`scripts/seed-founder-project.ts`)
- Empty states for projects + leaderboard (no demo-bot theatre)
- Public contribution receipts at `/c/[id]` with Share on X intent
- Profile Founder badge + Follow on X; case-insensitive handle lookup
- Demo bots purged; leaderboard filters bots forever

## 2026-08-05 - Variant 3 Obsidian Amber

### Visual
- Locked Obsidian Amber theme (no blue): `#050505` void, `#121212` cards, `#f59e0b` accent
- Header, footer, home, projects, login, dashboard, about restyled
- Amber skeleton loaders and card hover lift (reduced-motion safe)
- New OG / tweet card `og.jpg?v=2.0.0`

### Product
- Removed sample-project seed; seed no longer creates demo projects
- `scripts/strip-demo-projects.ts` archives seed/demo/junk projects
- Top Contributors leaderboard: global `/leaderboard` + home panel + per-project leaders
- Ranking: capital + accepted labor + hours proxy + reviews + reputation
- 1-click Follow opens real X intent for builder handles
- Sign in with X remains primary; demo X gated behind `ENABLE_DEMO_AUTH`

### Security
- Response headers: CSP, X-Frame-Options, nosniff, referrer, permissions-policy
- Next/Image remotePatterns limited to X + dicebear
- Existing Zod validation + rate limits retained on claims/submissions/donations/decompose
