import { prisma } from "@/lib/prisma";

export const WORKER_ONLINE_MS = 10 * 60 * 1000; // 10 minutes

export type HeartbeatInput = {
  userId: string;
  workerName: string;
  status?: string;
  projectFilter?: string[] | string | null;
  lastTaskId?: string | null;
  lastProjectSlug?: string | null;
  lastError?: string | null;
  event?: "ping" | "claim" | "submit" | "error" | string;
  meta?: Record<string, unknown> | null;
};

function normalizeFilter(
  filter: string[] | string | null | undefined
): string | null {
  if (filter == null) return null;
  if (Array.isArray(filter)) {
    const s = filter
      .map((x) => String(x).trim())
      .filter(Boolean)
      .join(",");
    return s || null;
  }
  const s = String(filter)
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(",");
  return s || null;
}

function sanitizeStatus(s: string | undefined): string {
  const v = (s || "idle").toLowerCase().slice(0, 32);
  if (["idle", "busy", "error", "offline"].includes(v)) return v;
  return "idle";
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .slice(0, 80)
    .replace(/[^\w.\-:@]/g, "_");
}

export async function upsertWorkerHeartbeat(input: HeartbeatInput) {
  const workerName = sanitizeName(input.workerName || "worker");
  if (!workerName) throw new Error("workerName required");

  const now = new Date();
  const status = sanitizeStatus(input.status);
  const projectFilter = normalizeFilter(input.projectFilter);
  const event = (input.event || "ping").toLowerCase();

  const data: {
    status: string;
    projectFilter: string | null;
    lastTaskId: string | null;
    lastProjectSlug: string | null;
    lastError: string | null;
    lastSeenAt: Date;
    metaJson: string | null;
    lastClaimAt?: Date;
    lastSubmitAt?: Date;
  } = {
    status: event === "error" ? "error" : status,
    projectFilter,
    lastTaskId: input.lastTaskId?.slice(0, 64) || null,
    lastProjectSlug: input.lastProjectSlug?.slice(0, 120) || null,
    lastError: input.lastError?.slice(0, 2000) || null,
    lastSeenAt: now,
    metaJson: input.meta ? JSON.stringify(input.meta).slice(0, 4000) : null,
  };
  if (event === "claim") data.lastClaimAt = now;
  if (event === "submit") data.lastSubmitAt = now;

  return prisma.agentWorkerHeartbeat.upsert({
    where: {
      userId_workerName: {
        userId: input.userId,
        workerName,
      },
    },
    create: {
      userId: input.userId,
      workerName,
      ...data,
    },
    update: data,
  });
}

export async function listOnlineWorkers(opts?: { withinMs?: number }) {
  const within = opts?.withinMs ?? WORKER_ONLINE_MS;
  const since = new Date(Date.now() - within);
  const rows = await prisma.agentWorkerHeartbeat.findMany({
    where: { lastSeenAt: { gte: since } },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
    include: {
      user: { select: { handle: true, reputation: true } },
    },
  });
  return rows.map((r) => ({
    workerName: r.workerName,
    status: r.status,
    projectFilter: r.projectFilter
      ? r.projectFilter.split(",").filter(Boolean)
      : [],
    lastTaskId: r.lastTaskId,
    lastProjectSlug: r.lastProjectSlug,
    lastError: r.lastError,
    lastClaimAt: r.lastClaimAt?.toISOString() ?? null,
    lastSubmitAt: r.lastSubmitAt?.toISOString() ?? null,
    lastSeenAt: r.lastSeenAt.toISOString(),
    online: true,
    handle: r.user.handle,
    reputation: r.user.reputation,
  }));
}

export async function fireAgentRuntimeWebhook(payload: {
  type: string;
  title: string;
  body: string;
  href?: string;
  projectSlug?: string;
  taskId?: string;
  extra?: Record<string, unknown>;
  userWebhookUrl?: string | null;
}) {
  const urls = new Set<string>();
  const platform = process.env.AGENT_RUNTIME_WEBHOOK_URL?.trim();
  if (platform) urls.add(platform);
  // Also reuse NOTIFY_WEBHOOK when format is json (not agent-email spam)
  const notify = process.env.NOTIFY_WEBHOOK_URL?.trim();
  const fmt = (process.env.NOTIFY_WEBHOOK_FORMAT || "").toLowerCase();
  if (notify && fmt !== "agent-email") urls.add(notify);
  if (payload.userWebhookUrl?.trim()) urls.add(payload.userWebhookUrl.trim());

  if (urls.size === 0) return;

  const site =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "https://grokforge.app";
  const body = {
    source: "grokforge-agent-runtime",
    type: payload.type,
    title: payload.title,
    body: payload.body,
    href: payload.href
      ? payload.href.startsWith("http")
        ? payload.href
        : `${site}${payload.href}`
      : undefined,
    projectSlug: payload.projectSlug,
    taskId: payload.taskId,
    ...payload.extra,
    at: new Date().toISOString(),
  };

  await Promise.all(
    [...urls].map(async (url) => {
      try {
        if (!/^https:\/\//i.test(url)) return;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "GrokForge-AgentRuntime/1.0",
        };
        const tok = process.env.AGENT_RUNTIME_WEBHOOK_TOKEN?.trim();
        if (tok) headers.Authorization = `Bearer ${tok}`;
        await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
        });
      } catch (e) {
        console.error("[agent-runtime-webhook]", url.slice(0, 40), e);
      }
    })
  );
}
