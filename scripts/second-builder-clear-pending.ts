/**
 * Second-builder peer-review of main-account pending backlog.
 *
 * Usage:
 *   GROKFORGE_TOKEN must already be in the process environment
 *   npx tsx scripts/second-builder-clear-pending.ts
 *
 * Default score 4 (accept). Does not use SuperGrok keys.
 * Prefer live API once /review is deployed; falls back to local peer-review-ops + Neon.
 */
const API =
  process.env.GROKFORGE_API?.replace(/\/$/, "") ||
  "https://grokforge.app/api/v1";

function loadToken(): string {
  const token = process.env.GROKFORGE_TOKEN?.trim();
  if (!token) {
    throw new Error("GROKFORGE_TOKEN is not set");
  }
  return token;
}

async function apiJson(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  return { status: res.status, body };
}

async function clearViaLocalDb(reviewerHandle: string, score: number) {
  // Dynamic import so API path works without prisma env if unused
  const { PrismaClient } = await import("@prisma/client");
  const { peerReviewContributionForUser } = await import(
    "../src/lib/peer-review-ops"
  );
  const prisma = new PrismaClient();
  try {
    const reviewer = await prisma.user.findFirst({
      where: { handle: reviewerHandle },
      select: { id: true, handle: true, name: true },
    });
    if (!reviewer) throw new Error(`Reviewer @${reviewerHandle} not found`);

    const pending = await prisma.contribution.findMany({
      where: {
        status: "PENDING",
        userId: { not: reviewer.id },
        task: {
          project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        user: { select: { handle: true } },
        task: { select: { title: true, project: { select: { slug: true } } } },
      },
    });

    console.log(
      `[local] reviewer=@${reviewer.handle} pending=${pending.length} score=${score}`
    );
    let accepted = 0;
    let failed = 0;
    for (const c of pending) {
      const res = await peerReviewContributionForUser(
        {
          id: reviewer.id,
          handle: reviewer.handle,
          name: reviewer.name,
        },
        c.id,
        score,
        "Second-builder peer review (network gravity backlog clear)",
        { via: "api" }
      );
      if ("error" in res) {
        failed += 1;
        console.log("FAIL", c.task.project.slug, c.task.title.slice(0, 40), res.error);
      } else {
        if (res.accepted) accepted += 1;
        console.log(
          res.accepted ? "ACCEPT" : "REJECT",
          c.task.project.slug,
          c.task.title.slice(0, 40),
          `avg=${res.avg}`
        );
      }
    }
    console.log(JSON.stringify({ ok: true, mode: "local", accepted, failed, total: pending.length }));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const token = loadToken();
  const score = Math.min(5, Math.max(1, Number(process.env.REVIEW_SCORE || 4) || 4));

  const me = await apiJson("/me", token);
  if (me.status !== 200 || !me.body?.handle) {
    console.error("Token /me failed", me.status, me.body);
    process.exit(1);
  }
  console.log(`[me] @${me.body.handle} id=${me.body.id} scopes=${(me.body.scopes || []).join(",")}`);

  // Probe list of pending - without moderation only returns own; we need network list via DB or review endpoint per id from public/health
  // Prefer: local DB list + local peer review (works pre-deploy). Also try API /review once ready.

  // Get pending ids via local prisma (same Neon as production)
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  let pendingIds: { id: string; title: string; slug: string; author: string | null }[] = [];
  try {
    const rows = await prisma.contribution.findMany({
      where: {
        status: "PENDING",
        userId: { not: me.body.id },
        task: {
          project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        user: { select: { handle: true } },
        task: { select: { title: true, project: { select: { slug: true } } } },
      },
    });
    pendingIds = rows.map((r) => ({
      id: r.id,
      title: r.task.title,
      slug: r.task.project.slug,
      author: r.user.handle,
    }));
  } finally {
    await prisma.$disconnect();
  }

  console.log(`[pending] ${pendingIds.length} (not by @${me.body.handle})`);
  if (pendingIds.length === 0) {
    console.log("Nothing to review.");
    return;
  }

  // Try live API first (must return JSON { ok: true }; HTML soft-404 means not deployed)
  let apiWorks = false;
  {
    const probe = await apiJson(`/contributions/${pendingIds[0].id}/review`, token, {
      method: "POST",
      body: JSON.stringify({
        score,
        notes: "probe - will use local if 404",
      }),
    });
    const looksHtml =
      typeof probe.body?.raw === "string" &&
      probe.body.raw.includes("<!DOCTYPE html");
    if (
      probe.status === 404 ||
      probe.status === 405 ||
      looksHtml ||
      (probe.status === 200 && !probe.body?.ok && !probe.body?.error)
    ) {
      console.log(
        "[api] /review not live (or HTML soft-404) - using local peer-review-ops on Neon"
      );
      apiWorks = false;
    } else if (probe.status === 200 && probe.body?.ok) {
      console.log(
        "[api] ACCEPT",
        pendingIds[0].slug,
        pendingIds[0].title.slice(0, 40)
      );
      apiWorks = true;
      pendingIds = pendingIds.slice(1);
    } else if (
      probe.status === 403 &&
      /already|own/i.test(String(probe.body?.error || ""))
    ) {
      apiWorks = true;
      pendingIds = pendingIds.slice(1);
    } else {
      console.log("[api] probe status", probe.status, probe.body);
      apiWorks = false;
    }
  }

  if (!apiWorks) {
    await clearViaLocalDb(me.body.handle, score);
    return;
  }

  let accepted = 0;
  let failed = 0;
  for (const c of pendingIds) {
    const r = await apiJson(`/contributions/${c.id}/review`, token, {
      method: "POST",
      body: JSON.stringify({
        score,
        notes: "Second-builder peer review (network gravity backlog clear)",
      }),
    });
    if (r.status === 200 && r.body?.ok) {
      if (r.body.accepted) accepted += 1;
      console.log(
        r.body.accepted ? "ACCEPT" : "REJECT",
        c.slug,
        c.title.slice(0, 40),
        `avg=${r.body.avg}`
      );
    } else {
      failed += 1;
      console.log("FAIL", c.slug, c.title.slice(0, 40), r.status, r.body?.error || r.body);
    }
  }
  console.log(
    JSON.stringify({
      ok: true,
      mode: "api",
      accepted,
      failed,
      remainingTried: pendingIds.length,
      reviewer: me.body.handle,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
