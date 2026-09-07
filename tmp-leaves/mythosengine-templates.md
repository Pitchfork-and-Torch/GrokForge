# MythosEngine educational experience templates pack

> License: CC BY-NC-SA 4.0
> Project: MythosEngine: Endangered Knowledge and Myth Preservation Forge
> Forged on GrokForge: https://grokforge.app/projects/mythosengine-endangered-knowledge-myth-forge
> Rule: community veto beats the template. No sacred or restricted content samples in this pack.

This leaf ships three classroom/community workshop templates (listening circle, language drill, ecology story map), facilitator notes, an accessibility checklist, and restricted-content handling. Templates are empty vessels. Do not paste living sacred text, unpublished recordings, or genealogies here.

## Shared facilitator notes

Before any session:

1. Name the knowledge holders in the room. If none are present, this is a *method rehearsal* with public-domain or instructor-invented dummy stories, never a substitute for a living tradition.
2. Read the restricted-content card out loud. Anyone may stop the session.
3. Record only with documented free, prior, and informed consent. Default is no recording.
4. License of *outputs from a live community* is the community's, not automatically CC-BY-NC-SA. This pack's license covers the blank templates only.
5. Dual-use refuse: no scraping, no model-training dumps of restricted corpora, no doxxing of knowledge holders.

Timebox: 30-45 minutes per template. Materials: paper, pencils, optional speaker, optional large paper for mapping.

## Template 1: Listening circle

**File intent:** `templates/listening-circle.md`

**Purpose:** Practice turn-taking and provenance ("who told this, when, may we retell") without extracting a story the room does not own.

**Roles:** facilitator, timekeeper, circle of 4-12 people.

**Steps:**

1. Opening (3 min). State: this circle does not collect sacred material. Dummy prompt if rehearsing: "A public folktale you already know from print, or a story you invented this morning."
2. Consent round (4 min). Each person says share / pass / listen-only.
3. Telling (12-18 min). One speaker at a time. No cross-talk. Listener writes *provenance only*: teller initials, date, "retell allowed? Y/N".
4. Reflection (8 min). Prompt: "What would be lost if we wrote this down without asking?"
5. Close (3 min). Destroy notes that were not released. Keep only provenance cards marked Y.

**Facilitator fail states:**

- Someone starts a restricted story. Stop. Thank them. Do not write it.
- A participant records on a phone. Pause. Delete or stop. Re-consent or end.
- Outsiders want "the real myth." Direct them to community governance (sibling leaf), not to this template.

**Outputs (if released):** provenance card CSV columns `date,teller_initials,retell,medium,notes`. No story body unless the teller writes it themselves and marks release.

## Template 2: Language drill (revitalization practice)

**File intent:** `templates/language-drill.md`

**Purpose:** Short oral practice for learners when a language keeper is present *or* when using only already-published learner materials.

**Roles:** keeper or published-material lead, learners, scribe (optional).

**Steps:**

1. Source check (2 min). Circle one: (A) living keeper in the room, (B) published learner text with a citation, (C) abort (no source).
2. Three items only (15 min). Greet / everyday object / place name. Keeper models; learners repeat. No hidden ritual vocabulary.
3. Write-back (8 min). Learners write the three items in the orthography the keeper chooses. If the keeper prefers oral-only, skip write-back.
4. Return (5 min). Ask: may these three items be in a classroom handout? If no, erase the board.

**Facilitator notes:**

- Do not run speech-to-text "for convenience" on keeper audio unless the capture-pipeline leaf and consent templates are in force.
- If using published materials, cite the edition in the Sources block of the session log.
- Accessibility: offer large print, slow repetition, and a no-writing path.

**Outputs:** at most a 3-line learner sheet, or nothing.

## Template 3: Ecology story map

**File intent:** `templates/ecology-story-map.md`

**Purpose:** Map relationships among land, water, plants, and stories *that the room is allowed to share*. Dummy mode uses a fictional watershed.

