"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  ClaimButton,
  CancelClaimButton,
  ReviewForm,
  SubmitForm,
  CreatorModerationBar,
} from "@/components/task-actions";
import { ContentBody } from "@/components/content-body";
import { ClaimShareButton } from "@/components/claim-share-button";
import { formatTokens } from "@/lib/utils";

export type TaskTreeNode = {
  id: string;
  title: string;
  prompt: string;
  acceptanceCriteria: string;
  estimatedTokens: number;
  status: string;
  parentId: string | null;
  sortOrder: number;
  children?: TaskTreeNode[];
  claims: {
    id: string;
    active: boolean;
    userId: string;
    expiresAt: string | null;
    user: { handle: string | null; name: string | null };
  }[];
  contributions: {
    id: string;
    body: string;
    sources: string | null;
    status: string;
    score: number | null;
    contentType: string;
    user: { id: string; handle: string | null };
    createdAtLabel: string;
  }[];
};

function statusTone(status: string): string {
  if (status === "ACCEPTED") {
    return "border-emerald-500/35 bg-emerald-500/15 text-emerald-200";
  }
  if (status === "SUBMITTED") {
    return "border-sky-500/35 bg-sky-500/10 text-sky-200";
  }
  if (status === "CLAIMED") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-100";
  }
  if (status === "OPEN") {
    return "border-white/15 bg-white/5 text-stone-300";
  }
  return "border-white/10 bg-white/5 text-stone-400";
}

function statusDot(status: string): string {
  if (status === "ACCEPTED") return "bg-emerald-400";
  if (status === "SUBMITTED") return "bg-sky-400";
  if (status === "CLAIMED") return "bg-amber-400";
  if (status === "OPEN") return "bg-stone-500";
  return "bg-stone-600";
}

function claimLabel(task: TaskTreeNode): string | null {
  const active = task.claims.find((c) => c.active);
  if (!active) return null;
  const who = active.user.handle || active.user.name || "builder";
  let left = "";
  if (active.expiresAt) {
    const ms = new Date(active.expiresAt).getTime() - Date.now();
    if (ms <= 0) left = " · expired";
    else left = ` · ~${Math.ceil(ms / (60 * 60 * 1000))}h left`;
  }
  return `@${who}${left}`;
}

