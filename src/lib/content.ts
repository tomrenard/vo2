import { z } from "zod";

/*
 * The course content format. Lessons live in data/lessons/<id>.json, shared sources in
 * data/sources.json, the course map in data/curriculum.json, terms in data/glossary.json and
 * shared numbers in data/facts.json. `pnpm content:check` validates all of it.
 *
 * App code imports only the types (import type), so zod never reaches the phone.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase, digits and dashes");

/** Evidence grade, GRADE-like (see data/README.md for the rubric). */
export const Grade = z.enum(["strong", "moderate", "weak", "disputed"]);

/** One source. `verified` says how far a reviewer checked it: the abstract or the full text. */
export const Source = z.object({
  doi: z
    .string()
    .regex(/^10\.\d{4,9}\/\S+$/)
    .optional(),
  /** Textbooks have an ISBN instead of a DOI. */
  isbn: z.string().optional(),
  title: z.string(),
  firstAuthor: z.string().describe("family name of the first author"),
  year: z.number().int().min(1900),
  journal: z.string().optional(),
  type: z.enum([
    "consensus",
    "systematic-review",
    /** A review of reviews. */
    "umbrella-review",
    "meta-analysis",
    "rct",
    "crossover",
    "cohort",
    "cross-sectional",
    /** Test–retest: how much a measure varies when nothing changed. */
    "reliability",
    "mechanistic",
    "review",
    "textbook",
    "preprint",
  ]),
  /** Participants (for a review: pooled participants; trials go in `sample`). */
  n: z.number().int().optional(),
  sample: z.string().optional().describe("e.g. 'trained male cyclists'"),
  /** Set only when the declarations show industry funding or ties. */
  industryFunded: z.literal(true).optional(),
  url: z.string().url().optional(),
});
export type Source = z.infer<typeof Source>;

/** A claim worth marking: shown as an evidence badge where the concept text says [[c:<id>]]. */
const Claim = z.object({
  id,
  text: z.string(),
  grade: Grade,
  sources: z.array(z.string()).min(1),
  /** The sentence from the abstract (or full text) that supports the claim. */
  evidence: z
    .array(
      z.object({
        source: z.string(),
        quote: z.string().min(20),
        level: z.enum(["abstract", "full-text"]),
      }),
    )
    .min(1),
});

/** Both sides of a live scientific debate, each with its sources. */
const Debate = z.object({
  question: z.string(),
  sides: z.array(z.object({ position: z.string(), sources: z.array(z.string()).min(1) })).min(2),
});

const Option = z.object({
  /** Stable: options are shuffled on screen, logs keep this id. */
  id: z.string().regex(/^[a-d]$/),
  text: z.string(),
  correct: z.literal(true).optional(),
  /** Why this option is right, or the misconception that makes it wrong. */
  why: z.string(),
});

/** One wording of a question. Its options are the same idea each time, worded or numbered anew. */
const Variant = z.object({
  id,
  stem: z.string(),
  options: z.array(Option).min(3).max(4),
  /** Worked solution for calculations, shown on the feedback screen. */
  solution: z.string().optional(),
});

/**
 * A question: the unit that is reviewed (FSRS state hangs on its id). Never reuse an id for a
 * question that now asks something else: give it a new id (content:check catches changes).
 */
export const Item = z.object({
  id,
  /** The concept card it tests: a missed review links back to it. */
  concept: id,
  bloom: z.enum(["remember", "understand", "apply", "analyse", "evaluate"]),
  /** Options hidden until tapped: recall first, then recognise. For items with a short answer. */
  recallFirst: z.boolean().optional(),
  sources: z.array(z.string()).min(1),
  variants: z.array(Variant).min(1).max(4),
});
export type Item = z.infer<typeof Item>;

/** A diagram the app draws (src/app/diagrams), with its starting values. */
const Diagram = z.object({
  // Add an id here when its component exists in src/app/diagrams.
  id: z.enum(["energy-systems"]),
  caption: z.string(),
  params: z.record(z.string(), z.number()).optional(),
});

const Step = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("concept"),
    id,
    title: z.string(),
    /** ~120 words. Small markdown; [[c:<claim>]] places a badge, [term](g:<glossary id>) a term. */
    text: z.string().max(1400),
    claims: z.array(Claim),
    debate: Debate.optional(),
    diagram: Diagram.optional(),
  }),
  /** A worked example: shown before the first calculation of its kind, steps one by one. */
  z.object({
    type: z.literal("example"),
    id,
    title: z.string(),
    problem: z.string(),
    steps: z.array(z.string()).min(2),
  }),
  /** A question from `items`. `pretest`: asked before it is taught, never scored. */
  z.object({
    type: z.literal("question"),
    item: id,
    variant: id.optional(),
    pretest: z.boolean().optional(),
  }),
  z.object({ type: z.literal("recap"), points: z.array(z.string()).min(2).max(6) }),
]);
export type Step = z.infer<typeof Step>;

export const Lesson = z.object({
  id,
  module: id,
  title: z.string(),
  /** What you can explain after the lesson, one sentence. */
  goal: z.string(),
  /** Lessons to know first (a soft warning when jumping ahead). */
  requires: z.array(id),
  /** Last full review of the content; re-review after two years. */
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.array(Step).min(3),
  items: z.array(Item).min(1),
});
export type Lesson = z.infer<typeof Lesson>;

/**
 * A paper of the week: a recent study in plain words, what limits it, and a few questions (they
 * join your reviews like lesson questions). Its items' `concept` is the paper's id.
 */
export const Paper = z.object({
  /** <date added>-<short-slug>, e.g. 2026-10-16-heat-acclimation-women */
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/),
  /** The study, in data/sources/papers.json. */
  source: id,
  /** A plain headline of the finding, not the paper's title. */
  headline: z.string().max(120),
  question: z.string().describe("what the study asked"),
  design: z.string().describe("who, how many, what was done; design type"),
  findings: z.string().describe("the main results, with numbers"),
  limits: z.string().describe("what limits it: sample, design, funding, spin"),
  grade: Grade,
  meaning: z.string().describe("how it fits what the course teaches"),
  /** Lessons or modules it touches (ids in curriculum.json). */
  topics: z.array(id),
  /** True if it should change what a lesson says: the routine opens an issue for it. */
  challengesLessons: z.boolean(),
  items: z.array(Item).min(2).max(5),
});
export type Paper = z.infer<typeof Paper>;

export const Curriculum = z.array(
  z.object({
    id,
    title: z.string(),
    modules: z.array(
      z.object({
        id,
        title: z.string(),
        icon: z.string(),
        lessons: z.array(id).describe("lesson ids in order; may name lessons not written yet"),
      }),
    ),
  }),
);
export type Curriculum = z.infer<typeof Curriculum>;

export const Glossary = z.record(
  id,
  z.object({ term: z.string(), short: z.string().max(240), lesson: id.optional() }),
);
export type Glossary = z.infer<typeof Glossary>;

/** Numbers several lessons use, so they stay the same everywhere. */
export const Facts = z.record(
  id,
  z.object({ label: z.string(), value: z.string(), sources: z.array(z.string()).min(1) }),
);

export const Sources = z.record(id, Source);
