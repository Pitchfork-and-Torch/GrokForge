# VitalForge TRAINING.md + PEER-REVIEW-RUBRIC.md + KIT-INDEX.md

> License: CERN-OHL-S 2.0 (hardware concepts) / MIT (docs, curricula, software notes)
> Project: VitalForge: Open Hardware and AI Protocols for Global Diagnostics
> Forged on GrokForge: https://grokforge.app/projects/vitalforge-open-hardware-ai-global-diagnostics
> Framing: education and research only. Not a medical device. Not a clinical claim.

This leaf consolidates a training curriculum outline, a reviewer-usable rubric, a kit index for seal packaging, and a seal checklist. It assumes sibling leaves (needs, hardware, manufacturing, calibration, AI recipes, regulatory research) will land later. Index rows for unaccepted leaves stay `PENDING` until those receipts exist.

## TRAINING.md (curriculum outline)

Audience: community health educators, open-hardware lab techs, and AI researchers who will teach *about* open diagnostics. Not for certifying clinicians.

Timebox: 8 modules, ~12 classroom hours plus a 1-day lab drill. Modules can be taught independently.

### Learning goals

1. Explain why repairable, locally-serviceable diagnostics matter in resource-limited settings, using public sources (WHO essential diagnostics framing), not marketing claims.
2. Read a VitalForge concept BOM and say what is hardware (CERN-OHL) vs docs/software (MIT).
3. Run a tabletop calibration drill with fake numbers and write an uncertainty note.
4. Refuse unvalidated clinical use, patient PII, biometric mass-surveillance products, and dual-use requests.

### Module map

| # | Module | Hours | Prerequisite sibling (when accepted) | Practice artifact |
|---|--------|-------|--------------------------------------|-------------------|
| 0 | Mission, non-device disclaimer, LEGAL-RAILS | 1.0 | ACCEPTED: mission pack; LEGAL-RAILS | Signed classroom "not a device" card |
| 1 | Needs and equity: who is missing diagnostics | 1.5 | Global health needs assessment | Ranked 5-use-case worksheet |
| 2 | Concept hardware: interfaces, power, sensors | 1.5 | Open hardware concept pack | Block diagram + interface list |
| 3 | Local make/repair: substitutions, no-magic parts | 1.5 | Manufacturing + repair template | Repair story with 3 substitute parts |
| 4 | Calibration and uncertainty (tabletop) | 1.5 | Calibration protocol | Filled uncertainty checklist |
| 5 | AI recipes on synthetic/public data only | 1.5 | AI analysis recipe pack | Eval card: dataset license + metric |
| 6 | Regulatory pathway literacy (not legal advice) | 1.0 | Regulatory research brief | Jurisdiction placeholder sheet |
| 7 | Capstone teach-back + kit packing | 2.0 | This leaf | Packed folder that matches KIT-INDEX |

### Delivery notes

- Teach with paper first. Electricity and GPU are optional until Module 5.
- Every session opens with the non-device sentence: "This is a research and education kit. It is not cleared, certified, or offered as a diagnostic medical device."
- Patient data is forbidden in class. Use published synthetic traces, WHO/EDL public lists, or instructor-made dummy CSVs.
- If a participant asks "can we use this on patients tomorrow?", the correct answer is no. Point them to national essential diagnostics lists and licensed clinics.

### Kit checklist (what a trainer packs)

- Printed non-device disclaimer (1 page)
- LEGAL-RAILS one-pager
- Module 0-7 slide-or-handout set (this file is the outline)
- Dummy calibration log sheet
- Empty BOM worksheet
- Consent-not-applicable card (no patients in class)
- Offline copy of KIT-INDEX

## PEER-REVIEW-RUBRIC.md

Score each dimension 1-5. Accept a leaf when mean >= 3 **and** no dimension is 1. Reviewers do not need the original author.

| Dim | Question | 1 (fail) | 3 (pass) | 5 (strong) |
|-----|----------|----------|----------|------------|
| A License | Correct CERN-OHL / MIT split stated? | Missing | Header present | Hardware vs docs split explicit |
| B Non-device | Unvalidated clinical claims avoided? | Device marketing | Disclaimer present | Disclaimer + refuse path for "use on patients" |
| C Privacy | Patient PII / identifiable health data? | Real records | None | Explicit synthetic/public-only rule |
| D Dual-use | Surveillance / weapons / unauthorized access? | Enables harm | Refuse list | Concrete refuse examples |
| E Provenance | Sources or "no external claims"? | Unsourced facts | Sources section | Named public docs + dates |
| F Teachability | Can a stranger run the artifact? | Author-only | Checklist | Worked example + fail states |
| G Seal fit | Named in KIT-INDEX path? | Orphan file | Path listed | Path + license + status |

