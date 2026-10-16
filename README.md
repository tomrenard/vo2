# vo2

The science of endurance (running, cycling, triathlon) at MSc depth, learned one question at a
time. Invite-only accounts, installable on your phone as a web app.

- **Course:** tiers → modules → lessons (`data/curriculum.json`). A lesson is a run of short
  concept cards and multiple-choice questions, 5–8 minutes; some questions come before the
  explanation (a guess, not scored).
- **Questions are the flashcards:** every question you answer is scheduled with FSRS
  ([ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)). You say how sure you are:
  wrong = Again, right but guessed = Hard, right and sure = Good. Sure-but-wrong answers come
  back first. Each review uses another wording (variants), and modules are mixed.
- **Every claim is sourced:** evidence badges (strong / moderate / weak / disputed) open the
  quoted evidence and the sources; `pnpm sources:check` verifies every DOI against Crossref.
- **Papers:** a weekly routine adds new studies with a summary, its limits and questions.

Content standard: [data/README.md](data/README.md).

## Develop

```sh
pnpm install
pnpm content:check      # validate data/, write src/lib/content-index.ts
pnpm sources:check      # DOIs vs Crossref, retractions
pnpm test
pnpm dev
```

Stack: Next 16, Postgres (Neon) with drizzle, Better Auth (email + password, `ALLOWED_EMAILS`),
Tailwind 4, biome, vitest with PGlite.
