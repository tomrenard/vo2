/**
 * Checks all course content (data/), then writes src/lib/content-index.ts and refs-index.ts.
 * Fails on any error.
 * `--accept`: questions whose text changed are accepted (a typo fix keeps the id and the
 * learner's progress) and items.lock.json is updated. Removed questions stay there as retired.
 * `--module <id>`: check only that module's lessons and write nothing, so writers working on
 * different modules at the same time can each check their own.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { z } from "zod";
import {
  Curriculum,
  Facts,
  Glossary,
  type Item,
  Lesson,
  Paper,
  Sources,
} from "../src/lib/content.ts";

const dataUrl = (path: string) => new URL(`../data/${path}`, import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(dataUrl(path), "utf8"));
const errors: string[] = [];
const warnings: string[] = [];
const fail = (where: string, message: string) => errors.push(`${where}: ${message}`);

function parse<T>(schema: z.ZodType<T>, value: unknown, where: string): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data as T;
  for (const issue of result.error?.issues ?? [])
    fail(where, `${issue.path.join(".")}: ${issue.message}`);
  return null;
}

const curriculum = parse(Curriculum, read("curriculum.json"), "curriculum.json") ?? [];
const jsonFiles = (dir: string) =>
  readdirSync(dataUrl(`${dir}/`))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(".json", ""))
    .sort();

/** One record from every data/<dir>/*.json (one file per module); an id defined twice must match. */
function merged<T>(dir: string, schema: z.ZodType<Record<string, T>>) {
  const all: Record<string, T> = {};
  for (const file of jsonFiles(dir)) {
    const part = parse(schema, read(`${dir}/${file}.json`), `${dir}/${file}.json`) ?? {};
    for (const [id, value] of Object.entries(part)) {
      if (id in all && JSON.stringify(all[id]) !== JSON.stringify(value)) {
        fail(`${dir}/${file}.json`, `${id} is defined differently in another file`);
      }
      all[id] = value;
    }
  }
  return all;
}
const sources = merged("sources", Sources);
const glossary = merged("glossary", Glossary);
merged("facts", Facts);

const onlyModule = process.argv.includes("--module")
  ? process.argv[process.argv.indexOf("--module") + 1]
  : undefined;
const moduleEntry = curriculum.flatMap((t) => t.modules).find((m) => m.id === onlyModule);
if (process.argv.includes("--module") && !moduleEntry) {
  console.error(`error --module: no module "${onlyModule ?? ""}" in curriculum.json`);
  process.exit(1);
}
const inModule = moduleEntry?.lessons ?? [];
const lessonIds = jsonFiles("lessons").filter((id) => !onlyModule || inModule.includes(id));
const lessons = lessonIds.flatMap((file) => {
  const lesson = parse(Lesson, read(`lessons/${file}.json`), `lessons/${file}.json`);
  if (lesson && lesson.id !== file) fail(file, `id is ${lesson.id}, file name says ${file}`);
  return lesson ? [lesson] : [];
});

/** Units written the way the guide asks (data/README.md). */
const UNIT_RULES: [RegExp, string][] = [
  [/\bml\s*\/\s*kg\s*\/\s*min\b/i, "write mL·kg⁻¹·min⁻¹"],
  [/\bml·kg/, "write mL·kg⁻¹·min⁻¹ (capital L)"],
  [/\bmmol\s*\/\s*l\b/i, "write mmol·L⁻¹"],
  [/\bg\s*\/\s*h(our)?\b/i, "write g·h⁻¹"],
  [/\bW\s*\/\s*kg\b/, "write W·kg⁻¹"],
  [/\bL\s*\/\s*min\b/, "write L·min⁻¹"],
  [/\bg\s*\/\s*kg\s*\/\s*(day|d)\b/i, "write g·kg⁻¹·day⁻¹"],
];
const BANNED: [RegExp, string][] = [
  [/\b(all|none) of the above\b/i, "no all/none of the above"],
  [/\bboth [a-d] and [a-d]\b/i, "no 'both A and B'"],
  [/\b(NOT|EXCEPT)\b/, "no negative stems"],
];

function lintText(where: string, text: string, terms = true) {
  for (const [pattern, message] of UNIT_RULES) if (pattern.test(text)) fail(where, message);
  if (terms) {
    for (const [, term] of text.matchAll(/\]\(g:([a-z0-9-]+)\)/g)) {
      if (!glossary[term as string]) fail(where, `glossary term ${term} is missing`);
    }
  }
}

const hashOf = (item: Item) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        item.variants.map(({ stem, options, solution }) => ({ stem, options, solution })),
      ),
    )
    .digest("hex")
    .slice(0, 16);

const inCurriculum = new Map(
  curriculum.flatMap((tier) =>
    tier.modules.flatMap((module) => module.lessons.map((lesson) => [lesson, module.id] as const)),
  ),
);
const itemOwner = new Map<string, string>();
const hashes: Record<string, string> = {};

