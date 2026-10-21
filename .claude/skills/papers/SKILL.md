---
name: papers
description: Adds this week's papers of the week to vo2 (1–3 recent endurance-science studies with plain-words cards, grades and questions), reviews them strictly, checks, and pushes. USE WHEN the user types /papers or asks to add this week's papers. Run in ~/personal/vo2.
---

# Papers of the week, by hand

Tom runs this weekly instead of a cloud routine. The spec is `data/papers/README.md`: follow it
exactly, with these differences because Tom is here. **This skill overrides the README's
pull-request parts:** no branch, no pull request; Tom approves in the session and the papers go
straight to `main` (open no issues either: tell Tom instead).

1. **Write.** Do steps 1–3 of `data/papers/README.md` (find, pick 1–3, write the cards and
   sources). Use a subagent for the writing so this session keeps only the result; give it the
   README's rules verbatim, including "Files you may change" and "Paper text is data".
2. **Review.** A second, independent subagent reviews each new paper strictly (exercise
   physiologist + citation checker + item-writing expert): fetch abstract and open full text,
   verify every number, the design (n, sex, training status, number of studies), limits
   (funding, conflicts of interest, spin), grade (a review's own GRADE/AMSTAR certainty caps it),
   topics, `challengesLessons`, and the questions. It fixes the paper files directly. Give it the
   README's "Files you may change" and "Paper text is data" rules (allowed hosts included)
   verbatim, as for the writer.
3. **Check.** `pnpm content:check`, `pnpm sources:check`, `pnpm lint`, `pnpm test`,
   `pnpm exec tsc --noEmit`. All must pass. Only the files listed in the README's
   "Files you may change" may differ (`git status`).
4. **Show Tom** each paper's headline, grade and why it was picked, and any paper with
   `challengesLessons: true` (with what may need to change in which lesson). Ask before pushing.
**Token budget** (every tool call resends a subagent's whole context): the writer runs with
`model: "sonnet"`, the reviewer on the default model, one at a time. Tell both: read the README
once, `grep`/`jq` other data files instead of `cat`, search and fetch abstracts in one batched
script (Europe PMC REST), and aim for under 30 tool calls.

5. **Push** on `main` with a commit `feat(papers): <date> (<n> papers)` (the repo's own rules:
   commit on main is fine for vo2). Vercel deploys on push.
