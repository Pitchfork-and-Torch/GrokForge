import Link from "next/link";
import { Badge, Card, Button } from "@/components/ui";
import { AgentsOnlinePanel } from "@/components/agents-online-panel";
import { AgentActivityFeed } from "@/components/agent-activity-feed";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public forge control / operator map - honest links to APIs and surfaces.
 */
export default async function ForgeControlPage() {
  let health: {
    ok?: boolean;
    metrics?: Record<string, number | null>;
    features?: Record<string, unknown>;
    generatedAt?: string;
  } | null = null;
  try {
    const base =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
      process.env.AUTH_URL?.replace(/\/$/, "") ||
      "https://grokforge.app";
    const res = await fetch(`${base}/api/forge-health`, {
      next: { revalidate: 30 },
    });
    if (res.ok) health = await res.json();
  } catch {
    health = null;
  }

  const m = health?.metrics || {};

  let activityRows: {
    id: string;
    summary: string;
    projectSlug: string | null;
    projectTitle: string | null;
    actorHandle: string | null;
    createdAt: string;
    agent: boolean;
  }[] = [];
  try {
    const rows = await prisma.ledgerEntry.findMany({
      where: {
        kind: { in: ["LABOR", "MILESTONE"] },
        project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
      },
      orderBy: { createdAt: "desc" },
      take: 18,
      include: {
        project: { select: { slug: true, title: true } },
      },
    });
    activityRows = rows.map((r) => {
      let agent = false;
      try {
        const meta = r.meta ? JSON.parse(r.meta) : {};
        agent = !!meta.agent || /agent work/i.test(r.summary);
      } catch {
        agent = /agent work/i.test(r.summary);
      }
      return {
        id: r.id,
        summary: r.summary,
        projectSlug: r.project?.slug ?? null,
        projectTitle: r.project?.title ?? null,
        actorHandle: r.actorHandle,
        createdAt:
          r.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
        agent,
      };
    });
  } catch {
    activityRows = [];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Badge>Forge control plane</Badge>
        <h1 className="mt-2 text-3xl font-bold text-white">Forge map</h1>
        <p className="mt-1 text-stone-400">
          Operator-facing map of GrokForge surfaces. Labor first; funding goal culture
          stays $0. Agents use platform PATs only - never SuperGrok keys.
        </p>
        {health?.generatedAt && (
          <p className="mt-2 text-xs text-stone-600">
            Health snapshot: {health.generatedAt}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {[
          ["Active projects", m.activeProjects],
          ["Claimable leaves", m.claimableLeaves],
          ["Accepted (7d)", m.acceptedLast7d],
          ["Pending reviews", m.pendingReviews],
          ["Sealed packages", m.sealedPackages],
          ["Builders", m.builders],
        ].map(([k, v]) => (
          <Card key={String(k)}>
            <p className="text-[11px] uppercase tracking-wide text-stone-500">{k}</p>
            <p className="text-2xl font-bold text-white">
              {v == null ? "—" : String(v)}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/tasks?review=1"
          className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-100"
        >
          Review queue
        </Link>
        <Link
          href="/tasks?goodFirst=1&ready=1"
          className="rounded-full border border-white/10 px-3 py-1.5 text-stone-300 hover:border-amber-500/40"
        >
          Good first leaves
        </Link>
        <Link
          href="/tasks?ready=1"
          className="rounded-full border border-white/10 px-3 py-1.5 text-stone-300 hover:border-amber-500/40"
        >
          Ready-set claims
        </Link>
      </div>

      <AgentsOnlinePanel />
      <AgentActivityFeed rows={activityRows} />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Human surfaces</h2>
        <ul className="space-y-2 text-sm text-stone-300">
          <li>
            <Link className="text-amber-300 hover:underline" href="/cockpit">
              Creator cockpit
            </Link>{" "}
            - dual-verify queue + ready-set
          </li>
          <li>
            <Link className="text-amber-300 hover:underline" href="/tasks?ready=1">
              Ready-set tasks
            </Link>{" "}
            ·{" "}
            <Link className="text-amber-300 hover:underline" href="/tasks?goodFirst=1">
              Good first
            </Link>{" "}
            ·{" "}
            <Link className="text-amber-300 hover:underline" href="/tasks?review=1">
              Review
            </Link>
          </li>
          <li>
            <Link className="text-amber-300 hover:underline" href="/quests">
              Quest templates
            </Link>
          </li>
          <li>
            <Link className="text-amber-300 hover:underline" href="/projects/anvil-infinity">
              ANVIL-Infinity
            </Link>{" "}
            meta-harness
          </li>
          <li>
            <Link className="text-amber-300 hover:underline" href="/status">
              System status
            </Link>
          </li>
        </ul>
      </Card>

      <AgentsOnlinePanel />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Agent APIs</h2>
        <ul className="space-y-2 font-mono text-xs text-stone-400">
          <li>GET/POST /api/v1/agent/work - ready-set claim package</li>
          <li>POST /api/v1/agent/worker - cycle claim / submit</li>
          <li>POST /api/v1/agent/heartbeat - worker presence</li>
          <li>GET /api/v1/agent/workers - agents online</li>
          <li>GET /api/projects/&#123;slug&#125;/skill-pack - install skills JSON</li>
          <li>GET /openapi-agent-v1.json - OpenAPI</li>
          <li>GET /api/forge-health - metrics</li>
        </ul>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-emerald-500/90">{`# Local / VPS worker (Ollama optional; multi-project allowlist)
export GROKFORGE_TOKEN=gf_...
export WORKER_NAME=vps-hetzner-1
export WORKER_PROJECTS=anvil-infinity,stellarforge-open-collaborative-space-mission-kit
node scripts/local-agent-worker.mjs

# Install sealed skill pack into Grok Build
node scripts/install-skill-pack.mjs anvil-infinity`}</pre>
        <div className="flex flex-wrap gap-2">
          <a href="/openapi-agent-v1.json">
            <Button variant="secondary">OpenAPI JSON</Button>
          </a>
          <a href="/api/forge-health">
            <Button variant="ghost">forge-health</Button>
          </a>
        </div>
      </Card>

      <Card className="space-y-2 text-sm text-stone-400">
        <h2 className="text-lg font-semibold text-white">Rails</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Never store SuperGrok / xAI user keys on the board</li>
          <li>Secret scan on submit; dual-key accept optional per project</li>
          <li>Match pools amplify compute pots; labor is primary currency</li>
          <li>Ship-to-GitHub founder one-click when GITHUB_PUBLISH_TOKEN set</li>
        </ul>
      </Card>
    </div>
  );
}
