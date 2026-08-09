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
