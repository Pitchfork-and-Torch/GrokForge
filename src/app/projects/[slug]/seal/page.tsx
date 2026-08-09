import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { SealForm } from "@/components/seal-form";
import { isFounderHandle } from "@/lib/identity";
import {
  buildPackageFiles,
  buildTaskTree,
  previewTreeLines,
} from "@/lib/seal-package";
import { projectTaskProgress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SealReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/projects/${slug}/seal`);
  }

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      proposer: { select: { id: true, handle: true } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          contributions: {
            where: { status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, handle: true, name: true } },
            },
          },
        },
      },
      artifacts: {
        where: { source: "package", isPrimary: true },
        take: 1,
      },
    },
  });
  if (!project) notFound();

  const isCreator = session.user.id === project.proposerId;
  const isFounder = isFounderHandle(session.user.handle);
  if (!isCreator && !isFounder) {
    redirect(`/projects/${slug}`);
  }

  const progress = projectTaskProgress(project.tasks);
  const ready =
    project.status === "COMPLETED" || progress.fullyComplete;

  const tree = buildTaskTree(project.tasks);
  const previewFiles = buildPackageFiles({
    slug: project.slug,
    title: project.title,
    description: project.description,
    license: project.license,
    version: "v1.0.0",
    sealNote: project.impactSummary || "Seal note will appear here.",
    proposerHandle: project.proposer.handle,
    sealedAt: new Date().toISOString(),
    tree,
  });
  const previewPaths = previewTreeLines(previewFiles);

  // Flatten accepted for review list
  const acceptedLeaves: {
    taskTitle: string;
    body: string;
    handle: string | null;
    contentType: string;
    id: string;
  }[] = [];
  const walk = (
    nodes: ReturnType<typeof buildTaskTree>,
    prefix = ""
  ) => {
    for (const n of nodes) {
      const label = prefix ? `${prefix} / ${n.title}` : n.title;
      if (n.acceptedContribution) {
        acceptedLeaves.push({
          taskTitle: label,
          body: n.acceptedContribution.body,
          handle: n.acceptedContribution.user.handle,
          contentType: n.acceptedContribution.contentType,
          id: n.acceptedContribution.id,
        });
      }
      if (n.children?.length) walk(n.children, label);
    }
  };
  walk(tree);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href={`/projects/${slug}`}
          className="text-xs text-amber-400 hover:underline"
        >
          ← Back to project
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-200">
            Strike the Anvil
          </Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-400">
            {project.status}
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-white">Seal & Ship</h1>
        <p className="mt-2 text-stone-400">
          Review every accepted deliverable, write your impact seal note, and publish a
          permanent downloadable package for{" "}
          <span className="text-stone-200">{project.title}</span>.
        </p>
      </div>

      {!ready && (
        <Card className="border-rose-500/30 bg-rose-500/5 text-sm text-rose-200">
          This project is not fully complete yet ({progress.completed}/
          {progress.total} claimable tasks accepted). Finish acceptances before sealing.
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Accepted hierarchy</h2>
        <p className="text-xs text-stone-500">
          {acceptedLeaves.length} accepted deliverable(s). These become files under{" "}
          <code className="text-stone-400">tasks/</code> in the ZIP.
        </p>
        <div className="space-y-3">
          {acceptedLeaves.map((leaf) => (
            <Card key={leaf.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="font-medium text-amber-200">{leaf.taskTitle}</span>
                <span>@{leaf.handle || "builder"}</span>
                <Badge className="border-white/10 bg-white/5 text-stone-400">
                  {leaf.contentType}
                </Badge>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 p-3 text-xs text-stone-300">
                {leaf.body.slice(0, 4000)}
                {leaf.body.length > 4000 ? "\n…" : ""}
              </pre>
            </Card>
          ))}
          {acceptedLeaves.length === 0 && (
            <p className="text-sm text-stone-500">No accepted contributions yet.</p>
          )}
        </div>
      </section>

      {ready && (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">Confirm seal</h2>
          <Card className="space-y-4 border-amber-500/25 bg-amber-500/5">
            <SealForm
              projectId={project.id}
              slug={project.slug}
              defaultTitle={project.title}
              defaultVersion={
                project.artifacts[0]?.version
                  ? bumpPatch(project.artifacts[0].version)
                  : "v1.0.0"
              }
              defaultNote={project.impactSummary || ""}
              previewPaths={previewPaths}
            />
          </Card>
        </section>
      )}
    </div>
  );
}

function bumpPatch(v: string): string {
  const m = v.replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return "v1.0.1";
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
