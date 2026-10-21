# vo2 lesson writer brief

You write lessons for "vo2", an MSc-level endurance sports science app (running, cycling, triathlon) that teaches only through short concept cards and multiple-choice questions, scheduled for spaced review. The learner is a well-trained amateur cyclist and software engineer who starts from zero in science. English, plain words.

Repo: /Users/tom.renard/personal/vo2. Read fully first:
- data/README.md: the writing standard (lesson flow, item rules, units, evidence grades, sources). Follow it exactly.
- src/lib/content.ts: the JSON format (zod).
- data/curriculum.json: your module and its lesson ids, in order.
- data/lessons/bio-atp.json and data/lessons/bio-pcr.json: reviewed examples of the quality, tone and length expected.

## Your files, and only these
- data/lessons/<lesson id>.json for each lesson of your module
- data/sources/<module id>.json, data/glossary/<module id>.json, data/facts/<module id>.json
Other writers are working on other modules at the same time. Never edit curriculum.json, src/, scripts/ or another module's files. To reuse a source, term or fact already defined elsewhere, `grep -r '"<id>"' data/` and copy the entry with identical content into your module's file (same id, same content), or use a new id.

## Each lesson
- 5–8 minutes: a word card first (`{"type":"terms","terms":[...]}`: the glossary ids of every term the lesson uses that no earlier lesson's word card introduced — grep `"terms"` in data/lessons/ to see what's already introduced), then 4–6 concept cards of ≤120 words each, each followed by 1–3 questions on that card (no question before its concept is taught), 8–12 scored questions in all, recap. Link every technical term at first use in the text ([term](g:id)) and give it a plain-words glossary definition a beginner can follow.
- Worked examples (`example` steps) before the first calculation of a kind, then calculation items with 2–3 variants with different numbers. Recompute every number.
- Items: 1–3 variants, 3–4 options, one correct, distractors are real misconceptions, a `why` for every option, Bloom tag, ≥40% apply/analyse/evaluate per module, scenarios from running, cycling and triathlon in turn, `recallFirst` on items with a short answer. Each module needs at least one appraisal question when the module has research content.
- Key claims marked [[c:id]] with grade, sources and an exact quoted supporting sentence (level abstract or full-text). Live debates get a `debate` box.
- The only diagram that exists is "energy-systems": don't add diagrams; use small tables in text where a picture would help.
- `requires`: the previous lesson in the module (first lesson: the last lesson of the previous module if it exists in curriculum.json, else []). `lastReviewed`: today, 2026-10-16.
- Keep to your module's scope; other modules cover the neighbouring topics.

## Sources
Never cite from memory, and never list a source you couldn't read (at least the abstract); mention unread classics only as reported by a source you read. Find each source on Crossref (https://api.crossref.org/works?query.bibliographic=...&rows=5), PubMed, Europe PMC REST (https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=...&resultType=core&format=json gives abstracts) or OpenAlex. Copy the exact full title (with subtitle: the check compares against Crossref's title + subtitle), first author family name, year, journal and DOI, and quote a supporting sentence word for word. Prefer consensus statements, systematic reviews, landmark studies and open-access reviews. Foundations topics may rest on well-cited open reviews or textbooks (a textbook needs a verified ISBN, no DOI; quote only what you can actually read).

## Done means
`pnpm content:check --module <module id>` and `pnpm sources:check` both pass in /Users/tom.renard/personal/vo2 (sources:check covers all modules; if it fails only on another module's source, say so and ignore it). Don't commit.

Report under 250 words: lessons written with item counts and Bloom split, sources used, anything scientifically uncertain, any format limits you hit.

## Budget (every tool call resends your whole context, so keep it small)
- Read data/README.md and src/lib/content.ts once. Don't `cat` other data files: look up what you need with `jq` or `grep` (e.g. `grep -rho '"terms":\[[^]]*\]' data/lessons/`, `jq 'keys' data/glossary/*.json`). Open one example lesson, not both.
- Research in one batch: one script that queries Europe PMC for all your candidate papers and prints only title, DOI, year, first author and the abstract sentences you'll quote. No paper-by-paper browsing.
- Write each lesson in one go, run `pnpm content:check --module <id>` once per lesson, fix, move on. Aim for under 40 tool calls for the whole module.
