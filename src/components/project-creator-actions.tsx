"use client";

import { useState, useTransition } from "react";
import {
  archiveProjectAction,
  deleteProjectAction,
  unarchiveProjectAction,
} from "@/lib/actions";
import { Button } from "@/components/ui";

export function ProjectCreatorActions({
  projectId,
  title,
  status,
  hasSupport,
  compact = false,
}: {
  projectId: string;
  title: string;
  status: string;
  hasSupport: boolean;
  compact?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const archived = status === "ARCHIVED";

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "space-y-2"}>
      {!archived && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className={compact ? "" : "w-full sm:w-auto"}
          onClick={() => {
            if (
              !window.confirm(
                `Archive "${title}"?\n\nIt will leave discovery listings. You can restore it later.`
              )
            ) {
              return;
            }
            start(async () => {
              const res = await archiveProjectAction(projectId);
              if (res?.error) setError(res.error);
              else setError(null);
            });
          }}
        >
          {pending ? "Working..." : "Archive"}
        </Button>
      )}
      {archived && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await unarchiveProjectAction(projectId);
              if (res?.error) setError(res.error);
              else setError(null);
            })
          }
        >
          {pending ? "Working..." : "Restore active"}
        </Button>
      )}
      {!hasSupport && !archived && (
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          className={compact ? "" : "w-full sm:w-auto"}
          onClick={() => {
            if (
              !window.confirm(
                `Permanently delete "${title}"?\n\nOnly allowed with zero capital support. Cannot be undone.`
              )
            ) {
              return;
            }
            start(async () => {
              const res = await deleteProjectAction(projectId);
              if (res?.error) setError(res.error);
            });
          }}
        >
          {pending ? "Deleting..." : "Delete"}
        </Button>
      )}
      {!compact && hasSupport && !archived && (
        <p className="text-[11px] text-stone-600">
          Supported projects cannot be deleted. Archive hides them from discovery.
        </p>
      )}
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </div>
  );
}
