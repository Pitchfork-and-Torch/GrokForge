"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addProjectCommentAction,
  deleteProjectCommentAction,
  hideProjectCommentAction,
  unhideProjectCommentAction,
  reportProjectCommentAction,
} from "@/lib/actions";
import { Button, Card, Textarea, Label } from "@/components/ui";

export type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  hidden: boolean;
  user: { id: string; handle: string | null; name: string | null };
};

export function ProjectComments({
  projectId,
  comments,
  signedIn,
  currentUserId,
  isCreator,
}: {
  projectId: string;
  comments: CommentRow[];
  signedIn: boolean;
  currentUserId?: string | null;
  isCreator: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const visible = comments.filter((c) => !c.hidden || isCreator);

  return (
    <section aria-labelledby="comments-heading" className="space-y-3">
      <h2 id="comments-heading" className="text-xl font-semibold text-white">
        Discussion
      </h2>
      <Card className="space-y-4">
        {signedIn ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              fd.set("projectId", projectId);
              start(async () => {
                try {
                  const res = await addProjectCommentAction(fd);
                  if (res && "error" in res) setError(res.error ?? "Comment failed");
                  else {
                    setError(null);
                    try {
                      form.reset();
                    } catch {
                      /* form may unmount after revalidate */
                    }
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Comment failed");
                }
              });
            }}
          >
            <Label htmlFor="comment-body">Add a comment</Label>
            <Textarea
              id="comment-body"
              name="body"
              required
              minLength={2}
              maxLength={4000}
              placeholder="Ask about the proposal, offer help, or note risks..."
              className="min-h-[88px]"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Posting..." : "Post comment"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-stone-500">
            <Link href="/login" className="text-amber-400 hover:underline">
              Sign in with X
            </Link>{" "}
            to join the discussion.
          </p>
        )}

        <ul className="divide-y divide-white/5 border-t border-white/5">
          {visible.map((c) => {
            const canDelete =
              currentUserId && (c.user.id === currentUserId || isCreator);
            return (
              <li
                key={c.id}
                className={`py-3 first:pt-3 ${c.hidden ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm">
                    <Link
                      href={`/u/${c.user.handle || "anonymous"}`}
                      className="font-semibold text-amber-300 hover:underline"
                    >
                      @{c.user.handle || "anonymous"}
                    </Link>
                    <span className="ml-2 text-[11px] text-stone-600">
                      {c.createdAt}
                    </span>
                    {c.hidden && (
                      <span className="ml-2 text-[11px] text-rose-400">hidden</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {signedIn &&
                      currentUserId &&
                      c.user.id !== currentUserId &&
                      !c.hidden && (
                        <button
                          type="button"
                          disabled={pending}
                          className="text-[11px] text-stone-500 hover:text-amber-400"
                          onClick={() =>
                            start(async () => {
                              const res = await reportProjectCommentAction(c.id);
                              if (res && "error" in res) {
                                setError(res.error ?? "Report failed");
                              } else {
                                setError(null);
                              }
                            })
                          }
                        >
                          Report
                        </button>
                      )}
                    {isCreator && !c.hidden && (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-[11px] text-stone-500 hover:text-amber-400"
                        onClick={() =>
                          start(async () => {
                            const res = await hideProjectCommentAction(c.id);
                            if (res?.error) setError(res.error);
                          })
                        }
                      >
                        Hide
                      </button>
                    )}
                    {isCreator && c.hidden && (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-[11px] text-stone-500 hover:text-amber-400"
                        onClick={() =>
                          start(async () => {
                            const res = await unhideProjectCommentAction(c.id);
                            if (res?.error) setError(res.error);
                          })
                        }
                      >
                        Unhide
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-[11px] text-stone-500 hover:text-rose-400"
                        onClick={() =>
                          start(async () => {
                            const res = await deleteProjectCommentAction(c.id);
                            if (res?.error) setError(res.error);
                          })
                        }
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-300">
                  {c.hidden && !isCreator
                    ? "[Comment hidden by project creator]"
                    : c.body}
                </p>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="py-4 text-sm text-stone-500">
              No comments yet. Start the thread.
            </li>
          )}
        </ul>
      </Card>
    </section>
  );
}
