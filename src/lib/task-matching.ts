/**
 * Pure task matching - score open leaf tasks for a builder.
 * No embeddings required; category + watch + funding + recency heuristics.
 */

export type MatchInputTask = {
  id: string;
  title: string;
  estimatedTokens: number;
  createdAt: Date | string;
  project: {
    slug: string;
    title: string;
    category: string;
    raisedCents?: number;
  };
};

export type MatchProfile = {
  /** Categories from past contributions / projects */
  preferredCategories: string[];
  /** Project slugs the user watches */
  watchedSlugs: string[];
  /** Project slugs the user already proposed */
  proposedSlugs: string[];
  /** Titles/keywords from past accepted work (lowercased) */
  pastKeywords: string[];
};

export type RankedTask = MatchInputTask & {
  matchScore: number;
  matchReasons: string[];
};

function daysAgo(d: Date | string): number {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  return Math.max(0, (Date.now() - t) / (24 * 60 * 60 * 1000));
}

function keywordHits(title: string, keywords: string[]): number {
  const t = title.toLowerCase();
  let n = 0;
  for (const k of keywords) {
    if (k.length < 3) continue;
    if (t.includes(k)) n += 1;
  }
  return n;
}

/**
 * Higher score = better match for this builder.
 */
export function scoreTaskForUser(
  task: MatchInputTask,
  profile: MatchProfile
): RankedTask {
  let score = 10;
  const reasons: string[] = [];

  const cat = task.project.category;
  if (profile.preferredCategories.includes(cat)) {
    score += 40;
    reasons.push("category you have worked in");
  }

  if (profile.watchedSlugs.includes(task.project.slug)) {
    score += 35;
    reasons.push("project you watch");
  }

  if (profile.proposedSlugs.includes(task.project.slug)) {
    score += 15;
    reasons.push("your project");
  }

  const hits = keywordHits(task.title, profile.pastKeywords);
  if (hits > 0) {
    score += Math.min(25, hits * 8);
    reasons.push("similar to past work");
  }

  const raised = task.project.raisedCents || 0;
  if (raised > 0) {
    score += Math.min(20, Math.floor(raised / 500));
    reasons.push("funded project");
  }

  // Prefer fresher open tasks slightly
  const age = daysAgo(task.createdAt);
  if (age < 3) {
    score += 12;
    reasons.push("recently opened");
  } else if (age < 14) {
    score += 5;
  }

  // Prefer mid-size token packages (not tiny stubs, not huge)
  const tok = task.estimatedTokens || 0;
  if (tok >= 500 && tok <= 20000) {
    score += 8;
    reasons.push("reasonable token size");
  }

  if (reasons.length === 0) reasons.push("open leaf task");

  return { ...task, matchScore: Math.round(score), matchReasons: reasons };
}

export function rankTasksForUser(
  tasks: MatchInputTask[],
  profile: MatchProfile,
  limit = 8
): RankedTask[] {
  return tasks
    .map((t) => scoreTaskForUser(t, profile))
    .sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function extractKeywords(texts: string[], max = 24): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "your",
    "task",
    "open",
    "leaf",
    "agent",
    "agents",
    "project",
    "grok",
  ]);
  const counts = new Map<string, number>();
  for (const raw of texts) {
    const words = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stop.has(w));
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}
