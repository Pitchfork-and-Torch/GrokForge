"use client";

import { useState, useTransition } from "react";
import { saveProjectScorecardAction } from "@/lib/actions";
import { Button, Card, Label, Textarea } from "@/components/ui";
import {
  RANKING_CRITERIA,
  type RankingCriterionId,
} from "@/lib/project-ranking";

export type ScorecardInitial = {
  strategicAlignment: number;
  technicalFeasibility: number;
  businessValue: number;
  effortDemand: number;
  riskUncertainty: number;
  timeSensitivity: number;
  strategicNote: string | null;
  technicalNote: string | null;
  businessNote: string | null;
  effortNote: string | null;
  riskNote: string | null;
  timeNote: string | null;
  totalScore: number;
} | null;

const NOTE_KEYS: Record<RankingCriterionId, keyof NonNullable<ScorecardInitial>> = {
  strategicAlignment: "strategicNote",
  technicalFeasibility: "technicalNote",
  businessValue: "businessNote",
  effortDemand: "effortNote",
  riskUncertainty: "riskNote",
  timeSensitivity: "timeNote",
};

function defaultScores(): Record<RankingCriterionId, number> {
  return {
    strategicAlignment: 3,
    technicalFeasibility: 3,
    businessValue: 3,
    effortDemand: 3,
    riskUncertainty: 3,
    timeSensitivity: 3,
  };
}

export function ProjectScorecardForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: ScorecardInitial;
}) {
  // Always collapsed by default; expand via button
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTotal, setSavedTotal] = useState<number | null>(
    initial?.totalScore ?? null
  );
  const [scores, setScores] = useState<Record<RankingCriterionId, number>>(() => {
    if (!initial) return defaultScores();
    return {
      strategicAlignment: initial.strategicAlignment,
      technicalFeasibility: initial.technicalFeasibility,
      businessValue: initial.businessValue,
      effortDemand: initial.effortDemand,
      riskUncertainty: initial.riskUncertainty,
      timeSensitivity: initial.timeSensitivity,
    };
  });
  const [notes, setNotes] = useState<Record<RankingCriterionId, string>>(() => {
    const empty = {
      strategicAlignment: "",
      technicalFeasibility: "",
      businessValue: "",
      effortDemand: "",
      riskUncertainty: "",
      timeSensitivity: "",
    };
    if (!initial) return empty;
    for (const c of RANKING_CRITERIA) {
      const key = NOTE_KEYS[c.id];
      const v = initial[key];
      empty[c.id] = typeof v === "string" ? v : "";
    }
    return empty;
  });
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("projectId", projectId);
    for (const c of RANKING_CRITERIA) {
      fd.set(c.id, String(scores[c.id]));
      const noteName = NOTE_KEYS[c.id] as string;
      fd.set(noteName, notes[c.id] || "");
    }
    start(async () => {
      const res = await saveProjectScorecardAction(fd);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      if (res && "ok" in res && res.ok) {
        setSavedTotal(res.totalScore);
        setOpen(false);
      }
    });
  }

  return (
    <Card className="space-y-3 border-amber-900/40 bg-amber-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Project ranking scorecard</h2>
          <p className="mt-1 text-xs text-stone-400">
            Weighted criteria (1-5). Total max 5.00. Creator or founder only. Write a short
            justification per score for transparency.
          </p>
          {savedTotal != null && (
            <p className="mt-2 text-sm text-amber-200">
              Current total: <strong>{savedTotal.toFixed(2)}</strong> / 5.00
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide form" : initial ? "Edit scores" : "Score project"}
        </Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="space-y-4">
          {RANKING_CRITERIA.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label className="!mb-0 text-stone-200">
                  {c.label}{" "}
                  <span className="font-normal text-stone-500">
                    ({Math.round(c.weight * 100)}%)
                  </span>
                </Label>
                <select
                  className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-sm text-white"
                  value={scores[c.id]}
                  onChange={(e) =>
                    setScores((s) => ({
                      ...s,
                      [c.id]: Number(e.target.value),
                    }))
                  }
                  name={c.id}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] leading-relaxed text-stone-500">
                <span className="text-emerald-400/90">5:</span> {c.high} ·{" "}
                <span className="text-amber-300/90">3:</span> {c.mid} ·{" "}
                <span className="text-rose-300/80">1:</span> {c.low}
              </p>
              <Textarea
                className="min-h-[56px] text-sm"
                placeholder="Short justification (required for review transparency)"
                value={notes[c.id]}
                onChange={(e) =>
                  setNotes((n) => ({ ...n, [c.id]: e.target.value }))
                }
                maxLength={1000}
              />
            </div>
          ))}
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save ranking scorecard"}
          </Button>
        </form>
      )}
    </Card>
  );
}
