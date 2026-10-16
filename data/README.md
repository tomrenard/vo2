# vo2 content

Everything the app teaches lives here and is checked by `pnpm content:check` (format, item rules,
sources, ids) and `pnpm sources:check` (every DOI against Crossref, retractions).

- `curriculum.json`: tiers → modules → lesson ids, in order.
- `lessons/<id>.json`: one lesson (format: `src/lib/content.ts`).
- `sources/<module>.json`: sources, by id (`<firstauthor><year><letter?>`, e.g. `gastin2001`).
- `glossary/<module>.json`: terms, linked from text as `[MLSS](g:mlss)`.
- `facts/<module>.json`: numbers used in more than one lesson (glycogen stores, PCr content…):
  use these, never a different figure.
- `items.lock.json`: content hash per question, written by `pnpm content:check --accept`.

One file per module, so modules can be written at the same time. An id may appear in several
files only with the same content (look for it with `grep -r '"gastin2001"' data/` before adding).
Check one module while others are being written: `pnpm content:check --module <id>`.

## Writing a lesson

A lesson is a run of steps, 5–8 minutes in all:
concept → 1–3 questions → concept → … → recap. Start with 1–2 `pretest` questions on what the
lesson is about to teach (unscored; the same item comes back scored later, with another variant).

- **Concept cards:** one idea, about 120 words, plain English. Mark the claims that matter with
  `[[c:<claim id>]]` and list them in `claims` with a grade, sources and the quoted sentence from
  the abstract or full text that supports them. A live debate gets a `debate` box with both sides.
- **Worked example** (`example`) before the first calculation of a kind; later ones fade the steps.
- **Units:** SI, written as `mL·kg⁻¹·min⁻¹`, `mmol·L⁻¹`, `W·kg⁻¹`, `g·h⁻¹`, `kJ` (kcal only in
  brackets: `1,000 kJ (239 kcal)`). Decimal point, thousands comma (`2,151 kcal`), except in a list of numbers, where 4-digit
  numbers have none (`1100, 1180 and 1120 ms`), so the commas only separate the values.
- **Examples** from running, cycling and triathlon in turn; general science where it applies.

## Writing questions (items)

Each item tests one idea and has 1–4 variants (same idea, new wording or new numbers). Rules:

- 3–4 options, exactly one `correct`. Every wrong option is a real misconception or a typical
  calculation error, and its `why` says which.
- No "all of the above", "none of the above", "both A and B"; no negatives in the stem ("which is
  NOT…"); options of similar length and grammar, so the right one doesn't stand out.
- The stem can be answered before reading the options (good items are `recallFirst`).
- Bloom level on every item; per module at least 40% `apply`, `analyse` or `evaluate`.
  Prefer scenarios: "A runner's HR drifts 8% at constant pace over 2 h at 30 °C. Best explanation?"
- Discrimination questions for look-alike concepts (LT1 vs LT2, CP vs FTP).
- Calculations: `solution` gives the full working; wrong options come from real errors (units,
  forgetting a term).
- From tier 1 on, each module has at least one appraisal question ("what limits this study?").
- Never change what an existing item id asks. A typo fix keeps the id; a new meaning gets a new id
  (the old one is retired in the lock file).

## Evidence grades

| grade | when |
|---|---|
| strong | consistent systematic reviews / meta-analyses of RCTs, or a consensus statement |
| strong (mechanism) | textbook-settled physiology, shown in many independent studies (e.g. the creatine kinase reaction) |
| moderate | several RCTs or well-controlled crossover studies that agree |
| weak | one small study, mechanistic or observational work only |
| disputed | good studies disagree |

Go down one grade for: n < 15, trained men only (when the claim is general), industry funding.

## Sources

Prefer, in order: consensus statements (IOC, ACSM, ECSS, ISSN, BJSM), systematic reviews and
meta-analyses, landmark original studies, standard textbooks (Kenney *Physiology of Sport and
Exercise*, McArdle *Exercise Physiology*, Powers & Howley, Jeukendrup & Gleeson *Sport
Nutrition*). Journals: J Physiol, J Appl Physiol, MSSE, Sports Med, EJAP, IJSPP, SJMSS, IJSNEM,
BJSM. Preprints are labelled and never the only source of a lesson claim.

Never cite from memory: look the paper up (Crossref, PubMed, OpenAlex), copy its exact title,
first author, year and DOI, and quote the supporting sentence. `pnpm sources:check` fails on a DOI
whose title or author doesn't match.
