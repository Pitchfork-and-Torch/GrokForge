"use client";

import { useRef, useState, useTransition } from "react";
import { createProjectAction } from "@/lib/actions";
import { ProjectBannerField } from "@/components/project-banner-field";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

const emptySub = {
  title: "",
  prompt: "",
  acceptanceCriteria: "",
  estimatedTokens: 8000,
};

export function NewProjectForm({
  initialTemplate,
}: {
  initialTemplate?: {
    title: string;
    description: string;
    category: string;
    license: string;
    impactSummary: string;
    masterPrompt: string;
    masterAcceptance: string;
    leaves: {
      title: string;
      prompt: string;
      acceptanceCriteria: string;
      estimatedTokens: number;
    }[];
  } | null;
} = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [subs, setSubs] = useState(
    initialTemplate?.leaves?.length
      ? initialTemplate.leaves
      : [
          {
            title: "Research subtask 1",
            prompt:
              "Describe the first nested agent task with a clear prompt package.",
            acceptanceCriteria:
              "Deliverable meets listed criteria with sources.",
            estimatedTokens: 12000,
          },
          {
            title: "Research subtask 2",
            prompt:
              "Second nested task - keep hierarchy shallow for MVP demos.",
            acceptanceCriteria: "Peer-reviewable output under open license.",
            estimatedTokens: 10000,
          },
        ]
  );
  const [masterPrompt, setMasterPrompt] = useState(
    initialTemplate?.masterPrompt ||
      "Coordinate nested multi-agent tasks toward the project outcome. Merge only verified open contributions. Funding goal is $0 - labor + compute only."
  );
  const [masterAcceptance, setMasterAcceptance] = useState(
    initialTemplate?.masterAcceptance ||
      "Nested tasks accepted; open-license artifact published; public ledger complete; funding goal remains $0."
  );
  const [error, setError] = useState<string | null>(null);
  const [decomposeNote, setDecomposeNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [decomposing, setDecomposing] = useState(false);

  async function onDecompose() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "");
    const description = String(fd.get("description") || "");
    const category = String(fd.get("category") || "OTHER");
    const license = String(fd.get("license") || "MIT");
    if (title.length < 5 || description.length < 40) {
      setError("Add a title (5+) and description (40+) before AI decompose.");
      return;
    }
    setDecomposing(true);
    setError(null);
    setDecomposeNote(null);
    try {
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, license }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Decompose failed");
        return;
      }
      if (data.masterPrompt) setMasterPrompt(data.masterPrompt);
      if (data.masterAcceptance) setMasterAcceptance(data.masterAcceptance);
      if (Array.isArray(data.subtasks) && data.subtasks.length) {
        setSubs(
          data.subtasks.map(
            (s: {
              title: string;
              prompt: string;
              acceptanceCriteria: string;
              estimatedTokens: number;
            }) => ({
              title: s.title,
              prompt: s.prompt,
              acceptanceCriteria: s.acceptanceCriteria,
              estimatedTokens: s.estimatedTokens || 10000,
            })
          )
        );
      }
      setDecomposeNote(
        data.source === "grok"
          ? `Filled by Grok (${data.model || "xAI"}). Review before publish.`
          : "Filled by local heuristic (no platform XAI_API_KEY or Grok fallback). Review before publish."
      );
    } catch {
      setError("Decompose request failed");
    } finally {
      setDecomposing(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("subtasksJson", JSON.stringify(subs.filter((s) => s.title && s.prompt)));
        start(async () => {
          const res = await createProjectAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Project basics</h2>
        <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100/90">
          No USD funding goal. Rank projects by tasks completed and compute support (API credits /
          SuperGrok), not a money target.
        </p>
        <div>
          <Label>Title</Label>
          <Input
            name="title"
            required
            minLength={5}
            placeholder="Open ocean plastic sensor mesh"
            defaultValue={initialTemplate?.title || ""}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            name="description"
            required
            minLength={40}
            placeholder="Impact, scope, how multi-agent hierarchy helps, open license commitment..."
            defaultValue={initialTemplate?.description || ""}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Impact category</Label>
            <select
              name="category"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100"
              defaultValue={initialTemplate?.category || "PUBLIC_GOODS_SOFTWARE"}
            >
              <option value="CLIMATE">Climate</option>
              <option value="OPEN_SCIENCE">Open Science</option>
              <option value="EDUCATION">Education</option>
              <option value="PUBLIC_GOODS_SOFTWARE">Public Goods Software</option>
              <option value="HEALTH">Health</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <Label>Open license</Label>
            <Input
              name="license"
              defaultValue={initialTemplate?.license || "MIT"}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Impact summary</Label>
            <Input
              name="impactSummary"
              placeholder="One-line greater-good outcome"
              defaultValue={initialTemplate?.impactSummary || ""}
            />
          </div>
          <div className="sm:col-span-2">
            <ProjectBannerField mode="create" defaultAutoImagine />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={decomposing} onClick={onDecompose}>
            {decomposing ? "Decomposing..." : "AI decompose tasks (Grok)"}
          </Button>
          <p className="text-xs text-stone-500">
            Uses platform XAI_API_KEY server-side only. Never asks for your SuperGrok credentials.
          </p>
        </div>
        {decomposeNote && <p className="text-xs text-emerald-400">{decomposeNote}</p>}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Hierarchical tasks</h2>
        <p className="text-sm text-stone-400">
          Master goal + nested tasks. Contributors claim leaves, run with their own Grok/API (or manual mode),
          and submit outputs. GrokForge never asks for their keys.
        </p>
        <div>
          <Label>Master goal prompt</Label>
          <Textarea
            name="masterPrompt"
            required
            minLength={20}
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
          />
        </div>
        <div>
          <Label>Master acceptance criteria</Label>
          <Textarea
            name="masterAcceptance"
            required
            minLength={10}
            value={masterAcceptance}
            onChange={(e) => setMasterAcceptance(e.target.value)}
          />
        </div>


        <div className="space-y-4">
          {subs.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                Nested task {i + 1}
              </div>
              <Input
                placeholder="Title"
                value={s.title}
                onChange={(e) => {
                  const next = [...subs];
                  next[i] = { ...next[i], title: e.target.value };
                  setSubs(next);
                }}
              />
              <Textarea
                placeholder="Structured prompt package"
                value={s.prompt}
                onChange={(e) => {
                  const next = [...subs];
                  next[i] = { ...next[i], prompt: e.target.value };
                  setSubs(next);
                }}
              />
              <Textarea
                placeholder="Acceptance criteria"
                className="min-h-[60px]"
                value={s.acceptanceCriteria}
                onChange={(e) => {
                  const next = [...subs];
                  next[i] = { ...next[i], acceptanceCriteria: e.target.value };
                  setSubs(next);
                }}
              />
              <Input
                type="number"
                placeholder="Estimated tokens"
                value={s.estimatedTokens}
                onChange={(e) => {
                  const next = [...subs];
                  next[i] = { ...next[i], estimatedTokens: Number(e.target.value) || 0 };
                  setSubs(next);
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSubs([...subs, { ...emptySub }])}
          >
            Add nested task
          </Button>
        </div>
      </Card>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Creating..." : "Publish project"}
      </Button>
    </form>
  );
}
