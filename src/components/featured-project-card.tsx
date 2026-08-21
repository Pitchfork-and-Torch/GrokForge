"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pinFeaturedProjectAction } from "@/lib/actions";
import { Badge, Button, ProgressBar } from "@/components/ui";
import { ProjectThumbButton } from "@/components/project-thumb-button";
import { ProjectCompletedBadge } from "@/components/project-completed-badge";
import { ShipSourceLinks } from "@/components/ship-source-links";
import { ProjectBannerThumb } from "@/components/project-banner";
import { ShareProjectButton } from "@/components/share-project-button";
import { CATEGORY_LABELS, publicProjectBlurb } from "@/lib/utils";
import type { FeaturedProjectCard as FeaturedData } from "@/lib/site-stats";

export function FeaturedProjectCard({
  project,
  isFounder = false,
  signedIn = false,
  initiallyThumbed = false,
}: {
  project: FeaturedData;
  isFounder?: boolean;
  signedIn?: boolean;
  initiallyThumbed?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pct =
    project.totalTasks > 0
      ? (project.completedTasks / project.totalTasks) * 100
      : 0;

  const done = project.fullyComplete;
  // Treat fully-complete + package artifact; also tolerate missing sealed flag from older payloads
  const sealed = Boolean(project.sealed) || false;
  const showSource = sealed || done;
  return (
    <aside
      className={`relative flex h-auto w-full max-w-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-3.5 shadow-[0_0_48px_var(--glow)] sm:min-h-[14rem] sm:justify-between sm:p-5 lg:h-full lg:min-h-[16rem] ${
        done || sealed
          ? "border-emerald-500/40 from-emerald-500/15 via-[var(--background)]/95 to-[var(--background)]"
          : "border-[color:var(--accent)]/35 from-[color:var(--accent)]/10 via-[var(--background)]/95 to-[var(--background)]"
      }`}
      aria-label="Featured project"
    >
      <div className="min-w-0">
        <ProjectBannerThumb url={project.bannerUrl} title={project.title} />
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="rounded-full border border-[color:var(--accent)]/50 bg-[color:var(--accent)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
            Featured
          </span>
          {done && <ProjectCompletedBadge size="sm" />}
          <Badge className="border-white/10 bg-white/5 text-stone-300">
            {CATEGORY_LABELS[project.category] || project.category}
          </Badge>
          <Badge className="hidden border-amber-500/40 bg-amber-500/10 text-amber-100 sm:inline-flex">
            {project.thumbCount} thumbs-up
          </Badge>
        </div>
        <Link
          href={
            sealed
              ? `/projects/${project.slug}/ship`
              : `/projects/${project.slug}`
          }
          className="font-display mt-2 block text-lg font-bold leading-snug text-[var(--foreground)] hover:text-[var(--accent)] sm:mt-3 sm:text-2xl"
        >
          {project.title}
        </Link>
        <p className="mt-1.5 line-clamp-2 text-sm text-[var(--muted)] sm:mt-2 sm:line-clamp-3">
          {publicProjectBlurb(project.description, 200)}
        </p>
        {project.proposerHandle && (
          <p className="mt-1.5 text-xs text-stone-500 sm:mt-2">
            by{" "}
            <Link
              href={`/u/${project.proposerHandle}`}
              className="text-amber-400/90 hover:underline"
            >
              @{project.proposerHandle}
            </Link>
          </p>
        )}

        {/* Compact source access for completed / sealed pins */}
        {showSource && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3">
            {sealed ? (
              <>
                <Link
                  href={`/projects/${project.slug}/ship`}
                  className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100 hover:border-emerald-400/55 hover:bg-emerald-500/25"
                >
                  Source code
                </Link>
                <a
                  href={`/api/projects/${project.slug}/package`}
                  className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-100 hover:border-amber-400/55 hover:bg-amber-500/20"
                >
                  Download ZIP
                </a>
              </>
            ) : (
              <Link
                href={`/projects/${project.slug}`}
                className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/25"
              >
                Source code
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-stone-500">
            <span>
              {project.completedTasks} / {project.totalTasks} tasks done
            </span>
            <span>{project.totalTasks > 0 ? Math.round(pct) : 0}% complete</span>
          </div>
          <ProgressBar value={pct} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          {done ? (
            <span className="font-semibold text-emerald-300">All tasks accepted</span>
          ) : (
            <>
              <span>{project.openTasks} open</span>
              {project.claimedTasks > 0 && <span>{project.claimedTasks} claimed</span>}
              {project.submittedTasks > 0 && (
                <span>{project.submittedTasks} submitted</span>
              )}
            </>
          )}
          <span>{project.license}</span>
        </div>
        {/*
          Keep all actions inside the card box (no overflow paint over Live Forge).
          Solid surfaces on mobile so translucent pills cannot show content underneath.
        */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2.5 sm:gap-2 sm:border-0 sm:pt-0">
          <ProjectThumbButton
            projectId={project.id}
            initialCount={project.thumbCount}
            initiallyThumbed={initiallyThumbed}
            signedIn={signedIn}
            compact
          />
          <ShareProjectButton
            title={project.title}
            slug={project.slug}
            category={project.category}
            proposerHandle={project.proposerHandle}
            featured
            variant="compact"
          />
          <Link href={`/projects/${project.slug}`} className="min-w-0">
            <Button
              type="button"
              className="!bg-[#121212] !text-xs sm:!bg-white/5"
              variant="secondary"
            >
              Open project
            </Button>
          </Link>
          {sealed && (
            <ShipSourceLinks slug={project.slug} sealed compact />
          )}
          {isFounder && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="!text-xs"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await pinFeaturedProjectAction(null);
                  if (res?.error) setError(res.error);
                  else router.refresh();
                })
              }
            >
              {pending ? "..." : "Unpin"}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    </aside>
  );
}

/** Founder control to pin / unpin from a project page. */
export function FounderPinButton({
  projectId,
  isFeatured,
  isFounder,
}: {
  projectId: string;
  isFeatured: boolean;
  isFounder: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!isFounder) return null;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={isFeatured ? "secondary" : "ghost"}
        disabled={pending}
        className="!text-xs"
        title={
          isFeatured
            ? "Remove from home hero featured slot"
            : "Pin to home hero (right column)"
        }
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await pinFeaturedProjectAction(
              isFeatured ? null : projectId
            );
            if (res?.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "..." : isFeatured ? "Unpin featured" : "Pin as featured"}
      </Button>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
