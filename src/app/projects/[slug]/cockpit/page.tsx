import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFounderHandle } from "@/lib/identity";
import { Badge, Button, Card } from "@/components/ui";
import { DualVerifyQueue } from "@/components/dual-verify-queue";
import { ReadySetPanel } from "@/components/ready-set-panel";
import { AddLeafForm } from "@/components/add-leaf-form";
import { MatchingFundsPanel } from "@/components/matching-funds-panel";
import { ProjectEditHistory } from "@/components/project-edit-history";
import { formatProjectCreatedAt } from "@/lib/edit-history";
import { formatCents, projectTaskProgress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectCockpitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/projects/${slug}/cockpit`);

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      fundPots: true,
      editHistory: { orderBy: { createdAt: "desc" }, take: 40 },
      artifacts: {
        where: { source: { in: ["package", "github"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      tasks: {
        orderBy: { sortOrder: "asc" },
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
    },
  });
  if (!project) notFound();

  const isCreator = project.proposerId === session.user.id;
  const isFounder = isFounderHandle(session.user.handle);
  if (!isCreator && !isFounder) {
    redirect(`/projects/${slug}`);
  }

  const progress = projectTaskProgress(project.tasks);
  const raised = project.fundPots.reduce((s, f) => s + f.balanceCents, 0);
  const created = formatProjectCreatedAt(project.createdAt);
  const pendingItems = project.tasks.flatMap((t) =>
    t.contributions.map((c) => {
      const scores = c.reviews.map((r) => r.score);
      return {
        id: c.id,
        taskId: t.id,
        taskTitle: t.title,
        handle: c.user.handle,
        createdAt:
          c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
        peerReviewCount: c.reviews.length,
        peerAvgScore:
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null,
        estimatedTokens: t.estimatedTokens,
        disputed: !!c.disputedAt,
      };
    })
  );
  const sealed = project.artifacts.find((a) => a.source === "package");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>Project cockpit</Badge>
          <h1 className="mt-2 text-3xl font-bold text-white">{project.title}</h1>
          <p className="mt-1 text-sm text-stone-400">
            Created{" "}
            <time dateTime={created.iso}>{created.absolute}</time> ({created.relative}) ·{" "}
            {progress.label} · pots {formatCents(raised)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/projects/${slug}`}>
            <Button variant="secondary">Public page</Button>
          </Link>
          <Link href="/cockpit">
            <Button variant="ghost">All projects</Button>
          </Link>
          {sealed ? (
            <Link href={`/projects/${slug}/ship`}>
              <Button>Ship</Button>
            </Link>
          ) : progress.fullyComplete ? (
            <Link href={`/projects/${slug}/seal`}>
              <Button>Seal</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DualVerifyQueue
          projectId={project.id}
          projectSlug={project.slug}
          items={pendingItems}
          requireDualKey={project.requireDualKey}
          dualKeyTokenThreshold={project.dualKeyTokenThreshold}
        />
        <div className="space-y-4">
          <ReadySetPanel projectSlug={project.slug} tasks={project.tasks} />
          {isCreator && project.status !== "ARCHIVED" && (
            <AddLeafForm projectId={project.id} />
          )}
        </div>
      </div>

      <MatchingFundsPanel
        projectId={project.id}
        projectSlug={project.slug}
        canEdit={isCreator || isFounder}
        signedIn
        matchingEnabled={project.matchingEnabled}
        matchingRatioBps={project.matchingRatioBps}
        matchingPoolCents={project.matchingPoolCents}
        matchingRemainingCents={project.matchingRemainingCents}
        requireDualKey={project.requireDualKey}
        dualKeyTokenThreshold={project.dualKeyTokenThreshold}
        stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY?.trim())}
      />

      <ProjectEditHistory
        createdAtIso={created.iso}
        createdAtLabel={created.absolute}
        rows={project.editHistory.map((h) => ({
          id: h.id,
          field: h.field,
          summary: h.summary,
          actorHandle: h.actorHandle,
          createdAt:
            h.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
          oldValue: h.oldValue,
          newValue: h.newValue,
        }))}
      />

      {project.artifacts.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-white">Artifacts</h2>
          <ul className="mt-2 space-y-1 text-sm text-stone-400">
            {project.artifacts.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  className="text-amber-300 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {a.title}
                </a>{" "}
                <span className="text-stone-600">
                  ({a.source}
                  {a.version ? ` ${a.version}` : ""})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