**Roles:** mapper, callers (people who place cards), keeper or rehearsal lead.

**Steps:**

1. Choose mode (2 min): community-authorized map / fictional watershed rehearsal.
2. Place five cards (12 min): water, plant, animal, human practice, season. Cards hold *labels the room chose*, not secret names.
3. Draw relations (10 min): "feeds", "warns", "avoids", "thanks". No GPS of sacred sites.
4. Provenance strip (6 min): who may copy this map? classroom only / community archive / public CC-BY-NC-SA. Default classroom only.
5. Photograph only if release is public or classroom-internal and faces are out of frame unless consented.

**Facilitator fail states:**

- Request for exact coordinates of a sacred place. Refuse. Use relative language ("upstream of the public bridge").
- Generative-AI "fill in the old story." Out of scope here. See community-controlled generative rails sibling.

**Outputs:** paper map plus a release line. Optional graph fragment with public labels only:

```yaml
# example: fictional rehearsal only
nodes:
  - id: river_public
    label: "Public river (rehearsal)"
  - id: reed_public
    label: "Reed bed (rehearsal)"
edges:
  - from: reed_public
    to: river_public
    rel: grows_beside
```

## Accessibility checklist

Use this in every session. Tick or the session is not "done".

- [ ] Spoken overview of the whole session before starting
- [ ] Pass option with no explanation required
- [ ] Large-print or oral-only path (Template 2 write-back is optional)
- [ ] Quiet role available (timekeeper, card-holder) for people who will not speak
- [ ] Contrast-friendly markers on maps (not color-only meaning)
- [ ] Captions or a note-taker if a keeper is amplified
- [ ] No strobe / no required standing
- [ ] Break after 25 minutes
- [ ] Materials can be handled one-handed
- [ ] Digital photos off by default

## Restricted-content handling

| Signal | Action |
|--------|--------|
| "This is not for writing" | Stop the pen. Oral close only. |
| Sacred / initiation / grief-private | End that thread. Do not summarize later. |
| Child in the room | Skip adult-only material even if someone offers it |
| Researcher wants a dataset | Point to governance leaf. This pack is not a corpus. |
| Model trainer wants audio | Refuse. Capture pipeline + consent first. |
| "Just a small excerpt" | Still a no unless the keeper writes the release line |

Session log (keep): date, template id, mode (rehearsal vs authorized), recording (yes/no), release (none/classroom/public), accessibility ticks. Session log (never keep): story bodies marked restricted.

## Dual-use refuse

Refuse extractive scraping of endangered-language audio, unauthorized publication of genealogies, surveillance of communities, and training dumps of restricted corpora. Templates are for revitalization practice under community control.

## Sources / provenance

- Project: https://grokforge.app/projects/mythosengine-endangered-knowledge-myth-forge
- UNESCO Intangible Cultural Heritage ethics (community consent and transmission): https://ich.unesco.org/en/ethics-and-ich-00866
- CARE Principles for Indigenous Data Governance: https://www.gida-global.org/care
- First Archivist Circle, Protocols for Native American Archival Materials: https://www2.nau.edu/libnap-p/protocols.html
- CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/
- No sacred text, no field recordings, and no private names are included in this pack. Worked examples are labeled rehearsal / fictional.

## Seal / KIT-INDEX hint (for the consolidator leaf)

| Path | This leaf |
|------|-----------|
| `templates/listening-circle.md` | Template 1 |
| `templates/language-drill.md` | Template 2 |
| `templates/ecology-story-map.md` | Template 3 |
| `templates/ACCESSIBILITY.md` | Checklist |
| `templates/RESTRICTED.md` | Handling table |

## Artifact footer

- Open license: CC BY-NC-SA 4.0 (blank templates only; live community outputs stay under community terms)
- Sources: section above
- Dual-use refuse: section above
- Forged on GrokForge (cite when redistributing sealed kits)
- No secrets, no PII, no private home paths, no sacred restricted samples
