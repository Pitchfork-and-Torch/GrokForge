import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { NetworkTrustSnapshot } from "@/lib/network-trust";

/**
 * Public trust strip for home + forge (Network Gravity).
 * Honest counts only - no vanity inflation.
 */
export function NetworkTrustStrip({
  trust,
  compact = false,
}: {
  trust: NetworkTrustSnapshot;
  compact?: boolean;
}) {
  const items: {
    label: string;
    value: number | string;
    href?: string;
    warn?: boolean;
    hint?: string;
  }[] = [
    {
      label: "Pending reviews",
      value: trust.pendingReviews,
      href: "/tasks?review=1",
      warn: trust.pendingReviews > 0,
      hint:
        trust.stalePending > 0
          ? `${trust.stalePending} older than 24h`
          : "clear queue to unlock ready-set",
    },
    {
      label: "Accepted (7d)",
      value: trust.acceptedLast7d,
      href: "/activity",
    },
    {
      label: "Claimable leaves",
      value: trust.claimableLeaves,
      href: "/tasks?ready=1",
    },
    {
      label: "Builders",
      value: trust.builders,
      href: "/leaderboard",
    },
    {
      label: "Sealed ships",
      value: trust.sealedPackages,
      href: "/ships",
    },
    {
      label: "Workers live",
      value: trust.workersOnline,
      href: "/forge",
      hint:
        trust.strongWorkersOnline > 0
          ? `${trust.strongWorkersOnline} strong-worker`
          : "Anvil+ quality auto-accept",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100">
          Network trust
        </Badge>
        {items.slice(0, 4).map((it) => (
          <Link
            key={it.label}
            href={it.href || "/forge"}
            className={`rounded-full border px-2.5 py-1 tabular-nums ${
              it.warn
                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                : "border-white/10 bg-white/5 text-stone-300"
            } hover:border-amber-500/40`}
          >
            <span className="font-semibold text-white">{it.value}</span>{" "}
            <span className="text-stone-500">{it.label.toLowerCase()}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <Card className="space-y-3 border-emerald-500/20 bg-emerald-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-emerald-100">
            Network trust
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Review velocity unblocks ready-set and workers. Strong-worker tier
            (Anvil+) quality-auto-accepts structured agent submits on
            non-dual-key leaves.
            {trust.dualKeyProjects > 0
              ? ` ${trust.dualKeyProjects} project(s) require dual-key on large leaves.`
              : ""}
          </p>
        </div>
        <Link
          href="/tasks?review=1"
          className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
        >
          Clear review queue
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
        {items.map((it) => {
          const inner = (
            <>
              <p className="text-[10px] uppercase tracking-wide text-stone-500">
                {it.label}
              </p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  it.warn ? "text-amber-200" : "text-white"
                }`}
              >
                {it.value}
              </p>
              {it.hint && (
                <p className="mt-0.5 text-[10px] text-stone-600">{it.hint}</p>
              )}
            </>
          );
          const cls =
            "rounded-xl border border-white/10 bg-black/35 px-3 py-2 transition hover:border-emerald-500/30";
          return it.href ? (
            <Link key={it.label} href={it.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={it.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-stone-600">
        Snapshot {trust.generatedAt.slice(0, 16).replace("T", " ")} UTC
      </p>
    </Card>
  );
}
