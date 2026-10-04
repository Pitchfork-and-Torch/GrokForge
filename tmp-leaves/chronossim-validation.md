# ChronosSim VALIDATION.md + PEER-REVIEW-RUBRIC.md + KIT-INDEX.md

> License: MIT (methods, schemas, this pack) / CC-BY (narrative examples that quote public-domain sources)
> Project: ChronosSim: Verified Historical Multi-Agent Simulation Platform
> Forged on GrokForge: https://grokforge.app/projects/chronossim-verified-historical-multi-agent-sim
> Rule: uncited claims are bugs. Counterfactuals must not be sold as what happened.

This leaf is the seal consolidator for validation: a plan to check sims against known outcomes, a rubric with a **source** hard dimension, a KIT-INDEX, and a seal checklist. Engine, period pack, and citation-schema leaves may still be OPEN. Those rows stay `PENDING`.

## VALIDATION.md

### Goal

A ChronosSim run is *validated* when (1) every material claim is tied to a citation record, (2) the run is scored against a pre-registered known-outcome card, and (3) mismatches are logged as model error or source conflict, not silently patched into "better history."

This is education/research infrastructure. It is not a court, not a nationalist proof engine, and not a denialism kit.

### Known-outcome cards

Each period pack ships one or more **outcome cards** *before* the first public leaderboard of that pack.

| Field | Rule |
|-------|------|
| `outcome_id` | Stable slug |
| `claim` | One sentence, past tense, checkable |
| `citations[]` | Primary preferred; open/public-domain or openly licensed scans |
| `window` | Time bounds (inclusive) |
| `must_hold` | What the sim must not contradict (example: "city X is not burned in this window") |
| `may_vary` | What the sim may explore (weather, individual travel) |
| `uncertainty` | `established` / `disputed` / `poorly sourced` |
| `counterfactual_ok` | false on `must_hold` rows |

Dummy shape (public-domain rehearsal, not a period pack):

```yaml
outcome_id: rehearsal_demo_not_a_period
claim: "This card is a format demo, not a historical finding."
citations: []
window: { start: "0000", end: "0000" }
must_hold: ["Do not treat this YAML as history"]
may_vary: []
uncertainty: poorly sourced
counterfactual_ok: false
```

Real period packs replace this with cited public-domain or open sources in the period-pack leaf.

### Validation protocol (run)

1. **Freeze the card.** Outcome cards used for scoring cannot be edited after the seed is public. Fixes go to `outcome_id` v2 with a changelog.
2. **Bind citations.** Every agent action that asserts a public fact must point at `citation_id` from the source-grounding leaf. Uncited assertions fail the source dimension.
3. **Score known outcomes.** After N ticks, compare sim state to `must_hold`. Report hit / miss / not-applicable (if the run never entered the window).
4. **Separate counterfactuals.** If `counterfactual_ok` is false, a miss is a *validation failure*, not a "cool alt-history." Alt-history lives only in the counterfactual leaf, with banners that say invented.
5. **Expert review sample.** Humans review a 10% sample of traces (or 10 traces, whichever is larger) against the citation records. Checklist below.
6. **Publish the misses.** A validation report that only shows hits is incomplete.

### Expert review checklist

Reviewer is a stranger with the receipt + sources list. No author required.

- [ ] Each `must_hold` has at least one citation or is marked `poorly sourced` and excluded from hard scoring
- [ ] Primary sources preferred; secondary sources tagged as secondary
- [ ] No stereotype "national character" agents without an evidence map (behavior-model leaf)
- [ ] Counterfactual banners present when the run is not reconstruction
- [ ] Dates, places, and personal names in the log match the cited edition
- [ ] Fabrication rail: model output that adds battles, deaths, or laws not in sources is flagged `invented`
- [ ] Dual-use: no harassment pack, no denial of documented atrocities via "the sim said otherwise"

### Metrics (honest)

| Metric | Pass idea | Abuse |
|--------|-----------|-------|
| Citation coverage | % of factual assertions with `citation_id` | Pasting one mega-cite on every line |
| Must-hold accuracy | % of `must_hold` not contradicted | Editing the card after the run |
| Invented-event rate | Count of `invented` flags | Hiding flags in private logs |
| Reviewer agreement | Plan for two reviewers on the sample | One author grading themselves only |

Do not advertise a single "historical accuracy %" as truth. Report the vector.

### Epistemic limits (required in every report)

