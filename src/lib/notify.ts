import { prisma } from "@/lib/prisma";

/**
 * In-app notification + optional webhook / agent-email bridge (no PII in repo).
 *
 * Generic webhook: NOTIFY_WEBHOOK_URL (+ optional NOTIFY_WEBHOOK_TOKEN)
 *   POST JSON { type, title, body, href }
 *
 * Agent-email bridge (jonbailey-email /send shape):
 *   NOTIFY_WEBHOOK_FORMAT=agent-email
 *   NOTIFY_WEBHOOK_URL=https://...workers.dev/send
 *   NOTIFY_WEBHOOK_TOKEN=<agent email bearer>
 *   Optional: NOTIFY_EMAIL_TO (defaults to worker config to)
 *   Only high-signal types email (see EMAIL_TYPES) to avoid spam.
 */

// High-signal only. Watcher fan-out stays in-app (avoid email storms).
const EMAIL_TYPES = new Set([
  "CLAIM",
  "SUBMISSION",
  "DONATION",
  "DONATION_RECEIPT",
  "REPORT",
  "CLAIM_EXPIRED",
  "REVIEW_RESULT",
  "ACCEPTED",
  "REJECTED",
  "RELEASE",
]);

export async function notifyUser(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        href: opts.href || null,
      },
    });
  } catch (e) {
    console.error("[notify] db", e);
  }

  await dispatchWebhook(opts);
}

async function dispatchWebhook(opts: {
  type: string;
  title: string;
  body: string;
  href?: string;
}) {
  const hook = process.env.NOTIFY_WEBHOOK_URL?.trim();
  if (!hook) return;

  const format = (
    process.env.NOTIFY_WEBHOOK_FORMAT ||
    (hook.includes("/send") ? "agent-email" : "json")
  ).toLowerCase();

  // Skip low-signal types for email bridge
  if (format === "agent-email" && !EMAIL_TYPES.has(opts.type)) {
    return;
  }

  const site =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "https://grokforge.app";
  const link = opts.href
    ? opts.href.startsWith("http")
      ? opts.href
      : `${site}${opts.href.startsWith("/") ? "" : "/"}${opts.href}`
    : site;

  try {
    let body: string;
    if (format === "agent-email") {
      const to = process.env.NOTIFY_EMAIL_TO?.trim();
      const payload: Record<string, unknown> = {
        subject: `[GrokForge] ${opts.title}`.slice(0, 180),
        text: [
          opts.body,
          "",
          `Type: ${opts.type}`,
          `Open: ${link}`,
          "",
          "In-app bell also updated for the affected user.",
        ].join("\n"),
      };
      if (to) payload.to = to;
      body = JSON.stringify(payload);
    } else {
      body = JSON.stringify({
        type: opts.type,
        title: opts.title,
        body: opts.body,
        href: opts.href,
        // Never send user emails or secrets
      });
    }

    await fetch(hook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NOTIFY_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.NOTIFY_WEBHOOK_TOKEN}` }
          : {}),
      },
      body,
      cache: "no-store",
    });
  } catch (e) {
    console.error("[notify] webhook", e);
  }
}

/** Fan-out to users watching a project (bookmarks). Skips excludeUserIds. */
export async function notifyProjectWatchers(opts: {
  projectId: string;
  excludeUserIds?: string[];
  type: string;
  title: string;
  body: string;
  href?: string;
  limit?: number;
}) {
  try {
    const exclude = (opts.excludeUserIds || []).filter(Boolean);
    const watchers = await prisma.projectWatch.findMany({
      where: {
        projectId: opts.projectId,
        ...(exclude.length ? { userId: { notIn: exclude } } : {}),
      },
      select: { userId: true },
      take: opts.limit ?? 50,
    });
    await Promise.all(
      watchers.map((w) =>
        notifyUser({
          userId: w.userId,
          type: opts.type,
          title: opts.title,
          body: opts.body,
          href: opts.href,
        })
      )
    );
  } catch (e) {
    console.error("[notify] watchers", e);
  }
}
