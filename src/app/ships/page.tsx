import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge, Card, Button } from "@/components/ui";
import { publicProjectBlurb } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { ProjectCompletedBadge } from "@/components/project-completed-badge";
import { ShipSourceLinks } from "@/components/ship-source-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sealed ships | GrokForge",
  description:
    "Finished GrokForge packages: open-license ZIPs, permanent ship pages, and GitHub when published.",
};

export default async function ShipsGalleryPage() {
  const packages = await prisma.artifact.findMany({
    where: { source: "package", isPrimary: true },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          license: true,
          status: true,
          bannerUrl: true,
          proposer: { select: { handle: true } },
          artifacts: {
            where: { source: "github" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { url: true, githubRepo: true },
          },
        },
      },
      sealedBy: { select: { handle: true } },
    },
  });

  const ships = packages.filter((p) => p.project);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
          Seal &amp; Ship gallery
        </Badge>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Sealed ships</h1>
        <p className="max-w-2xl text-stone-400">
          Permanent open-license packages forged on GrokForge. Each ship has a public page,
          GitHub-ready ZIP, contributor credits, and optional org GitHub publish.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects?status=COMPLETED">
            <Button variant="secondary">Completed projects</Button>
          </Link>
          <Link href="/projects">
            <Button variant="secondary">All projects</Button>
          </Link>
        </div>
      </div>

      {ships.length === 0 ? (
        <EmptyState
          title="No sealed packages yet"
          body="When a project finishes every claimable leaf and the creator seals it, the package appears here."
        />
      ) : (
        <ul className="space-y-4">
          {ships.map((art) => {
            const p = art.project!;
            const gh = p.artifacts[0];
            const sealed = art.createdAt
              .toISOString()
              .slice(0, 10);
            return (
              <li key={art.id}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                  {p.bannerUrl ? (
                    <div className="gf-banner-stage w-full shrink-0 sm:w-52">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.bannerUrl}
                        alt=""
                        className="gf-project-thumb-img"
                      />
                    </div>
                  ) : (
                    <div className="hidden h-28 w-44 shrink-0 rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-black sm:block" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectCompletedBadge size="sm" label="Sealed" />
                      <Badge className="border-white/10 bg-white/5 text-stone-400">
                        {art.version || "v1"}
                      </Badge>
                      <Badge className="border-white/10 bg-white/5 text-stone-500">
                        {p.license}
                      </Badge>
                    </div>
                    <Link
                      href={`/projects/${p.slug}/ship`}
                      className="block text-lg font-semibold text-white hover:text-amber-200"
                    >
                      {p.title}
                    </Link>
                    <p className="line-clamp-2 text-sm text-stone-500">
                      {publicProjectBlurb(p.description)}
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Sealed {sealed}
                      {art.sealedBy?.handle ? ` by @${art.sealedBy.handle}` : ""}
                      {p.proposer.handle ? ` · proposed by @${p.proposer.handle}` : ""}
                      {art.contentHash
                        ? ` · sha256:${art.contentHash.slice(0, 10)}...`
                        : ""}
                    </p>
                    <ShipSourceLinks
                      slug={p.slug}
                      sealed
                      githubUrl={gh?.url}
                    />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
