import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatRelativeTime(input: Date | string, now = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const sec = Math.round((now.getTime() - d.getTime()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 45) return "just now";
  if (abs < 3600) return `${Math.max(1, Math.round(abs / 60))}m ago`;
  if (abs < 86400) return `${Math.max(1, Math.round(abs / 3600))}h ago`;
  if (abs < 86400 * 7) return `${Math.max(1, Math.round(abs / 86400))}d ago`;
  return d.toISOString().slice(0, 10);
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Project progress: accepted tasks out of total claimable work.
 * Prefer leaf tasks (parentId set); if none, use the full task list.
 */
export function projectTaskProgress(
  tasks: { status: string; parentId?: string | null }[]
): {
  total: number;
  completed: number;
  open: number;
  claimed: number;
  submitted: number;
  pct: number;
  label: string;
  /** All claimable tasks accepted (and at least one task exists). */
  fullyComplete: boolean;
} {
  const leaves = tasks.filter((t) => t.parentId != null);
  const pool = leaves.length > 0 ? leaves : tasks;
  const total = pool.length;
  const completed = pool.filter((t) => t.status === "ACCEPTED").length;
  const open = pool.filter((t) => t.status === "OPEN").length;
  const claimed = pool.filter((t) => t.status === "CLAIMED").length;
  const submitted = pool.filter((t) => t.status === "SUBMITTED").length;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const fullyComplete = total > 0 && completed === total;
  return {
    total,
    completed,
    open,
    claimed,
    submitted,
    pct,
    label: `${completed} / ${total} tasks done`,
    fullyComplete,
  };
}

/** True when status is COMPLETED or every claimable leaf is ACCEPTED. */
export function isProjectCompleteDisplay(
  status: string,
  tasks: { status: string; parentId?: string | null }[]
): boolean {
  if (status === "COMPLETED") return true;
  return projectTaskProgress(tasks).fullyComplete;
}

export const CATEGORY_LABELS: Record<string, string> = {
  CLIMATE: "Climate",
  OPEN_SCIENCE: "Open Science",
  EDUCATION: "Education",
  PUBLIC_GOODS_SOFTWARE: "Public Goods Software",
  HEALTH: "Health",
  OTHER: "Other",
};

export const FUND_TYPE_LABELS: Record<string, string> = {
  COMPUTE: "Compute",
  API_CREDITS: "API Credits",
  SUPERGROK_SPONSOR: "SuperGrok Sponsorship",
  GENERAL: "General",
};

const BLURB_SKIP =
  /^(BUILDER TL;DR|PROBLEM|WHO BENEFITS|WHY HIERARCHY|IN SCOPE|OUT OF SCOPE|COMPLEMENTS|SEAL TARGET|RAILS|START HERE|Live:|Funding goal)/i;

function truncateBlurb(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 80 ? cut.slice(0, sp) : cut).replace(/[,;:]$/, "")}...`;
}

/**
 * Card-safe public summary. Seeded project bodies often start with a BUILDER TL;DR
 * wall; cards should show the first real prose sentence instead.
 */
export function publicProjectBlurb(raw: string, max = 220): string {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const afterStart = text.split(/START HERE:\s*/i)[1];
  const pool = afterStart || text;
  const sentences = pool
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const picked: string[] = [];
  for (const s of sentences) {
    if (BLURB_SKIP.test(s)) continue;
    if (/^https?:\/\//i.test(s)) continue;
    if (s.length < 40) continue;
    if ((s.match(/:/g) || []).length >= 3 && s.length < 180) continue;
    picked.push(s);
    const joined = picked.join(" ");
    if (joined.length >= 120) return truncateBlurb(joined, max);
  }
  if (picked.length) return truncateBlurb(picked.join(" "), max);

  const stripped = text.replace(/^BUILDER TL;DR[\s\S]*?(?=[A-Z][a-z]{3,}.{40})/, "");
  return truncateBlurb(stripped || text, max);
}
