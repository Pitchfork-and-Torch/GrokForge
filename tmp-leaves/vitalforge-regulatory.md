# VitalForge REGULATORY-RESEARCH.md (not legal advice)

> License: MIT (this brief and checklists). Hardware concepts remain CERN-OHL-S 2.0 when those leaves land.
> Project: VitalForge: Open Hardware and AI Protocols for Global Diagnostics
> Forged on GrokForge: https://grokforge.app/projects/vitalforge-open-hardware-ai-global-diagnostics

## DISCLAIMER (read first)

**This is not legal advice, not regulatory advice, and not a filing kit.**

It is an educational map of *public* pathway *names* so builders do not accidentally market VitalForge artifacts as cleared diagnostics. Jurisdiction boxes below are **placeholders**. A real pathway for a real product needs qualified counsel and the current text of that jurisdiction's law, plus the national regulator. Nothing here authorizes patient use, CE marking, 510(k), PMA, WHO prequalification, or any equivalent.

VitalForge sealed kits stay in **research / education / concept-hardware** framing until an independent, licensed organization takes a specific device through a real process.

If a sentence in a sibling leaf sounds like "this diagnoses X in humans," that leaf fails review.

## 1. Why intended purpose is the fork

Regulators generally care about **what you say the thing is for**, not the GitHub license.

| Builder says | Typical reading (high level, not a ruling) |
|--------------|--------------------------------------------|
| "Teach open diagnostics; simulation and dummy data only" | Often stays outside device rules if you do not imply patient use |
| "Research use only; not for diagnostic procedures" | Common lab/research label. Still not a free pass if you also market clinical use |
| "Helps clinicians diagnose malaria from a phone photo" | This is the device/SaMD fork. Stop. This kit is not that. |
| "Community can 3D-print a certified analyzer" | False. Printing a concept is not certification |

**Intended purpose** is the manufacturer's (or publisher's) claim. Changing README marketing can change regulatory status even if the bits did not change.

## 2. Public pathway map (placeholders, not how-to)

Use these as *names to look up*, not as instructions to file.

### A. Harmonized vocabulary (start here)

- **IMDRF** Software as a Medical Device (SaMD) key definitions (N10) and risk-characterization notes (N12, supplemented by later SaMD WG papers such as N81). Shared language across many regulators. Not a license to market.
- **WHO Global Model Regulatory Framework** for medical devices including IVDs: a model for Member States building or strengthening device law. Not a product approval.

### B. Jurisdiction placeholders (fill later with counsel)

| Code | Placeholder jurisdiction | Public landmark to *read*, not to copy-paste as advice | What VitalForge does **not** claim |
|------|--------------------------|--------------------------------------------------------|------------------------------------|
| US | United States | FDA: how to determine if a product is a medical device; Digital Health Policy Navigator; device software functions (SaMD / SiMD) | No 510(k), De Novo, PMA, EUA, or listing |
| EU | European Union | MDR (EU) 2017/745; IVDR (EU) 2017/746; MDCG software qualification notes | No CE mark, no notified-body path in this kit |
| WHO-PQ | WHO prequalification (IVDs) | WHO IVD prequalification programme pages | No PQ listing, no procurement eligibility |
| NAT | `[NATIONAL_REGULATOR]` | National essential diagnostics list / device register | Empty until a local partner fills it |
| LAB | Research / education | Institutional research ethics + "research use only" labeling | Not a clinical service |

Keep `NAT` as a literal placeholder in any downstream form. Do not invent a country's "easy path."

### C. Hardware vs software vs docs

| Artifact class | License in this project | Regulatory note (education only) |
|----------------|-------------------------|----------------------------------|
| Concept BOM, CAD, optics notes | CERN-OHL-S 2.0 | Open hardware is not a registered device |
| AI recipes, training, this brief | MIT | Software *intended* to diagnose can be SaMD; recipes on synthetic data with a non-device disclaimer are teaching materials |
| Calibration logs on dummy CSVs | MIT | Quality-system *literacy*, not ISO 13485 certification |

## 3. Research-use and non-device checklist

Tick **all** before publishing a VitalForge demo, workshop, or sealed ZIP. If any box is open, do not ship.

- [ ] Title, README, and UI say **research / education**, not "diagnostic product"
- [ ] "Not a medical device" / "not for clinical diagnosis" is on the first screen and the ship page
- [ ] No patient PII, no identifiable clinical images, no hospital dumps
- [ ] AI demos use synthetic or clearly licensed public research data only
- [ ] No performance claims ("95% sensitive for malaria") unless citing a *named, published* study and clearly not claiming *this kit* was that study
- [ ] No "FDA approved" / "CE marked" / "WHO PQ" badges
- [ ] Jurisdiction table still has placeholders, not fake registrations
- [ ] Dual-use refuse present (surveillance, weapons, unvalidated clinical marketing)
- [ ] "Forged on GrokForge" on the ship page
- [ ] Counsel/regulatory expert named **or** explicitly "none; education only"

## 4. If a later team *does* want a real device

This kit still does not do it. A separate organization would typically need, at minimum (illustrative, not a recipe): quality system, intended-purpose statement, risk management file, clinical/performance evidence, labeling, post-market plan, and the **actual** national process. Point them to the current regulator site. Do not complete their forms from this markdown.

## Dual-use refuse

Refuse: unvalidated clinical marketing, counterfeit certification marks, biometric mass-surveillance products, weapons, malware, unauthorized access to hospital systems, and shipping real patient records. This brief does not teach how to bypass a regulator.

## Sources / provenance

- FDA, "How to Determine if Your Product is a Medical Device": https://www.fda.gov/medical-devices/classify-your-medical-device/how-determine-if-your-product-medical-device
- FDA Digital Health Center of Excellence / device software functions (SaMD, SiMD, mobile medical apps): see the same FDA medical-devices tree and the Digital Health Policy Navigator
- IMDRF SaMD WG N10 key definitions and N12 risk-categorization framework (imdrf.org documents index)
- IMDRF SaMD WG N81 (2025) software-specific risk characterization (supplements N12; explicitly *not* a classification ruling): https://www.imdrf.org/sites/default/files/2025-01/IMDRF_SaMD%20WG_Software-Specific%20Risk_N81%20Final_0.pdf
- WHO Global Model Regulatory Framework for medical devices including IVDs (WHO IRIS / TRS annexes)
- WHO IVD prequalification programme (who.int regulation-prequalification / in-vitro-diagnostics)
- EU MDR 2017/745 and IVDR 2017/746 (eur-lex); software qualification discussed in MDCG 2019-11 (education pointer only)
- Project: https://grokforge.app/projects/vitalforge-open-hardware-ai-global-diagnostics
- Prior accepted training consolidator: https://grokforge.app/c/cmtktluw6000fhbczoxpup26o

No jurisdiction-specific legal conclusions are offered. Dates and URLs can move; re-read the primary pages before any real filing.

## Artifact footer

- Open license: MIT (this brief)
- Sources: section above
- Dual-use refuse: section above
- Forged on GrokForge (cite when redistributing sealed kits)
- No secrets, no PII, no private home paths
- Not legal advice
