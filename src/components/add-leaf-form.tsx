"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLeafTaskAction } from "@/lib/expansion-actions";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export function AddLeafForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Add leaf task
      </Button>
    );
  }

  return (
    <Card className="space-y-3 border-amber-900/40">
      <h3 className="text-sm font-semibold text-white">Add OPEN leaf</h3>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("projectId", projectId);
          start(async () => {
            const res = await addLeafTaskAction(fd);
            if (res && "error" in res) setError(res.error ?? "Add leaf failed");
            else {
              setError(null);
              setOpen(false);
              router.refresh();
            }
          });
        }}
      >
        <div>
          <Label htmlFor="leaf-title">Title</Label>
          <Input id="leaf-title" name="title" required minLength={3} />
        </div>
        <div>
          <Label htmlFor="leaf-prompt">Prompt</Label>
          <Textarea id="leaf-prompt" name="prompt" required minLength={10} className="min-h-[80px]" />
        </div>
        <div>
          <Label htmlFor="leaf-acc">Acceptance</Label>
          <Textarea
            id="leaf-acc"
            name="acceptanceCriteria"
            required
            minLength={5}
            className="min-h-[60px]"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="leaf-tags">Tags (comma)</Label>
            <Input id="leaf-tags" name="tags" placeholder="science,docs,good-first" />
          </div>
          <div>
            <Label htmlFor="leaf-tok">Est. tokens</Label>
            <Input id="leaf-tok" name="estimatedTokens" type="number" defaultValue={8000} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-400">
          <input type="checkbox" name="goodFirst" value="1" />
          Mark as good-first leaf
        </label>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add leaf"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
