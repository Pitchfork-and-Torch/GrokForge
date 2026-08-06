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
