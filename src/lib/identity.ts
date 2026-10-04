/**
 * Real-human identity rails for leaderboard + badges.
 * Demo seed bots and synthetic X-demo accounts never rank publicly.
 */

/** Handles that receive the Founder badge (case-insensitive). */
export const FOUNDER_HANDLES = new Set(
  (process.env.FOUNDER_HANDLES || "SuddenlyJon,suddenlyjon")
    .split(",")
    .map((h) => h.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean)
);

const DEMO_EMAIL_SUFFIXES = [
  "@grokforge.demo",
  "@x-demo.grokforge.local",
];

const DEMO_HANDLES = new Set([
  "alice_rivers",
  "bob_publicgoods",
  "carol_builds",
  "x_builder",
  "grokforge_demo",
]);

export function isDemoBotUser(user: {
  email?: string | null;
  handle?: string | null;
}): boolean {
  const handle = (user.handle || "").replace(/^@/, "").toLowerCase();
  // Founders and real X handles must never be stripped from public ranks
  if (handle && FOUNDER_HANDLES.has(handle)) return false;

  // Explicit demo seed handles only
  if (handle && DEMO_HANDLES.has(handle)) return true;

  const email = (user.email || "").toLowerCase();
  if (DEMO_EMAIL_SUFFIXES.some((s) => email.endsWith(s))) {
    // Leftover demo email on a real public handle (e.g. X OAuth later) is NOT a bot
    if (handle && !DEMO_HANDLES.has(handle)) return false;
    return true;
  }
  return false;
}

export function isFounderHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  return FOUNDER_HANDLES.has(handle.replace(/^@/, "").toLowerCase());
}
