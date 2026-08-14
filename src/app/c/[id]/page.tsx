import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge, Button, Card } from "@/components/ui";
import { FounderBadge } from "@/components/founder-badge";
import { CopyLinkButton } from "@/components/copy-link-button";
import { isFounderHandle } from "@/lib/identity";
import { ContributionReviewPanel } from "@/components/contribution-review-panel";
import { ContentBody } from "@/components/content-body";
import { isAgentSubmission } from "@/lib/deliverable-quality";
import { tierForReputation } from "@/lib/reputation-tiers";

export const dynamic = "force-dynamic";

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.contribution.findUnique({
    where: { id },
    select: {
      status: true,
      user: { select: { handle: true } },
      task: { select: { title: true, project: { select: { title: true } } } },
    },
  });
  if (!c) return { title: "Receipt - GrokForge" };
  const handle = c.user.handle || "builder";
  const title = `@${handle} shipped: ${c.task.title}`;
  const description = `Contribution receipt on ${c.task.project.title} · status ${c.status} · GrokForge`;
  return {
    title: `${title} | GrokForge`,
    description,
    openGraph: {
      title,
      description,
      url: `${site}/c/${id}`,
      // opengraph-image.tsx generates a per-receipt card automatically
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ContributionReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const c = await prisma.contribution.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, handle: true, name: true, image: true, reputation: true } },
      task: {
        select: {
          id: true,
          title: true,
          estimatedTokens: true,
          project: {
            select: {
              slug: true,
              title: true,
              license: true,
              proposerId: true,
            },
          },
        },
      },
      reviews: {
        select: { score: true, notes: true, reviewer: { select: { handle: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!c) notFound();

  const handle = c.user.handle || "anonymous";
  const shareUrl = `${site}/c/${c.id}`;
  let canPeerReview = false;
  if (session?.user?.id) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { reputation: true, handle: true },
    });
    const tier = tierForReputation(me?.reputation ?? 0);
    canPeerReview =
      (tier.canPeerReview || isFounderHandle(me?.handle)) &&
      session.user.id !== c.userId;
  }
  const canDispute =
    !!session?.user?.id &&
    (session.user.id === c.userId ||
      session.user.id === c.task.project.proposerId ||
      isFounderHandle(session.user.handle));
  const canReopen =
    !!session?.user?.id &&
    (session.user.id === c.task.project.proposerId ||
      isFounderHandle(session.user.handle));
  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `I shipped on GrokForge: ${c.task.title}\n@${handle} · ${c.status}\n${shareUrl}`
  )}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Badge>Public contribution receipt</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {c.task.title}
        </h1>
        <p className="text-sm text-stone-400">
          On{" "}
          <Link
            href={`/projects/${c.task.project.slug}`}
            className="text-amber-400 hover:underline"
          >
            {c.task.project.title}
          </Link>{" "}
          · {c.task.project.license}
        </p>
      </div>

      <Card className="space-y-4 border-amber-500/30 bg-gradient-to-br from-[#121212] to-amber-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/u/${handle}`}
            className="text-lg font-semibold text-white hover:text-amber-300"
          >
            @{handle}
          </Link>
          {isFounderHandle(handle) && <FounderBadge />}
          <Badge className="border-white/10 bg-white/5 text-stone-300">{c.status}</Badge>
          {isAgentSubmission({
            sources: c.sources,
            contentType: c.contentType,
          }) && (
            <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-100">
              agent
            </Badge>
          )}
          {c.score != null && <Badge>{c.score}/5 peer score</Badge>}
        </div>
        <p className="text-xs uppercase tracking-widest text-stone-500">
          {c.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC ·{" "}
          {c.contentType}
          {c.task.estimatedTokens > 0 &&
            ` · ~${c.task.estimatedTokens.toLocaleString()} est. tokens`}
        </p>
        <ContentBody
          body={c.body}
          contentType={c.contentType}
          maxHeightClass="max-h-[min(90vh,56rem)]"
        />
        {c.sources && (
          <p className="text-xs text-stone-500">Sources: {c.sources}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <a href={intent} target="_blank" rel="noopener noreferrer">
            <Button>Share on X</Button>
          </a>
          <CopyLinkButton url={shareUrl} label="Copy receipt link" />
          <Link href={`/projects/${c.task.project.slug}#contribution-${c.id}`}>
            <Button variant="secondary">View on project</Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="ghost">Leaderboard</Button>
          </Link>
        </div>
        <p className="break-all text-[11px] text-stone-600">{shareUrl}</p>
      </Card>

      {c.reviews.length > 0 && (
        <Card>
          <h2 className="font-semibold text-white">Peer reviews</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-400">
            {c.reviews.map((r, i) => (
              <li key={i}>
                <span className="text-amber-300">@{r.reviewer.handle}</span> · {r.score}/5
                {r.notes ? ` - ${r.notes}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(canPeerReview || canDispute || canReopen) && (
        <ContributionReviewPanel
          contributionId={c.id}
          canPeerReview={canPeerReview}
          canDispute={canDispute}
          canReopen={canReopen}
          disputed={!!c.disputedAt}
        />
      )}
    </div>
  );
}