/** Rules every question follows, in a lesson or a paper. */
function checkItem(item: Item, owner: string) {
  const where = `${owner}/${item.id}`;
  if (itemOwner.has(item.id)) fail(where, `item id also used in ${itemOwner.get(item.id)}`);
  itemOwner.set(item.id, owner);
  for (const source of item.sources) if (!sources[source]) fail(where, `unknown source ${source}`);
  const variantIds = new Set<string>();
  for (const variant of item.variants) {
    const vWhere = `${where}/${variant.id}`;
    if (variantIds.has(variant.id)) fail(vWhere, "duplicate variant id");
    variantIds.add(variant.id);
    const optionIds = variant.options.map((o) => o.id);
    if (new Set(optionIds).size !== optionIds.length) fail(vWhere, "duplicate option ids");
    if (variant.options.filter((o) => o.correct).length !== 1)
      fail(vWhere, "needs exactly one correct option");
    const texts = [variant.stem, ...variant.options.map((o) => o.text)];
    for (const text of texts) {
      for (const [pattern, message] of BANNED) if (pattern.test(text)) fail(vWhere, message);
    }
    lintText(
      vWhere,
      [...texts, ...variant.options.map((o) => o.why), variant.solution ?? ""].join("\n"),
    );
    // The right answer shouldn't stand out by length.
    const right = variant.options.find((o) => o.correct)?.text.length ?? 0;
    const longestWrong = Math.max(
      ...variant.options.filter((o) => !o.correct).map((o) => o.text.length),
    );
    if (right > 1.6 * longestWrong) {
      warnings.push(`${vWhere}: the correct option is much longer than the others`);
    }
  }
  hashes[item.id] = hashOf(item);
}

for (const lesson of lessons) {
  const at = lesson.id;
  const module = inCurriculum.get(lesson.id);
  if (!module) fail(at, "not listed in curriculum.json");
  else if (module !== lesson.module)
    fail(at, `module is ${lesson.module}, curriculum says ${module}`);
  for (const required of lesson.requires) {
    if (!inCurriculum.has(required)) fail(at, `requires unknown lesson ${required}`);
  }
  const conceptIds = new Set(lesson.steps.flatMap((s) => (s.type === "concept" ? [s.id] : [])));
  const items = new Map(lesson.items.map((item) => [item.id, item]));
  const scored = new Set<string>();
  const pretests = lesson.steps.filter((s) => s.type === "question" && s.pretest).length;
  if (pretests > 1) fail(at, `${pretests} pretest questions: one per lesson at most`);
  // A pretest item comes back scored later in the lesson, in another wording.
  lesson.steps.forEach((s, i) => {
    if (s.type !== "question" || !s.pretest) return;
    const back = lesson.steps
      .slice(i + 1)
      .some(
        (t) => t.type === "question" && !t.pretest && t.item === s.item && t.variant !== s.variant,
      );
    if (!back) fail(at, `pretest ${s.item} never comes back scored later in another variant`);
  });

  for (const step of lesson.steps) {
    if (step.type === "concept") {
      const where = `${at}/${step.id}`;
      lintText(where, step.text);
      const marked = new Set([...step.text.matchAll(/\[\[c:([a-z0-9-]+)\]\]/g)].map((m) => m[1]));
      for (const claim of step.claims) {
        if (!marked.has(claim.id)) fail(where, `claim ${claim.id} is not placed in the text`);
        for (const source of [...claim.sources, ...claim.evidence.map((e) => e.source)]) {
          if (!sources[source]) fail(where, `unknown source ${source}`);
        }
        if (!claim.evidence.some((e) => claim.sources.includes(e.source))) {
          fail(where, `claim ${claim.id} has no quoted evidence from its sources`);
        }
      }
      for (const id of marked) {
        if (!step.claims.some((claim) => claim.id === id)) fail(where, `[[c:${id}]] has no claim`);
      }
      for (const side of step.debate?.sides ?? []) {
        for (const source of side.sources)
          if (!sources[source]) fail(where, `unknown source ${source}`);
      }
    }
    if (step.type === "question") {
      const item = items.get(step.item);
      if (!item) fail(at, `question step names unknown item ${step.item}`);
      else if (step.variant && !item.variants.some((v) => v.id === step.variant)) {
        fail(at, `item ${step.item} has no variant ${step.variant}`);
      }
      if (!step.pretest) scored.add(step.item);
    }
    if (step.type === "example")
      lintText(`${at}/${step.id}`, [step.problem, ...step.steps].join("\n"));
  }

  for (const item of lesson.items) {
    const where = `${at}/${item.id}`;
    if (!conceptIds.has(item.concept)) fail(where, `concept ${item.concept} is not in this lesson`);
    if (!scored.has(item.id)) fail(where, "never asked as a scored question");
    checkItem(item, at);
  }
}

