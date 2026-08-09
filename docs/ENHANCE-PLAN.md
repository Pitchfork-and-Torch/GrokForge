# GrokForge enhance plan (from Desktop brief)

## Design tokens (locked default)

| Token | Value |
|-------|--------|
| background | `#050505` |
| elevated | `#0a0a0a` |
| surface / card | `#121212` |
| foreground | soft white `#fafaf9` |
| muted | `#a8a29e` |
| accent | `#f59e0b` |
| bronze | `#b45309` |

Themes (CSS vars): Obsidian Amber (default), Obsidian Violet, Forest Emerald + Gold, Midnight Indigo.

## Data model

- `SiteStats` singleton: `visitors`, `xBuilders`, `updatedAt`
- Visitor bump: layout/middleware, rate-limited by coarse IP hash (1/hour/IP)
- X builders: count distinct users with Twitter account; also bump on first X link
- Badges: **computed** from donations / accepted contributions / reviews / projects / streaks (no fragile unlock table for MVP). Optional later: `BadgeUnlock` for toast once.
- Nightcap: `NightcapGift` ledger rows via existing Donation + LABOR estimate meta (user-reported token estimate; no API keys)

## Execution

A Auth CTAs · B Counters + badges · C Theme panel · D Nightcap + widget · E SEO/README/assets · ship
