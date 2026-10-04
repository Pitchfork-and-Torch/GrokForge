"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

/** Prominent creator CTA when project is COMPLETED and ready to Seal & Ship. */
export function SealShipCta({
  slug,
  hasPrimaryPackage,
  className = "",
}: {
  slug: string;
  hasPrimaryPackage?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-400/45 bg-gradient-to-br from-amber-500/20 via-black/70 to-black/90 p-4 shadow-[0_0_40px_rgba(245,158,11,0.2)] sm:p-5 ${className}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 text-2xl"
          aria-hidden
        >
          ⚒
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Strike the Anvil
          </p>
          <h3 className="text-lg font-bold text-white">
            {hasPrimaryPackage ? "Re-seal & ship package" : "Seal & Ship"}
          </h3>
          <p className="mt-1 text-sm text-stone-400">
            {hasPrimaryPackage
              ? "All claimable work is accepted. Create a new versioned ZIP package and update the public ship page."
              : "All claimable work is accepted. Review deliverables, add your impact seal note, and publish a downloadable open-license package."}
          </p>
        </div>
        <Link href={`/projects/${slug}/seal`}>
          <Button className="!bg-amber-400 !px-5 !py-2.5 !text-sm !font-black !text-black shadow-[0_0_24px_rgba(245,158,11,0.45)] hover:!bg-amber-300">
            {hasPrimaryPackage ? "Strike again" : "Seal & Ship"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Compact public links to ship page + ZIP when already sealed. */
export function ViewShipPackageLink({ slug }: { slug: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link
        href={`/projects/${slug}/ship`}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:border-emerald-400/60"
      >
        <span aria-hidden>✓</span> Shipped source
      </Link>
      <a
        href={`/api/projects/${slug}/package`}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-100 hover:border-amber-400/50"
      >
        Download ZIP
      </a>
    </span>
  );
}
