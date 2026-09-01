import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card } from "@/components/ui";
import { ProjectCompletedBadge } from "@/components/project-completed-badge";
import { ShareProjectButton } from "@/components/share-project-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PublishGitHubButton } from "@/components/publish-github-button";
import { CreatorGitHubPublish } from "@/components/creator-github-publish";
import { ShipChecklist } from "@/components/ship-checklist";
import { SkillPackInstall } from "@/components/skill-pack-install";
import { getOptionalUser } from "@/lib/session";
import { isFounderHandle } from "@/lib/identity";
import {
  githubPublishConfigured,
  getPublishOrg,
  repoNameFromSlug,
} from "@/lib/github-publish";
import {
  buildPackageFiles,
  buildTaskTree,
  previewTreeLines,
} from "@/lib/seal-package";

export const dynamic = "force-dynamic";

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.project.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });
  if (!p) return { title: "Sealed package | GrokForge" };
  return {
    title: `${p.title} - Sealed package | GrokForge`,
    description: p.description.slice(0, 160),
    openGraph: {
      title: `${p.title} (sealed)`,
      description: p.description.slice(0, 160),
      url: `${site}/projects/${slug}/ship`,
    },
  };
}

export default async function ShipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      proposer: { select: { id: true, handle: true, name: true } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          contributions: {
            where: { status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  handle: true,
                  name: true,
                  githubHandle: true,
                },
              },
            },
          },
        },
      },
      artifacts: {
        where: { source: { in: ["package", "github"] } },
        orderBy: { createdAt: "desc" },
        include: {
          sealedBy: { select: { handle: true } },
        },
      },
    },
  });
  if (!project) notFound();

  const packageArts = project.artifacts.filter((a) => a.source === "package");
  const githubArt =
    project.artifacts.find((a) => a.source === "github" && a.url) || null;
  const primary =
    packageArts.find((a) => a.isPrimary) || packageArts[0];
  if (!primary) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-white">Not sealed yet</h1>
        <p className="text-stone-400">
          This project does not have a Seal &amp; Ship package. When the creator seals it, the
          downloadable ZIP and this permanent page appear here.
        </p>
        <Link href={`/projects/${slug}`} className="text-amber-400 hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  const tree = buildTaskTree(project.tasks);
  const files = buildPackageFiles({
    slug: project.slug,
    title: project.title,
    description: project.description,
    license: project.license,
    version: primary.version || "v1.0.0",
    sealNote: primary.sealNote || project.impactSummary || "",
    packageTitle: primary.title.replace(/\s*\([^)]*\)\s*package\s*$/i, "").trim(),
    proposerHandle: project.proposer.handle,
    sealedAt: primary.createdAt.toISOString(),
    tree,
    siteUrl: site,
  });
  const paths = previewTreeLines(files);

  const contributors = new Map<
    string,
    { handle: string | null; name: string | null; githubHandle: string | null }
  >();
  for (const t of project.tasks) {
    for (const c of t.contributions) {
      contributors.set(c.user.id, {
        handle: c.user.handle,
        name: c.user.name,
        githubHandle: c.user.githubHandle || null,
      });
    }
  }

  const sessionUser = await getOptionalUser();
  const isCreator = Boolean(
    sessionUser?.id && sessionUser.id === project.proposer.id
  );
  const canPublish =
    isFounderHandle(sessionUser?.handle) || isCreator;
  const ghConfigured = githubPublishConfigured();

  const sealedLabel = primary.createdAt
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  const downloadUrl = `${site}/api/projects/${slug}/package`;
  const skillPackUrl = `${site}/api/projects/${slug}/skill-pack`;
  const shipUrl = `${site}/projects/${slug}/ship`;
  const citation = `${project.title} (${primary.version || "v1.0.0"}). Sealed on GrokForge. ${shipUrl}`;

  // Hierarchical preview bodies
  const leaves: { title: string; body: string; handle: string | null }[] = [];
  const walk = (nodes: ReturnType<typeof buildTaskTree>, prefix = "") => {
    for (const n of nodes) {
      const label = prefix ? `${prefix} / ${n.title}` : n.title;
      if (n.acceptedContribution) {
        leaves.push({
          title: label,
          body: n.acceptedContribution.body,
          handle: n.acceptedContribution.user.handle,
        });
      }
      if (n.children?.length) walk(n.children, label);
    }
  };
  walk(tree);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectCompletedBadge size="md" label="Sealed" />
          <Badge className="border-white/10 bg-white/5 text-stone-300">
            {primary.version || "v1.0.0"}
          </Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-400">
            {project.license}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{project.title}</h1>
        <p className="text-sm text-stone-500">
          Sealed on {sealedLabel} UTC
          {primary.sealedBy?.handle ? ` by @${primary.sealedBy.handle}` : ""}
          {primary.contentHash ? (
            <>
              {" · "}
              <span className="font-mono text-[11px] text-stone-600">
                sha256:{primary.contentHash.slice(0, 12)}...
              </span>
            </>
          ) : null}
        </p>
        <p className="max-w-2xl text-stone-400 whitespace-pre-wrap">
          {primary.sealNote || project.impactSummary || project.description}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a href={downloadUrl}>
            <Button className="!bg-amber-400 !px-5 !py-2.5 !font-black !text-black shadow-[0_0_28px_rgba(245,158,11,0.4)]">
              Download GitHub-ready ZIP
            </Button>
          </a>
          <a href={`${skillPackUrl}?download=1`}>
            <Button variant="secondary">Download skill pack</Button>
          </a>
          {githubArt?.url ? (
            <a href={githubArt.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="!border-emerald-500/40 !text-emerald-100">
                Open on GitHub
              </Button>
            </a>
          ) : null}
          <Link href={`/projects/${slug}`}>
            <Button variant="secondary">Live project</Button>
          </Link>
          <ShareProjectButton title={`${project.title} (sealed)`} slug={`${slug}/ship`} siteUrl={site} />
          <CopyLinkButton url={shipUrl} />
        </div>
        <p className="text-[11px] text-stone-600">
          ZIP includes README, LICENSE, CONTRIBUTORS, NOTICE, GITHUB.md, and hierarchical{" "}
          <code className="text-stone-500">tasks/</code> deliverables. Skill pack JSON writes under{" "}
          <code className="text-stone-500">~/.grok/skills/&lt;slug&gt;/</code> for Grok Build agents.
          Ready for a public repo under {getPublishOrg()} or your own account.
        </p>
      </div>

      <ShipChecklist
        slug={slug}
        title={project.title}
        hasPackage
        hasGithub={!!githubArt?.url}
        githubUrl={githubArt?.url}
        downloadUrl={downloadUrl}
        skillPackUrl={`${skillPackUrl}?download=1`}
        shipUrl={shipUrl}
        canPublish={canPublish}
      />

      <SkillPackInstall
        slug={slug}
        title={project.title}
        skillPackApiUrl={skillPackUrl}
        firstLeafHref={`/projects/${slug}#ready-set`}
      />

      <PublishGitHubButton
        projectId={project.id}
        defaultRepoName={repoNameFromSlug(
          githubArt?.githubRepo?.split("/")[1] || project.slug
        )}
        existingUrl={githubArt?.url}
        configured={ghConfigured}
        canPublish={canPublish}
      />

      <CreatorGitHubPublish
        projectId={project.id}
        slug={project.slug}
        existingUrl={githubArt?.url}
        isCreator={isCreator || canPublish}
      />

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Citation</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 p-3 text-xs text-stone-300">
          {citation}
        </pre>
        <CopyLinkButton url={citation} />
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Package contents</h2>
        <Card className="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed text-stone-400">
          <ul className="space-y-0.5 p-1">
            {paths.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Credits</h2>
        <ul className="flex flex-wrap gap-2">
          {[...contributors.entries()].map(([id, c]) => (
            <li key={id} className="flex items-center gap-1">
              {c.handle ? (
                <Link
                  href={`/u/${c.handle}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-amber-300 hover:border-amber-500/30"
                >
                  @{c.handle}
                </Link>
              ) : (
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">
                  {c.name || "builder"}
                </span>
              )}
              {c.githubHandle ? (
                <a
                  href={`https://github.com/${c.githubHandle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-stone-500 hover:text-stone-300"
                  title="GitHub"
                >
                  gh
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Hierarchical preview</h2>
        <div className="space-y-3">
          {leaves.map((leaf, i) => (
            <details
              key={`${leaf.title}-${i}`}
              className="rounded-xl border border-white/10 bg-[#121212]/90 open:border-amber-500/25"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-200">
                {leaf.title}
                {leaf.handle ? (
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    @{leaf.handle}
                  </span>
                ) : null}
              </summary>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-white/5 p-4 text-xs text-stone-400">
                {leaf.body}
              </pre>
            </details>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-stone-600">
        Public ledger:{" "}
        <Link href={`/projects/${slug}`} className="text-amber-500/80 hover:underline">
          project page
        </Link>
        {" · "}
        Forged on GrokForge
      </p>
    </div>
  );
}
