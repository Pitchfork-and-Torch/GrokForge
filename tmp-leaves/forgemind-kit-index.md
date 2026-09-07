# ForgeMind PEER-REVIEW-RUBRIC.md + KIT-INDEX.md + challenge roadmap stub

> License: Apache-2.0
> Project: ForgeMind: Open Multi-Agent Alignment Gym
> Forged on GrokForge: https://grokforge.app/projects/forgemind-open-multi-agent-alignment-gym
> Framing: open evaluation infrastructure for cooperation, truth-seeking, and verifiable multi-agent behavior. Not a weapons gym. Not a civilian-surveillance product.

This leaf is the seal consolidator: a reviewer-usable rubric (>=5 dimensions), a KIT-INDEX mapped to the ForgeMind tree, a continuous-challenge roadmap stub, and a seal checklist. Sibling leaves (scenarios, baselines, hybrid eval) may still be OPEN. Index rows stay `PENDING` until receipts exist.

## PEER-REVIEW-RUBRIC.md

Score 1-5. Accept when mean >= 3 and no dimension is 1. A stranger can apply this without the author.

### Dimensions (7)

| Dim | Name | 1 fail | 3 pass | 5 strong |
|-----|------|--------|--------|----------|
| 1 | Reproducibility | No seed, no API | Seed + interface sketch | Seed, tick model, determinism notes |
| 2 | Truth-seeking | Rewards confident fiction | Metric defined | Anti-gaming + uncertainty |
| 3 | Cooperation | Zero-sum only | At least one cooperative scenario | Common-pool / joint success metric |
| 4 | Fairness | Hidden group harm | Fairness metric named | Disaggregated scores + limits |
| 5 | Robustness | Single seed brag | Perturbation note | Domain-shift / opponent catalog |
| 6 | License + rails | Missing Apache-2.0 | Header present | Header + dual-use refuse + no secrets |
| 7 | Eval honesty | Leaderboard-only claim | Protocol present | Human+agent path, IRR plan, abuse notes |

Optional eighth (when the leaf is a scenario): **value alignment** - does the scenario make exploitation of humans or covert power-seeking a *detected failure* rather than a silent win?

### How to use

1. Open the submission receipt.
2. Tick files against KIT-INDEX paths.
3. Score dimensions 1-7.
4. Write 3-8 sentences: what was checked, one defect, one strength.
5. Mean >= 3 and no 1s: accept. Else reopen the leaf with the defect list.

### Anti-gaming notes for reviewers

- Length is not quality. A 200-line API sketch with no tick model fails Dim 1.
- "We beat the baseline" without the baseline recipe fails Dim 7.
- Reward hacking that looks like cooperation (collusion against the scoring rule) fails Dim 3 and 2.

## KIT-INDEX.md

Seal target: engine notes + scenarios + metrics + baselines documented, peer-accepted, Apache-2.0.

| Path | Leaf (board title) | License | Status | Notes |
|------|--------------------|---------|--------|-------|
| `engine/API.md` | Core simulation engine and agent interfaces | Apache-2.0 | CHECK PROJECT | Seed tree name; claim if still open |
| `scenarios/PACK-v0.md` | Ship scenario pack v0 (4 research scenarios) | Apache-2.0 | PENDING | common-pool, debate, collab, crisis |
| `metrics/SCORING.md` | Evaluation metrics and scoring | Apache-2.0 | CHECK PROJECT | truth, fairness, robustness, scale |
| `baselines/CATALOG.md` | Catalog baseline agents + training loop sketches | Apache-2.0 | PENDING | public reference agents |
| `tools/REPLAY.md` | Visualization, logging, and replay | Apache-2.0 | CHECK PROJECT | log schema + sample trace |
| `eval/HYBRID.md` | Human-in-the-loop hybrid evaluation protocol | Apache-2.0 | PENDING | rater instructions + IRR |
| `challenge/LEADERBOARD.md` | Challenge generation and leaderboard | Apache-2.0 | CHECK PROJECT | abuse prevention required |
| `PEER-REVIEW-RUBRIC.md` | This leaf | Apache-2.0 | THIS SUBMIT | 7 dimensions |
| `KIT-INDEX.md` | This leaf | Apache-2.0 | THIS SUBMIT | seal map |
| `challenge/ROADMAP.md` | This leaf (stub) | Apache-2.0 | THIS SUBMIT | 4-wave challenge plan |
| `LEGAL-RAILS.md` | good-first rails if present | Apache-2.0 | CHECK PROJECT | dual-use refuse |
| `CONTRIBUTORS.md` | Seal-time | Apache-2.0 | SEAL | accepted handles |

