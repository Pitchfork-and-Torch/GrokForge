/**
 * Computed achievement badges from public activity.
 * No PII; pure scoring for UI + share cards.
 */

export type BadgeId =
  | "whale"
  | "leviathan"
  | "bee"
  | "hive"
  | "forger"
  | "master_forger"
  | "critic"
  | "peer_oracle"
  | "architect"
  | "ember"
  | "streak_keeper"
  | "pioneer"
  | "license_champion"
  | "founder";

export type BadgeDef = {
  id: BadgeId;
  label: string;
  blurb: string;
  tier: 1 | 2 | 3;
};

export type BadgeInput = {
  donationCents: number;
  acceptedCount: number;
  reviewCount: number;
  projectCount: number;
  currentStreak: number;
  longestStreak: number;
  isFounder?: boolean;
  isPioneer?: boolean; // early user / early project
  estimatedTokenGifts?: number;
};

const DEFS: Record<BadgeId, Omit<BadgeDef, "id">> = {
  whale: {
    label: "Whale",
    blurb: "Donated $50+ in capital to greater-good pots",
    tier: 1,
  },
  leviathan: {
    label: "Leviathan",
    blurb: "Donated $250+ in capital - major forge sponsor",
    tier: 2,
  },
  bee: {
    label: "Bee",
    blurb: "Contributed labor or nightcap token gifts to the hive",
    tier: 1,
  },
  hive: {
    label: "Hive",
    blurb: "5+ accepted tasks or large token overflow gifts",
    tier: 2,
  },
  forger: {
    label: "Forger",
    blurb: "1+ accepted task submissions",
    tier: 1,
  },
  master_forger: {
    label: "Master Forger",
    blurb: "10+ accepted task submissions",
    tier: 3,
  },
  critic: {
    label: "Critic",
    blurb: "3+ peer reviews written",
    tier: 1,
  },
  peer_oracle: {
    label: "Peer Oracle",
    blurb: "15+ peer reviews written",
    tier: 2,
  },
  architect: {
    label: "Architect",
    blurb: "Proposed 1+ live projects",
    tier: 1,
  },
  ember: {
    label: "Ember",
    blurb: "Contribution streak of 2+ days",
    tier: 1,
  },
  streak_keeper: {
    label: "Streak Keeper",
    blurb: "Longest streak 7+ days",
    tier: 2,
  },
  pioneer: {
    label: "Pioneer",
    blurb: "Early builder on GrokForge",
    tier: 1,
  },
  license_champion: {
    label: "Open License",
    blurb: "Ships under open licenses by default",
    tier: 1,
  },
  founder: {
    label: "Founder",
    blurb: "GrokForge founder handle",
    tier: 3,
  },
};

