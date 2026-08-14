# Design tokens - GrokForge themes

**Default / locked reset:** Obsidian Amber (`amber`).  
Tokens are CSS custom properties on `:root` / `document.documentElement`, applied by the Control Center (`src/components/theme-panel.tsx` + `src/lib/themes.ts`).

## Type (v2.2.0)

| Role | Family |
|------|--------|
| Display / hero | Clash Display (Fontshare, self-hosted) |
| UI / body | Satoshi |
| Fallback | Geist via `next/font`, then system-ui |

## Motion + surface tokens (v2.2.0)

Defined once in `globals.css` from `--accent` / `--bronze` / `--card` via `color-mix`, so Control Center themes inherit chrome:

`--accent-dim`, `--bronze-edge`, `--border`, `--ring`, `--focus-ring`, `--surface-glass-*`, `--surface-grain-opacity`, `--motion-dur-*`, `--motion-ease-*`.

## Core tokens (every theme)

| Token | Role |
|-------|------|
| `--background` | Page void |
| `--background-elevated` | Chrome, panels, elevated surfaces |
| `--card` | Cards / inset surfaces |
| `--foreground` | Primary text |
| `--muted` | Secondary text |
| `--accent` | CTAs, ranks, progress, focus accents |
| `--accent-hover` | Hover / highlight |
| `--bronze` | Edges / secondary metal |
| `--glow` | Soft aura / shadow tint |
| `--success` | Success / alignment (keep semantic) |
| `--danger` | Destructive (keep semantic) |

## Theme catalog (11)

| Id | Label | Vibe |
|----|-------|------|
| `amber` | Obsidian Amber | Default forge - void black + warm gold |
| `violet` | Obsidian Violet | Deep void with soft violet glow |
| `emerald` | Forest Emerald | Canopy dark + gold-edged green |
| `indigo` | Midnight Indigo | Late-night lab indigo |
| `plasma` | Void Plasma | Cyberpunk magenta + cyan energy |
| `solar` | Solar Forge | **Light mode** - cream + solar orange/gold |
| `abyssal` | Abyssal Teal | Deep navy abyss + bioluminescent teal |
| `crimson` | Crimson Circuit | Blood crimson + matrix green edge |
| `lavender` | Mist Lavender | Ethereal purple-gray + cool silver |
| `noir` | Neon Noir | Absolute black + white + neon green |
| `golden` | Golden Hour | Warm sepia chocolate + cinematic gold |

## Persistence

1. `localStorage` key `grokforge-theme`
2. Signed-in: `User.themePref` via `saveThemePrefAction`
3. Account pref wins once on load, then mirrors to localStorage

## Accessibility

- Solar Forge uses dark charcoal text on cream; verify contrast on CTAs.
- Success / danger stay green / rose-family across themes so status stays readable.
- Theme transitions respect `prefers-reduced-motion` (global reduce block in `globals.css`).
- Control Center: keyboard Esc to close; focus-visible rings on theme buttons.

## Implementation notes

- Prefer `var(--accent)` / `var(--card)` for new UI chrome so all 11 themes adapt.
- Tailwind `amber-*` utilities remain for legacy surfaces; migrate high-traffic chrome to tokens when touching files.
- Live preview swatches live in Control Center; "Surprise me" picks a random non-current theme.
