/**
 * GrokForge theme catalog - CSS custom property packs.
 * Obsidian Amber is the locked default and reset target.
 */

export type ThemeId =
  | "amber"
  | "violet"
  | "emerald"
  | "indigo"
  | "plasma"
  | "solar"
  | "abyssal"
  | "crimson"
  | "lavender"
  | "noir"
  | "golden";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  vibe: string;
  swatch: string;
  /** Secondary swatch for dual-tone previews */
  swatch2?: string;
  light?: boolean;
  vars: Record<string, string>;
};

export const THEMES: ThemeDef[] = [
  {
    id: "amber",
    label: "Obsidian Amber",
    vibe: "Default forge - void black + warm gold",
    swatch: "#f59e0b",
    vars: {
      "--background": "#050505",
      "--background-elevated": "#0a0a0a",
      "--card": "#121212",
      "--foreground": "#fafaf9",
      "--muted": "#a8a29e",
      "--accent": "#f59e0b",
      "--accent-hover": "#fbbf24",
      "--bronze": "#b45309",
      "--glow": "rgba(245, 158, 11, 0.28)",
      "--success": "#059669",
      "--danger": "#e11d48",
    },
  },
  {
    id: "violet",
    label: "Obsidian Violet",
    vibe: "Deep void with soft violet glow",
    swatch: "#a78bfa",
    vars: {
      "--background": "#050508",
      "--background-elevated": "#0c0a12",
      "--card": "#141218",
      "--foreground": "#f5f3ff",
      "--muted": "#a8a29e",
      "--accent": "#a78bfa",
      "--accent-hover": "#c4b5fd",
      "--bronze": "#7c3aed",
      "--glow": "rgba(167, 139, 250, 0.28)",
      "--success": "#059669",
      "--danger": "#e11d48",
    },
  },
  {
    id: "emerald",
    label: "Forest Emerald",
    vibe: "Canopy dark + gold-edged green",
    swatch: "#34d399",
    swatch2: "#d4a017",
    vars: {
      "--background": "#040806",
      "--background-elevated": "#0a120e",
      "--card": "#101814",
      "--foreground": "#f0fdf4",
      "--muted": "#a8a29e",
      "--accent": "#34d399",
      "--accent-hover": "#6ee7b7",
      "--bronze": "#d4a017",
      "--glow": "rgba(52, 211, 153, 0.25)",
      "--success": "#10b981",
      "--danger": "#e11d48",
    },
  },
  {
    id: "indigo",
    label: "Midnight Indigo",
    vibe: "Late-night lab indigo",
    swatch: "#818cf8",
    vars: {
      "--background": "#05050c",
      "--background-elevated": "#0a0a16",
      "--card": "#12121c",
      "--foreground": "#eef2ff",
      "--muted": "#a8a29e",
      "--accent": "#818cf8",
      "--accent-hover": "#a5b4fc",
      "--bronze": "#6366f1",
      "--glow": "rgba(129, 140, 248, 0.28)",
      "--success": "#059669",
      "--danger": "#e11d48",
    },
  },
  {
    id: "plasma",
    label: "Void Plasma",
    vibe: "Cyberpunk magenta + cyan energy",
    swatch: "#e879f9",
    swatch2: "#22d3ee",
    vars: {
      "--background": "#020003",
      "--background-elevated": "#0a0610",
      "--card": "#120a18",
      "--foreground": "#fdf4ff",
      "--muted": "#c4b5c8",
      "--accent": "#e879f9",
      "--accent-hover": "#22d3ee",
      "--bronze": "#a21caf",
      "--glow": "rgba(232, 121, 249, 0.35)",
      "--success": "#2dd4bf",
      "--danger": "#fb7185",
    },
  },
  {
    id: "solar",
    label: "Solar Forge",
    vibe: "Radical light - cream + solar gold",
    swatch: "#ea580c",
    swatch2: "#fbbf24",
    light: true,
    vars: {
      "--background": "#faf6ef",
      "--background-elevated": "#ffffff",
      "--card": "#fffdf8",
      "--foreground": "#1c1917",
      "--muted": "#57534e",
      "--accent": "#ea580c",
      "--accent-hover": "#c2410c",
      "--bronze": "#b45309",
      "--glow": "rgba(234, 88, 12, 0.22)",
      "--success": "#047857",
      "--danger": "#be123c",
    },
  },
  {
    id: "abyssal",
    label: "Abyssal Teal",
    vibe: "Deep navy abyss + bioluminescent teal",
    swatch: "#2dd4bf",
    swatch2: "#0e7490",
    vars: {
      "--background": "#020a0f",
      "--background-elevated": "#06141c",
      "--card": "#0c1c24",
      "--foreground": "#ecfeff",
      "--muted": "#94a3b8",
      "--accent": "#2dd4bf",
      "--accent-hover": "#5eead4",
      "--bronze": "#0e7490",
      "--glow": "rgba(45, 212, 191, 0.3)",
      "--success": "#14b8a6",
      "--danger": "#f43f5e",
    },
  },
  {
    id: "crimson",
    label: "Crimson Circuit",
    vibe: "Blood crimson + matrix green edge",
    swatch: "#ef4444",
    swatch2: "#22c55e",
    vars: {
      "--background": "#0a0505",
      "--background-elevated": "#140808",
      "--card": "#1a0c0c",
      "--foreground": "#fef2f2",
      "--muted": "#a8a29e",
      "--accent": "#ef4444",
      "--accent-hover": "#f87171",
      "--bronze": "#991b1b",
      "--glow": "rgba(239, 68, 68, 0.3)",
      "--success": "#22c55e",
      "--danger": "#fb7185",
    },
  },
  {
    id: "lavender",
    label: "Mist Lavender",
    vibe: "Ethereal purple-gray + cool silver",
    swatch: "#c4b5fd",
    swatch2: "#e2e8f0",
    vars: {
      "--background": "#0c0a10",
      "--background-elevated": "#14121a",
      "--card": "#1a1722",
      "--foreground": "#f5f3ff",
      "--muted": "#c4b5fd",
      "--accent": "#c4b5fd",
      "--accent-hover": "#ddd6fe",
      "--bronze": "#a78bfa",
      "--glow": "rgba(196, 181, 253, 0.28)",
      "--success": "#6ee7b7",
      "--danger": "#fb7185",
    },
  },
  {
    id: "noir",
    label: "Neon Noir",
    vibe: "Absolute black + pure white + neon green",
    swatch: "#39ff14",
    swatch2: "#ffffff",
    vars: {
      "--background": "#000000",
      "--background-elevated": "#0a0a0a",
      "--card": "#111111",
      "--foreground": "#ffffff",
      "--muted": "#a3a3a3",
      "--accent": "#39ff14",
      "--accent-hover": "#86efac",
      "--bronze": "#22c55e",
      "--glow": "rgba(57, 255, 20, 0.35)",
      "--success": "#39ff14",
      "--danger": "#ff2d55",
    },
  },
  {
    id: "golden",
    label: "Golden Hour",
    vibe: "Warm sepia chocolate + cinematic gold",
    swatch: "#fbbf24",
    swatch2: "#92400e",
    vars: {
      "--background": "#120c08",
      "--background-elevated": "#1a120c",
      "--card": "#221810",
      "--foreground": "#fef3c7",
      "--muted": "#d6c4a8",
      "--accent": "#fbbf24",
      "--accent-hover": "#fcd34d",
      "--bronze": "#b45309",
      "--glow": "rgba(251, 191, 36, 0.3)",
      "--success": "#84cc16",
      "--danger": "#f43f5e",
    },
  },
];

export const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
export const DEFAULT_THEME: ThemeId = "amber";

export function isThemeId(v: string | null | undefined): v is ThemeId {
  return !!v && THEME_IDS.has(v);
}

export function getTheme(id: ThemeId | string | null | undefined): ThemeDef {
  const found = THEMES.find((t) => t.id === id);
  return found || THEMES[0];
}

export function applyThemeToDocument(id: ThemeId) {
  if (typeof document === "undefined") return;
  const t = getTheme(id);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset.theme = t.id;
  if (t.light) root.classList.remove("dark");
  else root.classList.add("dark");
}
