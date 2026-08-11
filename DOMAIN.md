# grokforge.app domain

## Live (canonical)

| Item | Value |
|------|--------|
| Apex | https://grokforge.app |
| www | https://www.grokforge.app |
| Vercel project | `grok-forge` team / project `grokforge` (Pro) |
| Auth callback | `https://grokforge.app/api/auth/callback/twitter` |
| Auth env | `NEXTAUTH_URL=https://grokforge.app` · `AUTH_URL=https://grokforge.app` |

DNS and SSL are live. Prefer the apex URL in docs, OG tags, and tweets.

## X OAuth app (developer.x.com)

- App type: Web App (confidential)
- Permissions: Read (enough for Sign in with X)
- Callback URLs (exact):
  - `https://grokforge.app/api/auth/callback/twitter`
  - `https://www.grokforge.app/api/auth/callback/twitter`
  - `http://localhost:3000/api/auth/callback/twitter`
- Env: `AUTH_TWITTER_ID` + `AUTH_TWITTER_SECRET` on Vercel Production/Preview/Development

## Tweet / link preview

- Raster card: `/og.jpg` (1200x630) + `/og.png`
- Meta: `twitter:card=summary_large_image`, absolute `og:image` on `https://grokforge.app`

## Ops (prod)

| Item | Value |
|------|--------|
| Claim expire cron | Hourly `GET /api/cron/expire-claims` (Vercel Cron + `CRON_SECRET`) |
| Notify bridge | `NOTIFY_WEBHOOK_FORMAT=agent-email` → jonbailey-email `/send` (high-signal only) |
| Public stats | `GET /api/stats` |
| Sealed package ZIP | `GET /api/projects/{slug}/package` (public after seal; GitHub-ready) |
| Seal review UI | `/projects/{slug}/seal` (creator) |
| Ship page | `/projects/{slug}/ship` (public finished product + Ship to GitHub) |
| Ship to GitHub API | `POST /api/v1/projects/{id}/publish-github` (founder elevated) |
| Flags | `GET /api/auth/flags` |

### Stripe (live Checkout)

- Stripe account configured in dashboard (display name "Twitter"; id `acct_••••`)
- `STRIPE_SECRET_KEY` on Vercel = restricted live API key (Checkout Sessions verified)
- Webhook: `https://grokforge.app/api/stripe/webhook` event `checkout.session.completed`
- `STRIPE_WEBHOOK_SECRET` vaulted + on Vercel (from endpoint create)
- Secret files (local only, not git): under `~\.grok\secrets\` (stripe secret + webhook secret)
- Source pack vaulted from Desktop dump; dashboard key IDs are not secret material
- Server Checkout redirect does not need a publishable key

## Optional DNS reference

- Apex A / ALIAS to Vercel, or CNAME flattening to `cname.vercel-dns.com`
- `www` CNAME to Vercel

Do not leave the GitHub homepage pointed at a random `*.vercel.app` preview; use **https://grokforge.app**.