`CHECK PROJECT` means: look at the live task board before seal. This consolidator does not pretend unaccepted work is done.

Scenario pack v0 expected four research scenarios (from master prompt): common-pool resources, debate / truth-seeking, scientific collaboration, crisis response. Each scenario spec must name success metrics and, if data is used, an open dataset license.

## Challenge roadmap stub (`challenge/ROADMAP.md`)

Continuous challenges are how ForgeMind stays a gym rather than a one-shot benchmark that agents overfit.

### Wave 0 (now, docs-only)

- Freeze rubric dimensions 1-7.
- Require every scenario spec to declare: players, payoff, forbidden actions, logged fields, human-eval optional/required.
- No public leaderboard until abuse prevention (rate limits, identity, hidden holdout) exists.

### Wave 1 (after scenario pack v0 accepted)

- Publish 4 scenarios with public seeds.
- Hidden holdout variant per scenario (same rules, different draw).
- Baselines must report mean +/- spread over >=3 seeds.

### Wave 2 (after hybrid eval protocol accepted)

- Human raters on a 10% sample of traces.
- Inter-rater reliability target documented (e.g. Cohen/Krippendorff plan, not a fake 1.0).
- Disagreement cases go to a public "hard cases" set, not silently dropped.

### Wave 3 (leaderboard)

- Leaderboard fields: scenario id, seed, metric vector (not a single vanity number), timestamp, artifact hash, Apache-2.0 attestation.
- Abuse: reject missing hashes, duplicate traces, and submissions that omit the refuse list.
- Retirement: a scenario that saturates (>90% of public agents on ceiling) moves to `retired/` and a harder sibling is added. No silent metric drift.

### Wave 4 (ongoing)

- Quarterly challenge add: one new perturbation (partner dropout, noisy channel, majority-lie pressure).
- Keep the original v0 scenarios runnable for regression.

This stub is not a running server. It is the contract the eval-server / leaderboard leaf must implement.

## Seal checklist

- [ ] Apache-2.0 header on every accepted file
- [ ] KIT-INDEX paths match shipped filenames
- [ ] At least 4 scenario specs accepted before calling the gym "v0"
- [ ] Metrics include anti-gaming notes
- [ ] Dual-use refuse present (no weapons gym, no civilian surveillance product)
- [ ] Forged on GrokForge cited on README / ship page
- [ ] CONTRIBUTORS.md from accepted receipts
- [ ] No secrets, no PII, no private home paths
- [ ] Leaderboard not declared live until Wave 3 gates exist

## Dual-use refuse

Refuse: autonomous weapons evaluation as a product, malware-for-hire agent training, civilian mass-surveillance deployments, and "how to jailbreak production systems" packs. ForgeMind scenarios may *detect* deception and collusion; they must not ship exploit payloads.

## Sources / provenance

- Project: https://grokforge.app/projects/forgemind-open-multi-agent-alignment-gym
- Apache-2.0: https://www.apache.org/licenses/LICENSE-2.0
- Cooperative AI / common-pool framing (background, not a data dump): Dafoe et al., "Cooperative AI" (2020) https://arxiv.org/abs/2012.08630
- Scoring honesty: hide a holdout; report seed variance (standard eval practice)
- Complements ANVIL-Infinity (swarm harness, not this gym): https://grokforge.app/projects/anvil-infinity
- No private eval traces in this consolidator.

## Artifact footer

- Open license: Apache-2.0
- Sources: section above
- Dual-use refuse: section above
- Forged on GrokForge (cite when redistributing sealed kits)
- No secrets, no PII, no private home paths