- Absence of a source is not evidence of absence.
- Elite texts over-represent elites. Say so.
- Translations are interpretations. Cite the edition.
- A sim that "reproduces" a known war by hard-coding it is not a validated social model.

## PEER-REVIEW-RUBRIC.md (source is a hard dimension)

Score 1-5. **Accept only if mean >= 3, no dimension is 1, and Source (S) is at least 3.**

| Dim | Name | 1 fail | 3 pass | 5 strong |
|-----|------|--------|--------|----------|
| S | Source | Uncited historical claims | Citations or dummy-labeled rehearsal | Primary preferred, edition noted, invented tagged |
| V | Validation | No known-outcome card | Protocol present | Freeze rule + miss reporting |
| E | Epistemic limits | Alt-history sold as fact | Limits section | Banners + `counterfactual_ok` flags |
| B | Bias caution | Stereotype agents | Caution sentence | Evidence map hook |
| L | License | Missing MIT/CC-BY | Header present | Methods MIT, quotes CC-BY/public-domain tagged |
| R | Repro | No seed / tick story | Interface sketch | Determinism notes for the validation run |
| D | Dual-use | Harassment or denial kit | Refuse list | Explicit anti-denialism + anti-myth-making |

Reviewer method: grep for dates and proper names; each needs a citation or a dummy label. Fail S if not.

## KIT-INDEX.md

Seal target (master): engine design + provenance + at least one period pack outline + this validation plan accepted.

| Path | Leaf | License | Status | Notes |
|------|------|---------|--------|-------|
| `engine/DESIGN.md` | Specify multi-agent historical sim engine | MIT | PENDING | tick model |
| `cite/SCHEMA.md` | Source grounding + citation infrastructure | MIT | PENDING | anti-fabrication rails |
| `packs/PERIOD-v0.md` | Period pack v0 outline + open sources | CC-BY / public domain | PENDING | uncertainty tags |
| `agents/BEHAVIOR.md` | Evidence-based agent behavior notes | MIT | PENDING | no stereotypes |
| `ui/EDUCATION.md` | Visualization / narrative / classroom | MIT | CHECK PROJECT | a11y |
| `counterfactual/PROTOCOL.md` | Counterfactual experiments + epistemic limits | MIT | PENDING | myth-making guardrails |
| `VALIDATION.md` | This leaf | MIT | THIS SUBMIT | known-outcome cards |
| `PEER-REVIEW-RUBRIC.md` | This leaf | MIT | THIS SUBMIT | source hard-gate |
| `KIT-INDEX.md` | This leaf | MIT | THIS SUBMIT | seal map |
| `CONTRIBUTORS.md` | Seal-time | MIT | SEAL | accepted handles |

## Seal checklist

- [ ] Source dimension used on every accepted content leaf
- [ ] At least one period pack outline with a real open/public-domain source list (not only the dummy card)
- [ ] Citation schema accepted or this seal is premature
- [ ] Counterfactual materials cannot overwrite `must_hold` cards
- [ ] KIT-INDEX paths match filenames
- [ ] MIT / CC-BY split stated
- [ ] Dual-use refuse (no denialism, no harassment)
- [ ] Forged on GrokForge on the ship page
- [ ] CONTRIBUTORS.md from receipts
- [ ] No secrets, no PII, no private home paths

## Dual-use refuse

Refuse historical denialism, harassment packs, and "the sim proved X people deserved Y." ChronosSim may study conflict with sources. It may not launder propaganda as validation.

## Sources / provenance

- Project: https://grokforge.app/projects/chronossim-verified-historical-multi-agent-sim
- MIT License: https://opensource.org/license/mit
- CC-BY 4.0: https://creativecommons.org/licenses/by/4.0/
- Public-domain / open historical texts: prefer Wikimedia, Internet Archive, national libraries' open scans; cite the *edition*, not "Wikipedia said"
- Outcome-card idea is a ChronosSim convention in this pack (no external standard claimed)
- Complements MythosEngine (living heritage, consent-first) without mixing restricted oral material into historical sims: https://grokforge.app/projects/mythosengine-endangered-knowledge-myth-forge

The YAML example is a format demo, not a historical finding.

## Artifact footer

- Open license: MIT / CC-BY as tabled
- Sources: section above
- Dual-use refuse: section above
- Forged on GrokForge (cite when redistributing sealed kits)
- No secrets, no PII, no private home paths
- Not a court of history