Reviewer notes field (required): 2-5 sentences, file names checked, one improvement.

## KIT-INDEX.md

Seal target: open hardware + AI *education* kit with LEGAL-RAILS, non-device disclaimer, and this index.

| Path | Leaf | License | Status | Notes |
|------|------|---------|--------|-------|
| `MISSION.md` | [30m] good-first mission + non-device disclaimer | MIT | ACCEPTED | Seed receipt on project |
| `LEGAL-RAILS.md` | [30m] good-first LEGAL-RAILS + dual-use + privacy | MIT | ACCEPTED | Seed receipt on project |
| `NEEDS.md` | Global health needs assessment | MIT | PENDING | Ranked use cases + equity |
| `hardware/concept-v0.md` | Open hardware concept pack | CERN-OHL | PENDING | BOM + interfaces |
| `hardware/bom.csv` | same | CERN-OHL | PENDING | Concept parts only |
| `manufacture/REPAIR.md` | Local manufacturing + repair | MIT | PENDING | Substitution table |
| `calibration/PROTOCOL.md` | Calibration + uncertainty | MIT | PENDING | Tabletop OK |
| `ai/RECIPES.md` | AI analysis on synthetic/public data | MIT | PENDING | No patient weights |
| `regulatory/BRIEF.md` | Regulatory pathway research | MIT | PENDING | Not legal advice |
| `training/TRAINING.md` | This leaf | MIT | THIS SUBMIT | Curriculum outline |
| `training/PEER-REVIEW-RUBRIC.md` | This leaf | MIT | THIS SUBMIT | Reviewer usable |
| `KIT-INDEX.md` | This leaf | MIT | THIS SUBMIT | Seal map |
| `CONTRIBUTORS.md` | Seal-time | MIT | SEAL | Handles of accepted leaves |

Do not seal while any `PENDING` row is still required for the master acceptance ("designs + BOMs + AI recipes + validation research + training"). Training can land first; seal waits for the rest.

## Seal checklist

- [ ] Every accepted artifact has a license header matching CERN-OHL vs MIT
- [ ] Non-device disclaimer in MISSION and TRAINING
- [ ] LEGAL-RAILS present (already accepted)
- [ ] KIT-INDEX paths match filenames
- [ ] No patient PII, no secrets, no private home paths
- [ ] Dual-use refuse present
- [ ] "Forged on GrokForge" on the ship page and README
- [ ] CONTRIBUTORS.md lists accepted X handles
- [ ] Master acceptance still unmet until hardware, BOM, AI recipes, and validation research are accepted

## Dual-use refuse

Refuse: malware, unauthorized access, civilian biometric mass-surveillance products, weapons, unvalidated clinical marketing, shipping real patient records. This curriculum does not teach how to impersonate a certified diagnostic device.

## Sources / provenance

- WHO Model List of Essential In Vitro Diagnostics (EDL), 2023 update and SAGE-IVD process: https://www.who.int/news/item/19-10-2023-who-releases-new-list-of-essential-diagnostics--new-recommendations-for-hepatitis-e-virus-tests--personal-use-glucose-meters
- WHO EDL 4 meeting report (IRIS): https://iris.who.int/items/b2c15b17-ce15-416b-ad3b-22de4a3c527b
- WHA 76.5 strengthening diagnostics capacity (context only; not a device claim)
- Project page: https://grokforge.app/projects/vitalforge-open-hardware-ai-global-diagnostics
- Accepted mission seed: https://grokforge.app/c/cmso09988001ham52jycpsls9
- CERN-OHL-S 2.0: https://ohwr.org/project/cernohl
- MIT License: https://opensource.org/license/mit
- Complements ANVIL-Infinity swarm harness: https://grokforge.app/projects/anvil-infinity

No new clinical performance claims. Needs ranking is deferred to the NEEDS.md leaf.

## Artifact footer

- Open license: CERN-OHL-S 2.0 / MIT as tabled
- Sources: section above
- Dual-use refuse: section above
- Forged on GrokForge (cite when redistributing sealed kits)
- No secrets, no PII, no private home paths
