"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectAction } from "@/lib/actions";
import { ProjectBannerField } from "@/components/project-banner-field";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export function EditProjectForm({
  projectId,
  title,
  description,
  impactSummary,
  license,
  bannerUrl,
  status,
  defaultOpen = false,
  compactTrigger = false,
}: {
  projectId: string;
  title: string;
  description: string;
  impactSummary: string | null;
  license: string;
  bannerUrl?: string | null;
  /** Project status for helper copy (ACTIVE / FUNDED / COMPLETED / etc.) */
  status?: string;
  defaultOpen?: boolean;
  /** Smaller button for placement next to the title */
  compactTrigger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  // Deep-link: /projects/slug#edit-project opens the form
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#edit-project") {
      setOpen(true);
    }
    const onHash = () => {
      if (window.location.hash === "#edit-project") setOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const live =
    !status ||
    status === "ACTIVE" ||
    status === "FUNDED" ||
    status === "COMPLETED";

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        id="edit-project"
        className={compactTrigger ? "text-xs" : undefined}
        onClick={() => {
          setError(null);
          setOk(false);
          setOpen(true);
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", "#edit-project");
          }
        }}
      >
        Edit name &amp; description
      </Button>
    );
  }

  return (
    <div id="edit-project" className="scroll-mt-24">
    <Card className="space-y-3 border-amber-900/50">
      <div>
        <h3 className="text-sm font-semibold text-white">
          Edit name &amp; description
        </h3>
        <p className="mt-1 text-[11px] text-stone-500">
          {live
            ? "You can update the public title and description anytime while the project is live. Slug/URL stays the same. Archived projects must be restored first."
            : "Update the public title and description. Restore the project if it is archived."}
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("projectId", projectId);
          start(async () => {
            const res = await updateProjectAction(fd);
            if (res && "error" in res) {
              setError(res.error);
              setOk(false);
            } else {
              setError(null);
              setOk(true);
              // Keep form open briefly so success shows, then refresh server props
              router.refresh();
              window.setTimeout(() => {
                setOpen(false);
                setOk(false);
                if (typeof window !== "undefined") {
                  window.history.replaceState(
                    null,
                    "",
                    window.location.pathname + window.location.search
                  );
                }
              }, 600);
            }
          });
        }}
      >
        <div>
          <Label htmlFor="edit-title">Name (title)</Label>
          <Input
            id="edit-title"
            name="title"
            defaultValue={title}
            required
            minLength={5}
            maxLength={120}
            key={`title-${title}`}
          />
          <p className="mt-1 text-[10px] text-stone-600">5-120 characters</p>
        </div>
        <div>
          <Label htmlFor="edit-desc">Description</Label>
          <Textarea
            id="edit-desc"
            name="description"
            defaultValue={description}
            required
            minLength={40}
            maxLength={8000}
            className="min-h-[140px]"
            key={`desc-${description.slice(0, 40)}`}
          />
          <p className="mt-1 text-[10px] text-stone-600">40-8000 characters</p>
        </div>
        <div>
          <Label htmlFor="edit-impact">Impact summary (optional)</Label>
          <Textarea
            id="edit-impact"
            name="impactSummary"
            defaultValue={impactSummary || ""}
            maxLength={2000}
            className="min-h-[60px]"
            key={`impact-${impactSummary || ""}`}
          />
        </div>
        <div>
          <Label htmlFor="edit-license">License</Label>
          <Input
            id="edit-license"
            name="license"
            defaultValue={license}
            required
            minLength={2}
            maxLength={40}
            key={`license-${license}`}
          />
        </div>
        <ProjectBannerField mode="edit" existingUrl={bannerUrl} />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {ok && (
          <p className="text-xs text-emerald-400">
            Saved. Public page updating…
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setError(null);
              if (typeof window !== "undefined") {
                window.history.replaceState(
                  null,
                  "",
                  window.location.pathname + window.location.search
                );
              }
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
    </div>
  );
}
