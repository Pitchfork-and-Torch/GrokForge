"use client";

/**
 * Tasteful forge celebration bursts (confetti-lite).
 * No-ops when prefers-reduced-motion.
 */

export type CelebrateKind = "tip" | "accept" | "claim" | "badge" | "donate";

export function fireForgeCelebrate(kind: CelebrateKind = "accept") {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch {
    return;
  }

  const colors: Record<CelebrateKind, string[]> = {
    tip: ["#f59e0b", "#fbbf24", "#39ff14", "#ffffff"],
    accept: ["#34d399", "#f59e0b", "#fbbf24"],
    claim: ["#818cf8", "#f59e0b", "#a78bfa"],
    badge: ["#fbbf24", "#e879f9", "#22d3ee"],
    donate: ["#f59e0b", "#b45309", "#fde68a"],
  };
  const palette = colors[kind] || colors.accept;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "pointer-events:none;position:fixed;inset:0;z-index:9999;overflow:hidden;";
  document.body.appendChild(host);

  const n = 18;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    const x = 40 + Math.random() * 20;
    const y = 55 + Math.random() * 15;
    const dx = (Math.random() - 0.5) * 160;
    const dy = -40 - Math.random() * 120;
    const rot = Math.random() * 360;
    const c = palette[i % palette.length];
    const size = 4 + Math.random() * 5;
    p.style.cssText = `
      position:absolute;left:${x}%;top:${y}%;width:${size}px;height:${size}px;
      background:${c};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      opacity:0.95;transform:translate(0,0) rotate(0deg);
      box-shadow:0 0 8px ${c};
      animation:gf-spark 700ms ease-out forwards;
      --dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;
    `;
    host.appendChild(p);
  }

  window.setTimeout(() => {
    host.remove();
  }, 800);
}

/** Inject keyframes once */
if (typeof document !== "undefined") {
  const id = "gf-celebrate-style";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
@keyframes gf-spark {
  0% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.4); }
}
`;
    document.head.appendChild(s);
  }
}
