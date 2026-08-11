import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { CreatorAcceptButton } from "@/components/task-actions";

export type FlywheelPeerItem = {
  id: string;
  taskTitle: string;
  projectSlug: string;
  projectTitle: string;
  authorHandle: string | null;
  createdAtLabel: string;
  agent?: boolean;
};

export type FlywheelAwaitingItem = {
  id: string;
  taskTitle: string;
  projectSlug: string;
  createdAtLabel: string;
};

/**
 * Builder Flywheel: dual strip - review others / your work awaiting peers.
 */
export function BuilderFlywheelPanel({
  peerable,
  awaiting,
  signedIn,
}: {
  peerable: FlywheelPeerItem[];
  awaiting: FlywheelAwaitingItem[];
  signedIn: boolean;
}) {
  if (peerable.length === 0 && awaiting.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Builder flywheel</h2>
          <p className="text-sm text-stone-500">
            Peer-review others to unlock ready-set; track your pending submits.
            Second builders clear the network.
          </p>
        </div>
        <Link
          href="/tasks?review=1"
          className="text-xs font-semibold text-amber-400 hover:underline"
        >
          Full review queue
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="space-y-3 border-sky-500/25 bg-sky-500/5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-sky-100">
              Ready for you to review
            </h3>
            <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
              {peerable.length}
            </Badge>
          </div>
          {peerable.length === 0 ? (
            <p className="text-xs text-stone-500">
              No other builders&apos; pending work right now. Claim a leaf or
              invite a second builder.
            </p>
          ) : (
            <ul className="space-y-2">
              {peerable.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-black/35 px-3 py-2"
                >
                  <Link
                    href={`/c/${item.id}`}
                    className="text-sm font-medium text-white hover:text-amber-200"
                  >
                    {item.taskTitle}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    <Link
                      href={`/projects/${item.projectSlug}`}
                      className="text-amber-400/90 hover:underline"
                    >
                      {item.projectTitle}
                    </Link>
                    {item.authorHandle ? ` · @${item.authorHandle}` : ""} ·{" "}
                    {item.createdAtLabel}
                    {item.agent ? " · agent" : ""}
                  </p>
                  {signedIn && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link href={`/tasks?review=1`}>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2.5 !py-1 text-xs"
                        >
                          Open in queue
                        </Button>
                      </Link>
                      <Link
                        href={`/c/${item.id}`}
                        className="text-[11px] text-stone-400 hover:text-amber-300"
                      >
                        Receipt
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 border-violet-500/25 bg-violet-500/5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-violet-100">
              Your submits awaiting review
            </h3>
            <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-200">
              {awaiting.length}
            </Badge>
          </div>
          {awaiting.length === 0 ? (
            <p className="text-xs text-stone-500">
              Nothing waiting. Submit a leaf to spin the flywheel.
            </p>
          ) : (
            <ul className="space-y-2">
              {awaiting.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-black/35 px-3 py-2"
                >
                  <Link
                    href={`/c/${item.id}`}
                    className="text-sm font-medium text-white hover:text-amber-200"
                  >
                    {item.taskTitle}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    <Link
                      href={`/projects/${item.projectSlug}`}
                      className="text-amber-400/90 hover:underline"
                    >
                      /{item.projectSlug}
                    </Link>{" "}
                    · {item.createdAtLabel} · needs a peer (not you)
                  </p>
                </li>
              ))}
            </ul>
          )}
          {awaiting.length > 0 && (
            <p className="text-[11px] text-stone-500">
              Invite a second builder or wait for peer scores ≥3. Creators can
              still accept on the project page.
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}

/** Compact creator row for inbox-style accept (re-export friendly). */
export function FlywheelCreatorRow({
  contributionId,
  label,
}: {
  contributionId: string;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-stone-300">{label}</span>
      <CreatorAcceptButton contributionId={contributionId} />
    </div>
  );
}
