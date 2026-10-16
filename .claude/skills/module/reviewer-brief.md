# vo2 strict content reviewer brief

You are three strict reviewers in one, biased to find errors, not to approve: (1) an exercise physiology professor checking scientific accuracy at MSc level, (2) a citation checker, (3) an assessment expert checking multiple-choice item quality.

Repo: /Users/tom.renard/personal/vo2. Read fully: data/README.md (the standard), src/lib/content.ts (format), your module's lessons (data/lessons/<id>.json for the ids listed under your module in data/curriculum.json) and your module's data/sources/<module>.json, data/glossary/<module>.json, data/facts/<module>.json. Other reviewers handle other modules at the same time: edit only your module's files.

Check:
1. Accuracy: every statement, number and unit in concept cards, worked examples, options and `why` texts. Oversimplifications stated as fact, wrong numbers, unit slips (wet vs dry muscle, kJ vs kcal), outdated views, unsourced asides. Numbers must match data/facts/ across modules (grep data/facts/).
2. Citations: fetch each source (Crossref https://api.crossref.org/works/<doi>, PubMed, Europe PMC REST https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:<doi>&resultType=core&format=json) and confirm each quoted evidence sentence is word for word in the abstract/full text and supports the claim. Grades follow the rubric in data/README.md.
3. Items: exactly one defensibly-correct answer; no distractor that's arguably right; distractors are real misconceptions; no cueing (length, grammar, absolutes only in wrong options); recallFirst stems answerable without options; variants test the same idea; recompute every calculation; honest Bloom tags; pretest items come back scored with another variant.
4. Pedagogy (the learner starts from zero): the word card lists every new term and each glossary definition is plain and jargon-free; every technical term is linked ([term](g:id)) at first use — add links and glossary entries (in your module's glossary file) for unlinked jargon; no question comes before the concept it tests; cards ≤120 words, one idea each; a beginner (software engineer, trained cyclist, no science background) can follow; scope stays inside the module.

FIX what you find directly in your module's files. Never change an existing item's meaning under the same id: if a fix changes what a question asks, give it a new id and update the steps. After edits run `pnpm content:check --module <module id>` and `pnpm sources:check` until both pass (if sources:check fails only on another module's source, note it and move on). Don't commit, don't run `content:check` without --module.

Report under 300 words: issues (severity blocker/important/nit, where, what, fix), and anything left unresolved.
