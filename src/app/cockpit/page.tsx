import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card } from "@/components/ui";
import { DualVerifyQueue } from "@/components/dual-verify-queue";
import { ReadySetPanel } from "@/components/ready-set-panel";
import { projectTaskProgress, formatCents } from "@/lib/utils";
import { readyOpenLeaves } from "@/lib/task-dag";

export const dynamic = "force-dynamic";

/**
 * Creator cockpit: operate all owned live projects from one screen.
 */
export default async function CockpitPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/cockpit");

  const projects = await prisma.project.findMany({
    where: {
      proposerId: session.user.id,
      status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      fundPots: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          parentId: true,
          sortOrder: true,
          estimatedTokens: true,
          goodFirst: true,
          tags: true,
          dependsOnJson: true,
          contributions: {
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              createdAt: true,
              disputedAt: true,
              user: { select: { handle: true } },
              reviews: { select: { score: true } },
            },
          },
        },
      },
      artifacts: {
        where: { source: "package" },
        select: { id: true, version: true },
        take: 1,
      },
      _count: { select: { comments: true, thumbs: true } },
    },
  });

  const totalPending = projects.reduce(
    (s, p) =>
      s + p.tasks.reduce((ts, t) => ts + t.contributions.length, 0),
    0
  );
  const totalReady = projects.reduce(
    (s, p) => s + readyOpenLeaves(p.tasks).length,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-100">
            Creator OS
          </Badge>
          <h1 className="mt-2 text-3xl font-bold text-white">Cockpit</h1>
          <p className="mt-1 max-w-2xl text-stone-400">
            Operate live projects: dual-verify queue, ready-set leaves, match
            pools, and ship status. Labor first; funding goal culture stays $0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects/new">
            <Button>Propose</Button>
          </Link>
          <Link href="/quests">
            <Button variant="secondary">Quests</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-stone-500">
            Projects
          </p>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-stone-500">
            Pending reviews
          </p>
          <p className="text-2xl font-bold text-amber-200">{totalPending}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-stone-500">
            Ready leaves
          </p>
          <p className="text-2xl font-bold text-emerald-200">{totalReady}</p>
        </Card>
      </div>

      {projects.length === 0 && (
        <Card className="space-y-3">
          <p className="text-stone-400">
            You do not own any live projects yet.
          </p>
          <Link href="/projects/new">
            <Button>Propose your first project</Button>
          </Link>
        </Card>
      )}

      <div className="space-y-10">
        {projects.map((p) => {
          const progress = projectTaskProgress(p.tasks);
          const pendingItems = p.tasks.flatMap((t) =>
            t.contributions.map((c) => {
              const scores = c.reviews.map((r) => r.score);
              const peerAvgScore =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : null;
              return {
                id: c.id,
                taskId: t.id,
                taskTitle: t.title,
                handle: c.user.handle,
                createdAt:
                  c.createdAt.toISOString().slice(0, 16).replace("T", " ") +
                  " UTC",
                peerReviewCount: c.reviews.length,
                peerAvgScore,
                estimatedTokens: t.estimatedTokens,
                disputed: !!c.disputedAt,
              };
            })
          );
          const raised = p.fundPots.reduce((s, f) => s + f.balanceCents, 0);
          const sealed = p.artifacts[0];

          return (
            <section key={p.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="text-xl font-bold text-white hover:text-amber-200"
                    >
                      {p.title}
                    </Link>
                    <Badge className="border-white/10 bg-white/5 text-stone-300">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {progress.completed}/{progress.total} tasks ·{" "}
                    {p._count.thumbs} thumbs · {p._count.comments} comments ·
                    pots {formatCents(raised)}
                    {p.matchingEnabled
                      ? ` · match left ${formatCents(p.matchingRemainingCents)}`
                      : ""}
                    {sealed ? ` · sealed ${sealed.version || "pkg"}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/projects/${p.slug}/cockpit`}>
                    <Button variant="secondary">Project cockpit</Button>
                  </Link>
                  <Link href={`/projects/${p.slug}#edit-project`}>
                    <Button variant="ghost">Edit name</Button>
                  </Link>
                  {sealed && (
                    <Link href={`/projects/${p.slug}/ship`}>
                      <Button>Ship</Button>
                    </Link>
                  )}
                  {!sealed && progress.fullyComplete && (
                    <Link href={`/projects/${p.slug}/seal`}>
                      <Button>Seal</Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <DualVerifyQueue
                  projectId={p.id}
                  projectSlug={p.slug}
                  items={pendingItems}
                />
                <ReadySetPanel
                  projectSlug={p.slug}
                  tasks={p.tasks}
                  compact
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