export function computeBadges(input: BadgeInput): BadgeDef[] {
  const out: BadgeDef[] = [];
  const add = (id: BadgeId) => {
    const d = DEFS[id];
    out.push({ id, ...d });
  };

  if (input.isFounder) add("founder");
  if (input.donationCents >= 25000) add("leviathan");
  else if (input.donationCents >= 5000) add("whale");

  if (input.acceptedCount >= 10) add("master_forger");
  else if (input.acceptedCount >= 1) add("forger");

  if (input.acceptedCount >= 5 || (input.estimatedTokenGifts || 0) >= 50000) {
    add("hive");
  } else if (input.acceptedCount >= 1 || (input.estimatedTokenGifts || 0) >= 1000) {
    add("bee");
  }

  if (input.reviewCount >= 15) add("peer_oracle");
  else if (input.reviewCount >= 3) add("critic");

  if (input.projectCount >= 1) add("architect");

  if (input.longestStreak >= 7) add("streak_keeper");
  else if (input.currentStreak >= 2 || input.longestStreak >= 2) add("ember");

  if (input.isPioneer) add("pioneer");
  if (input.acceptedCount >= 1 || input.projectCount >= 1) add("license_champion");

  // de-dupe by id
  const seen = new Set<string>();
  return out.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

export function badgeIconPath(id: BadgeId): string {
  // simple geometric marks as unicode-safe labels for SVG text fallback
  const map: Record<BadgeId, string> = {
    whale: "W",
    leviathan: "L",
    bee: "B",
    hive: "H",
    forger: "F",
    master_forger: "M",
    critic: "C",
    peer_oracle: "O",
    architect: "A",
    ember: "E",
    streak_keeper: "S",
    pioneer: "P",
    license_champion: "OS",
    founder: "*",
  };
  return map[id] || "?";
}

/** All badge definitions for gallery / locked progress UI. */
export function allBadgeDefs(): BadgeDef[] {
  return (Object.keys(DEFS) as BadgeId[]).map((id) => ({ id, ...DEFS[id] }));
}

export function getBadgeDef(id: BadgeId): BadgeDef {
  return { id, ...DEFS[id] };
}

/** Human criteria lines for tooltips (richer than blurb alone). */
export function badgeCriteria(id: BadgeId): string {
  const map: Record<BadgeId, string> = {
    whale: "Donate $50+ total to project capital pots.",
    leviathan: "Donate $250+ total to greater-good pots.",
    bee: "1+ accepted task or ~1k+ nightcap tokens gifted.",
    hive: "5+ accepted tasks or ~50k+ nightcap tokens gifted.",
    forger: "Get 1 contribution accepted by peers or creator.",
    master_forger: "Get 10 contributions accepted.",
    critic: "Write 3+ peer reviews.",
    peer_oracle: "Write 15+ peer reviews.",
    architect: "Propose at least one live project.",
    ember: "Hold a 2+ day contribution streak.",
    streak_keeper: "Reach a longest streak of 7+ days.",
    pioneer: "Join during the early builder window.",
    license_champion: "Ship accepted work or a project under open licenses.",
    founder: "Reserved for the GrokForge founder handle.",
  };
  return map[id] || DEFS[id].blurb;
}

export type BadgeProgress = {
  id: BadgeId;
  earned: boolean;
  label: string;
  blurb: string;
  tier: 1 | 2 | 3;
  progressLabel?: string;
  progressPct?: number;
};

/**
 * Gallery rows: earned first, then locked with progress toward unlock.
 */
export function badgeGallery(input: BadgeInput): BadgeProgress[] {
  const earned = new Set(computeBadges(input).map((b) => b.id));
  const rows: BadgeProgress[] = [];

  const push = (
    id: BadgeId,
    progressLabel?: string,
    progressPct?: number
  ) => {
    const d = DEFS[id];
    rows.push({
      id,
      earned: earned.has(id),
      label: d.label,
      blurb: d.blurb,
      tier: d.tier,
      progressLabel: earned.has(id) ? "Earned" : progressLabel,
      progressPct: earned.has(id) ? 100 : progressPct,
    });
  };

  // Capital
  push(
    "whale",
    `$${(input.donationCents / 100).toFixed(0)} / $50`,
    Math.min(100, Math.round((input.donationCents / 5000) * 100))
  );
  push(
    "leviathan",
    `$${(input.donationCents / 100).toFixed(0)} / $250`,
    Math.min(100, Math.round((input.donationCents / 25000) * 100))
  );
  // Labor
  push(
    "forger",
    `${input.acceptedCount} / 1 accepted`,
    Math.min(100, input.acceptedCount * 100)
  );
  push(
    "master_forger",
    `${input.acceptedCount} / 10 accepted`,
    Math.min(100, Math.round((input.acceptedCount / 10) * 100))
  );
  push(
    "bee",
    `${input.acceptedCount} accepted · ${input.estimatedTokenGifts || 0} gift tok`,
    Math.min(
      100,
      Math.max(
        input.acceptedCount >= 1 ? 100 : 0,
        Math.round(((input.estimatedTokenGifts || 0) / 1000) * 100)
      )
    )
  );
  push(
    "hive",
    `${input.acceptedCount} / 5 accepted`,
    Math.min(100, Math.round((input.acceptedCount / 5) * 100))
  );
  // Reviews
  push(
    "critic",
    `${input.reviewCount} / 3 reviews`,
    Math.min(100, Math.round((input.reviewCount / 3) * 100))
  );
  push(
    "peer_oracle",
    `${input.reviewCount} / 15 reviews`,
    Math.min(100, Math.round((input.reviewCount / 15) * 100))
  );
  // Projects / streaks
  push(
    "architect",
    `${input.projectCount} / 1 project`,
    Math.min(100, input.projectCount * 100)
  );
  push(
    "ember",
    `${Math.max(input.currentStreak, input.longestStreak)} / 2d streak`,
    Math.min(
      100,
      Math.round((Math.max(input.currentStreak, input.longestStreak) / 2) * 100)
    )
  );
  push(
    "streak_keeper",
    `${input.longestStreak} / 7d longest`,
    Math.min(100, Math.round((input.longestStreak / 7) * 100))
  );
  push("pioneer", input.isPioneer ? "Earned" : "Early window only", input.isPioneer ? 100 : 0);
  push(
    "license_champion",
    input.acceptedCount + input.projectCount > 0 ? "Earned" : "Ship open work",
    input.acceptedCount + input.projectCount > 0 ? 100 : 0
  );
  if (input.isFounder) push("founder", "Earned", 100);
  else push("founder", "Founder only", 0);

  return rows;
}

