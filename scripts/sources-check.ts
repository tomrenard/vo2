/**
 * Checks every source with a DOI against Crossref: the DOI must exist and its title, first author
 * and year must match ours (a made-up citation often has a real DOI of another paper). Also fails
 * on retracted or withdrawn papers (Crossref carries Retraction Watch data). Run monthly too.
 */
import { readdirSync, readFileSync } from "node:fs";
import type { Source } from "../src/lib/content.ts";

const dir = new URL("../data/sources/", import.meta.url);
const sources: Record<string, Source> = Object.assign(
  {},
  ...readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(new URL(file, dir), "utf8"))),
);

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/<[^>]+>|[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

/** Share of our title's words found in Crossref's (case, accents, punctuation ignored). */
function titleMatch(ours: string, theirs: string) {
  const a = words(ours);
  const b = words(theirs);
  return [...a].filter((w) => b.has(w)).length / Math.max(a.size, 1);
}

const plain = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

type Work = {
  title?: string[];
  author?: { family?: string; sequence?: string }[];
  issued?: { "date-parts"?: number[][] };
  "updated-by"?: { type?: string }[];
};

async function fetchWork(doi: string): Promise<Work | null> {
  const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { "User-Agent": "vo2-sources-check/1.0" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Crossref ${response.status} for ${doi}`);
  return ((await response.json()) as { message: Work }).message;
}

const errors: string[] = [];
const entries = Object.entries(sources).filter(([, s]) => s.doi);
for (const [id, source] of entries) {
  const work = await fetchWork(source.doi as string);
  if (!work) {
    errors.push(`${id}: DOI ${source.doi} does not exist`);
    continue;
  }
  const title = work.title?.[0] ?? "";
  if (titleMatch(source.title, title) < 0.8)
    errors.push(`${id}: title doesn't match Crossref: "${title}"`);
  const first = work.author?.find((a) => a.sequence === "first") ?? work.author?.[0];
  if (first?.family && plain(first.family) !== plain(source.firstAuthor)) {
    errors.push(`${id}: first author is ${first.family}, not ${source.firstAuthor}`);
  }
  const year = work.issued?.["date-parts"]?.[0]?.[0];
  // Online-first and print years can differ by one.
  if (year && Math.abs(year - source.year) > 1)
    errors.push(`${id}: year is ${year}, not ${source.year}`);
  const notice = work["updated-by"]?.find((u) => /retraction|withdrawal/i.test(u.type ?? ""));
  if (notice) errors.push(`${id}: ${notice.type} notice on this paper`);
}
for (const error of errors) console.error(`error ${error}`);
console.log(`${entries.length - errors.length}/${entries.length} DOIs ok`);
process.exit(errors.length ? 1 : 0);