function TaskCard({
  task,
  depth,
  signedIn,
  currentUserId,
  isCreator,
  expandAll,
  expandNonce,
  projectSlug,
}: {
  task: TaskTreeNode;
  depth: number;
  signedIn: boolean;
  currentUserId?: string | null;
  isCreator?: boolean;
  expandAll: boolean | null;
  expandNonce: number;
  projectSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (expandNonce === 0) return;
    if (expandAll !== null) setOpen(expandAll);
  }, [expandNonce, expandAll]);
  const expanded = open;

  const activeClaim = task.claims.find((c) => c.active);
  const myActiveClaim =
    currentUserId &&
    task.claims.find((c) => c.active && c.userId === currentUserId);
  const claimedBy = claimLabel(task);
  const pendingCount = task.contributions.filter((c) => c.status === "PENDING").length;
  const acceptedCount = task.contributions.filter((c) => c.status === "ACCEPTED").length;
  const isLeaf = !task.children || task.children.length === 0;
  const childAccepted =
    task.children?.filter((c) => c.status === "ACCEPTED").length ?? 0;
  const childTotal = task.children?.length ?? 0;
  const childDone =
    childTotal > 0 ? `${childAccepted}/${childTotal} child tasks done` : null;
  // Parents are containers - never "unclaimed" claimable leaves
  const allChildrenDone = childTotal > 0 && childAccepted === childTotal;
  const displayStatus =
    !isLeaf && task.status === "OPEN" && allChildrenDone
      ? "ACCEPTED"
      : !isLeaf && task.status === "OPEN"
        ? "PARENT"
        : task.status;
  const humanLabel =
    displayStatus === "ACCEPTED" || allChildrenDone
      ? "Done"
      : displayStatus === "PARENT"
        ? "Epic / parent"
        : displayStatus === "CLAIMED"
          ? "In progress"
          : displayStatus === "SUBMITTED"
            ? "Awaiting review"
            : displayStatus === "OPEN" && isLeaf
              ? "Unclaimed"
              : displayStatus === "OPEN"
                ? "Epic / parent"
                : displayStatus;

  return (
    <div
      id={`task-${task.id}`}
      className={depth ? "ml-3 scroll-mt-24 border-l border-amber-500/20 pl-3 sm:ml-4 sm:pl-4" : "scroll-mt-24"}
    >
      <Card
        className={`mb-3 space-y-0 overflow-hidden p-0 ${
          displayStatus === "ACCEPTED" || allChildrenDone
            ? "border-emerald-500/20"
            : task.status === "CLAIMED"
              ? "border-amber-500/25"
              : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-white/[0.03] sm:px-4"
          aria-expanded={expanded}
        >
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(
              displayStatus === "PARENT" ? "OPEN" : displayStatus === "ACCEPTED" || allChildrenDone ? "ACCEPTED" : task.status
            )}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-white sm:text-base">{task.title}</h3>
              <Badge
                className={statusTone(
                  displayStatus === "PARENT"
                    ? "OPEN"
                    : allChildrenDone
                      ? "ACCEPTED"
                      : task.status
                )}
              >
                {displayStatus === "PARENT" ? "PARENT" : allChildrenDone ? "ACCEPTED" : task.status}
              </Badge>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  humanLabel === "Done"
                    ? "text-emerald-300"
                    : humanLabel === "In progress"
                      ? "text-amber-200"
                      : humanLabel === "Awaiting review"
                        ? "text-sky-200"
                        : humanLabel === "Epic / parent"
                          ? "text-stone-400"
                          : "text-stone-500"
                }`}
              >
                {humanLabel}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
              <span>~{formatTokens(task.estimatedTokens)} tokens</span>
              {claimedBy && (
                <span className="text-amber-200/90">Claimed by {claimedBy}</span>
              )}
              {pendingCount > 0 && (
                <span className="text-sky-300/90">{pendingCount} pending submission(s)</span>
              )}
              {acceptedCount > 0 && task.status !== "ACCEPTED" && (
                <span className="text-emerald-300/80">{acceptedCount} accepted receipt(s)</span>
              )}
              {childDone && <span>{childDone}</span>}
            </div>
          </div>
          <span className="mt-0.5 shrink-0 text-xs font-semibold text-stone-500">
            {expanded ? "Hide" : "Details"}
            <span className="ml-1 inline-block text-amber-400/80" aria-hidden>
              {expanded ? "▴" : "▾"}
            </span>
          </span>
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-white/5 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              {signedIn && task.status === "OPEN" && task.parentId && (
                <ClaimButton taskId={task.id} />
              )}
              {myActiveClaim && <CancelClaimButton taskId={task.id} />}
              {task.parentId && projectSlug && (
                <ClaimShareButton
                  projectSlug={projectSlug}
                  taskId={task.id}
                  taskTitle={task.title}
                />
              )}
            </div>
            {activeClaim && (
              <p className="text-xs text-stone-500">
                Active claim: @{activeClaim.user.handle || activeClaim.user.name}
                {activeClaim.expiresAt &&
                  (() => {
                    const ms = new Date(activeClaim.expiresAt).getTime() - Date.now();
                    if (ms <= 0) return " · window expired";
                    const h = Math.ceil(ms / (60 * 60 * 1000));
                    return ` · ~${h}h left`;
                  })()}
              </p>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Prompt package
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-300">{task.prompt}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Acceptance criteria
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-400">
                {task.acceptanceCriteria}
              </p>
            </div>

            {signedIn &&
              task.parentId &&
              ["OPEN", "CLAIMED", "SUBMITTED"].includes(task.status) && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
                    Submit output (manual or from your own Grok)
                  </div>
                  <SubmitForm taskId={task.id} />
                </div>
              )}

            {task.contributions.map((c) => (
              <div
                key={c.id}
                id={`contribution-${c.id}`}
                className="rounded-xl border border-white/10 bg-[#121212]/90 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="text-amber-300">@{c.user.handle}</span>
                  <Badge className="border-white/10 bg-white/5 text-stone-300">
                    {c.status}
                  </Badge>
                  {c.score != null && <span>score {c.score}/5</span>}
                  <span>{c.contentType}</span>
                  <Link href={`/c/${c.id}`} className="text-amber-400 hover:underline">
                    receipt
                  </Link>
                  <span className="text-stone-600">{c.createdAtLabel}</span>
                </div>
                <div className="mt-2">
                  <ContentBody
                    body={c.body}
                    contentType={c.contentType}
                    className="text-xs"
                    maxHeightClass="max-h-[min(80vh,48rem)]"
                  />
                </div>
                {c.sources && (
                  <p className="mt-2 text-xs text-stone-500">Sources: {c.sources}</p>
                )}
                {signedIn && c.status === "PENDING" && (
                  <div className="mt-3 space-y-2">
                    {currentUserId && c.user.id !== currentUserId && (
                      <ReviewForm contributionId={c.id} />
                    )}
                    {isCreator && <CreatorModerationBar contributionId={c.id} />}
                    {!isCreator && currentUserId === c.user.id && (
                      <p className="text-xs text-stone-500">
                        Waiting for peer review or the project creator to accept.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {task.children?.map((child) => (
        <TaskCard
          key={child.id}
          task={child}
          depth={depth + 1}
          signedIn={signedIn}
          currentUserId={currentUserId}
          isCreator={isCreator}
          expandAll={expandAll}
          expandNonce={expandNonce}
          projectSlug={projectSlug}
        />
      ))}
    </div>
  );
}

function flattenTasks(nodes: TaskTreeNode[]): TaskTreeNode[] {
  const out: TaskTreeNode[] = [];
  const walk = (list: TaskTreeNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function countStatuses(nodes: TaskTreeNode[]): {
  open: number;
  claimed: number;
  submitted: number;
  accepted: number;
  total: number;
} {
  const flat = flattenTasks(nodes);
  const leaves = flat.filter((n) => n.parentId != null);
  const pool = leaves.length > 0 ? leaves : flat;
  return {
    total: pool.length,
    open: pool.filter((n) => n.status === "OPEN").length,
    claimed: pool.filter((n) => n.status === "CLAIMED").length,
    submitted: pool.filter((n) => n.status === "SUBMITTED").length,
    accepted: pool.filter((n) => n.status === "ACCEPTED").length,
  };
}

/** Task hierarchy: collapsed by default; status visible on the summary row. */
export function CollapsibleTaskTree({
  tree,
  signedIn,
  currentUserId,
  isCreator,
  projectSlug,
}: {
  tree: TaskTreeNode[];
  signedIn: boolean;
  currentUserId?: string | null;
  isCreator?: boolean;
  projectSlug?: string;
}) {
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [expandNonce, setExpandNonce] = useState(0);
  const summary = useMemo(() => countStatuses(tree), [tree]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Tasks
        </span>
        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
          {summary.accepted} done
        </Badge>
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">
          {summary.claimed} claimed
        </Badge>
        <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
          {summary.submitted} submitted
        </Badge>
        <Badge className="border-white/10 bg-white/5 text-stone-300">
          {summary.open} open
        </Badge>
        <span className="text-[11px] text-stone-600">
          of {summary.total} claimable
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-stone-300 hover:border-amber-500/30"
            onClick={() => {
              setExpandAll(true);
              setExpandNonce((n) => n + 1);
            }}
          >
            Expand all
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-stone-300 hover:border-amber-500/30"
            onClick={() => {
              setExpandAll(false);
              setExpandNonce((n) => n + 1);
            }}
          >
            Collapse all
          </button>
        </div>
      </div>

      {tree.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          depth={0}
          signedIn={signedIn}
          currentUserId={currentUserId}
          isCreator={isCreator}
          expandAll={expandAll}
          expandNonce={expandNonce}
          projectSlug={projectSlug}
        />
      ))}
    </div>
  );
}
