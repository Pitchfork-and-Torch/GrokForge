import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { authFlags } from "@/lib/auth";
import { rateLimitBackend } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  getPublishOrg,
  githubPublishConfigured,
} from "@/lib/github-publish";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  let stats: {
    activeProjects: number;
    openLeafTasks: number;
    acceptedWork: number;
    builders: number;
  } | null = null;
  try {
    const [activeProjects, openLeafTasks, acceptedWork, builders] =
      await Promise.all([
        prisma.project.count({ where: { status: "ACTIVE" } }),
        prisma.task.count({
          where: {
            status: "OPEN",
            parentId: { not: null },
            project: { status: { in: ["ACTIVE", "FUNDED"] } },
          },
        }),
        prisma.contribution.count({ where: { status: "ACCEPTED" } }),
        prisma.user.count({
          where: {
            OR: [
              { contributions: { some: {} } },
              { donations: { some: {} } },
              { projects: { some: {} } },
            ],
          },
        }),
      ]);
    stats = { activeProjects, openLeafTasks, acceptedWork, builders };
  } catch {
    stats = null;
  }

  const features = {
    twitterConfigured: authFlags.twitterConfigured,
    demoAuthEnabled: authFlags.demoAuthEnabled,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    rateLimitBackend: rateLimitBackend(),
    notifyWebhook: Boolean(process.env.NOTIFY_WEBHOOK_URL?.trim()),
    claimExpireCron: Boolean(process.env.CRON_SECRET?.trim()),
    claimAutoExpire: true,
    watches: true,
    openTasksBoard: true,
    creatorModeration: true,
    creatorBulkAccept: true,
  };

  const rows: { k: string; v: string; ok?: boolean }[] = [
    { k: "Sign in with X", v: features.twitterConfigured ? "configured" : "missing", ok: features.twitterConfigured },
    { k: "Stripe Checkout", v: features.stripeConfigured ? "live" : "demo ledger", ok: features.stripeConfigured },
    { k: "Rate limits", v: features.rateLimitBackend, ok: true },
    { k: "Notify bridge", v: features.notifyWebhook ? "agent-email" : "in-app only", ok: true },
    { k: "Claim expire cron", v: features.claimExpireCron ? "armed" : "soft-expire only", ok: features.claimExpireCron },
    { k: "Creator moderation", v: "accept / reject / bulk", ok: true },
    { k: "Themes", v: "11 (Control Center)", ok: true },
    { k: "X Money tips", v: "profile P2P ledger", ok: true },
    { k: "Activity poll", v: "/api/activity", ok: true },
    {
      k: "GitHub OAuth",
      v: authFlags.githubConfigured ? "configured" : "URL-link only",
      ok: true,
    },
    {
      k: "Ship to GitHub",
      v: githubPublishConfigured()
        ? `org ${getPublishOrg()}`
        : "token unset (ZIP only)",
      ok: githubPublishConfigured(),
    },
    { k: "Sealed ships gallery", v: "/ships", ok: true },
    { k: "Matching funds", v: "pool + ratio bps", ok: true },
    { k: "Agent OpenAPI", v: "/openapi-agent-v1.json", ok: true },
    { k: "Milestone dual verify", v: "human + agent", ok: true },
    { k: "Task matching", v: "affinity scorer", ok: true },
    { k: "Demo auth", v: features.demoAuthEnabled ? "ON (dev)" : "off", ok: !features.demoAuthEnabled },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Badge>Public · no secrets</Badge>
        <h1 className="mt-2 text-3xl font-bold text-white">System status</h1>
        <p className="mt-1 text-stone-400">
          GrokForge capability flags and live counts. For machines use{" "}
          <Link href="/api/stats" className="text-amber-400 hover:underline">
            /api/stats
          </Link>{" "}
          and{" "}
          <Link href="/api/auth/flags" className="text-amber-400 hover:underline">
            /api/auth/flags
          </Link>
          .
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: "Projects", v: String(stats.activeProjects) },
            { k: "Open tasks", v: String(stats.openLeafTasks) },
            { k: "Accepted", v: String(stats.acceptedWork) },
            { k: "Builders", v: String(stats.builders) },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-2xl border border-amber-900/35 bg-black/40 px-3 py-2.5"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                {s.k}
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-amber-200">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="divide-y divide-white/5 overflow-hidden p-0">
        {rows.map((r) => (
          <div
            key={r.k}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span className="text-stone-300">{r.k}</span>
            <span
              className={
                r.ok === false
                  ? "font-medium text-rose-300"
                  : "font-medium text-amber-200/90"
              }
            >
              {r.v}
            </span>
          </div>
        ))}
      </Card>

      <p className="text-xs text-stone-600">
        Generated {new Date().toISOString().slice(0, 19)}Z ·{" "}
        <Link href="/activity" className="text-amber-400 hover:underline">
          Network activity
        </Link>
      </p>
    </div>
  );
}
