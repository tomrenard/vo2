---
name: module
description: Writes and strictly reviews new vo2 course modules (lessons, sources, glossary, facts) with parallel subagents, then checks and pushes. USE WHEN the user asks to write the next modules/tier, "/module <ids>", or to continue the curriculum. Run in ~/personal/vo2.
---

# Writing modules

How vo2 content is made: one writer subagent per module, then one strict reviewer per module, all
in parallel (each module has its own files under `data/`). The standard is `data/README.md`.

1. **Plan.** Put the module's lesson ids in `data/curriculum.json` (in order). Pick a scope per
   lesson in one line each, and what it builds on (earlier modules) so writers don't repeat them.
2. **Write.** Per module, a background subagent with `model: "sonnet"` (reviewers stay on the default model), at most 4 running at once, with this prompt: "Read and follow
   `.claude/skills/module/writer-brief.md`. Your module: <id> (<title>), lessons in order:
   <id: one-line scope> … First lesson requires [<last lesson of the previous module>]."
3. **Review.** When a writer reports, start a reviewer subagent (at most 4 at once): "Read and follow
   `.claude/skills/module/reviewer-brief.md`. Your module: <id> (lessons …). Writer's notes to
   check: <their uncertain points and format limits>." Send back anything left unresolved that
   matters (an unread source cited, a number not in its source).
4. **Check.** Full `pnpm content:check --accept` (only for wording fixes the reviewers reported),
   `pnpm sources:check`, `pnpm lint`, `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`.
5. **Code changes** in the same step get a fresh-eyes review (pre-push reviewer brief) and a
   ponytail review before the push. Then commit on `main` and push (Vercel deploys).
6. **Cost.** After a run, check `/usage`: writers on Opus with big `cat`s cost ~10M tokens each (step 8).
