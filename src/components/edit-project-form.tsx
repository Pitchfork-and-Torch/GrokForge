"use client";

import { useState, useTransition } from "react";
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
}: {
  projectId: string;
  title: string;
  description: string;
  impactSummary: string | null;
  license: string;
  bannerUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Edit proposal
      </Button>
    );
  }

  return (
    <Card className="space-y-3 border-amber-900/50">
      <h3 className="text-sm font-semibold text-white">Edit proposal</h3>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("projectId", projectId);
          start(async () => {
            const res = await updateProjectAction(fd);
            if (res?.error) {
              setError(res.error);
              setOk(false);
            } else {
              setError(null);
              setOk(true);
              setOpen(false);
            }
          });
        }}
      >
        <div>
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" name="title" defaultValue={title} required minLength={5} />
        </div>
        <div>
          <Label htmlFor="edit-desc">Description</Label>
          <Textarea
            id="edit-desc"
            name="description"
            defaultValue={description}
            required
            minLength={40}
            className="min-h-[120px]"
          />
        </div>
        <div>
          <Label htmlFor="edit-impact">Impact summary</Label>
          <Textarea
            id="edit-impact"
            name="impactSummary"
            defaultValue={impactSummary || ""}
            className="min-h-[60px]"
          />
        </div>
        <div>
          <Label htmlFor="edit-license">License</Label>
          <Input id="edit-license" name="license" defaultValue={license} required />
        </div>
        <ProjectBannerField mode="edit" existingUrl={bannerUrl} />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {ok && <p className="text-xs text-emerald-400">Saved.</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