// Papers of the week (data/papers/*.json): skipped by --module.
const paperIds = onlyModule ? [] : jsonFiles("papers");
const papers = paperIds.flatMap((file) => {
  const paper = parse(Paper, read(`papers/${file}.json`), `papers/${file}.json`);
  if (paper && paper.id !== file) fail(file, `id is ${paper.id}, file name says ${file}`);
  return paper ? [paper] : [];
});
const moduleIds = new Set(curriculum.flatMap((t) => t.modules.map((m) => m.id)));
for (const paper of papers) {
  const at = `papers/${paper.id}`;
  if (!sources[paper.source]) fail(at, `unknown source ${paper.source}`);
  for (const topic of paper.topics) {
    if (!inCurriculum.has(topic) && !moduleIds.has(topic))
      fail(at, `unknown lesson or module ${topic}`);
  }
  lintText(
    at,
    [paper.question, paper.design, paper.findings, paper.limits, paper.meaning].join("\n"),
  );
  for (const item of paper.items) {
    if (item.concept !== paper.id)
      fail(`${at}/${item.id}`, "a paper's items have the paper id as concept");
    checkItem(item, at);
  }
}

// Bloom quota, once a module's lessons are all written.
for (const tier of curriculum) {
  for (const module of tier.modules) {
    const written = lessons.filter((lesson) => lesson.module === module.id);
    if (!written.length || written.length < module.lessons.length) continue;
    const items = written.flatMap((lesson) => lesson.items);
    const higher = items.filter((i) => ["apply", "analyse", "evaluate"].includes(i.bloom)).length;
    if (higher < 0.4 * items.length)
      fail(module.id, `${higher}/${items.length} items apply/analyse/evaluate, need 40%`);
  }
}

// Lock: a changed question must be accepted on purpose (a new meaning needs a new id).
const lockUrl = dataUrl("items.lock.json");
const lock: Record<string, string> = existsSync(lockUrl)
  ? JSON.parse(readFileSync(lockUrl, "utf8"))
  : {};
const changed = Object.keys(hashes).filter(
  (id) => lock[id] && lock[id] !== "retired" && lock[id] !== hashes[id],
);
const reused = Object.keys(hashes).filter((id) => lock[id] === "retired");
for (const id of reused) fail(id, "this id was retired: use a new id");
const accept = process.argv.includes("--accept");
if (changed.length && !accept) {
  fail(
    "items.lock.json",
    `changed: ${changed.join(", ")}. Typo fix? Re-run with --accept. New meaning? Use a new id.`,
  );
}

for (const warning of warnings) console.warn(`warn  ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`error ${error}`);
  console.error(`\n${errors.length} errors`);
  process.exit(1);
}
if (onlyModule) {
  console.log(`ok: ${onlyModule}, ${lessons.length} lessons (nothing written)`);
  process.exit(0);
}

const retired = Object.fromEntries(
  Object.entries(lock)
    .filter(([id]) => !hashes[id])
    .map(([id]) => [id, "retired"]),
);
writeFileSync(
  lockUrl,
  `${JSON.stringify({ ...retired, ...hashes }, Object.keys({ ...retired, ...hashes }).sort(), 1)}\n`,
);

/** [variable, import path] per file of data/<dir>/. */
const parts = (dir: string, prefix: string) =>
  jsonFiles(dir).map((f) => [`${prefix}_${f.replaceAll("-", "_")}`, `../../data/${dir}/${f}.json`]);
const glossaryParts = parts("glossary", "g");
const sourceParts = parts("sources", "s");
const spread = (list: string[][]) => list.map(([v]) => `...${v}`).join(", ");
const name = (id: string) => `l_${id.replaceAll("-", "_")}`;
writeFileSync(
  new URL("../src/lib/content-index.ts", import.meta.url),
  [
    "// Generated by `pnpm content:check` from data/. Do not edit.",
    'import type { Curriculum, Lesson, Paper } from "./content";',
    'import curriculum from "../../data/curriculum.json";',
    ...lessonIds.map((id) => `import ${name(id)} from "../../data/lessons/${id}.json";`),
    ...paperIds.map((id, i) => `import p_${i} from "../../data/papers/${id}.json";`),
    "",
    "export const CURRICULUM = curriculum as Curriculum;",
    `export const LESSONS = [${lessonIds.map(name).join(", ")}] as Lesson[];`,
    `export const PAPERS = [${paperIds
      .map((_, i) => `p_${i}`)
      .reverse()
      .join(", ")}] as Paper[];`,
    `export const HASHES: Record<string, string> = ${JSON.stringify(hashes)};`,
    "",
  ].join("\n"),
);
// Terms and sources only, for code that runs on the phone (the content index holds every lesson).
writeFileSync(
  new URL("../src/lib/refs-index.ts", import.meta.url),
  [
    "// Generated by `pnpm content:check` from data/. Do not edit.",
    'import type { Glossary, Source } from "./content";',
    ...[...glossaryParts, ...sourceParts].map(([v, path]) => `import ${v} from "${path}";`),
    "",
    `export const GLOSSARY = { ${spread(glossaryParts)} } as Glossary;`,
    `export const SOURCES = { ${spread(sourceParts)} } as Record<string, Source>;`,
    "",
  ].join("\n"),
);
execFileSync(
  "node_modules/.bin/biome",
  ["format", "--write", "src/lib/content-index.ts", "src/lib/refs-index.ts"],
  {
    stdio: "ignore",
  },
);
console.log(
  `ok: ${lessons.length} lessons, ${papers.length} papers, ${Object.keys(hashes).length} items, ${Object.keys(sources).length} sources`,
);
