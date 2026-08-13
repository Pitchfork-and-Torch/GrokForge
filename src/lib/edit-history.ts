/**
 * Project edit history helpers (collapsible public log).
 */
import { prisma } from "@/lib/prisma";

export type EditHistoryInput = {
  projectId: string;
  actorId?: string | null;
  actorHandle?: string | null;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  summary: string;
};

export async function recordProjectEdit(input: EditHistoryInput) {
  try {
    await prisma.projectEditHistory.create({
      data: {
        projectId: input.projectId,
        actorId: input.actorId || null,
        actorHandle: input.actorHandle || null,
        field: input.field.slice(0, 40),
        oldValue: input.oldValue?.slice(0, 8000) || null,
        newValue: input.newValue?.slice(0, 8000) || null,
        summary: input.summary.slice(0, 500),
      },
    });
  } catch {
    // non-fatal if table lags one deploy
  }
}

export function formatProjectCreatedAt(d: Date): {
  iso: string;
  absolute: string;
  relative: string;
} {
  const iso = d.toISOString();
  const absolute = d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  let relative = "just now";
  if (mins >= 1 && mins < 60) relative = `${mins}m ago`;
  else if (mins >= 60 && mins < 60 * 24) relative = `${Math.floor(mins / 60)}h ago`;
  else if (mins >= 60 * 24 && mins < 60 * 24 * 30)
    relative = `${Math.floor(mins / (60 * 24))}d ago`;
  else if (mins >= 60 * 24 * 30)
    relative = `${Math.floor(mins / (60 * 24 * 30))}mo ago`;
  return { iso, absolute, relative };
}
