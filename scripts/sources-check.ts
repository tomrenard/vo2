/**
 * Checks every source with a DOI against Crossref: the DOI must exist and its title, first author
 * and year must match ours (a made-up citation often has a real DOI of another paper). Also fails
 * on retracted or withdrawn papers (Crossref carries Retraction Watch data). Run monthly too.
 */
import { readdirSync, readFileSync } from "node:fs";
import type { Source } from "../src/lib/content.ts";
import { sameName, titleMatch } from "./names.ts";

const dir = new URL("../data/sources/", import.meta.url);
const sources: Record<string, Source> = Object.assign(
  {},
  ...readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(new URL(file, dir), "utf8"))),
);

type Work = {
  title?: string[];
  subtitle?: string[];
  author?: { family?: string; sequence?: string }[];
  issued?: { "date-parts"?: number[][] };
  "updated-by"?: { type?: string }[];
};

/** Crossref throttles (429) and has short outages: try again after 2, 4 and 8 s. */
async function fetchWork(doi: string, attempt = 0): Promise<Work | null> {
  const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { "User-Agent": "vo2-sources-check/1.0" },
  }).catch(() => null);
  if (response?.status === 404) return null;
  if (response?.ok) return ((await response.json()) as { message: Work }).message;
  if (attempt >= 3) throw new Error(`Crossref ${response?.status ?? "unreachable"} for ${doi}`);
  await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  return fetchWork(doi, attempt + 1);
}

const errors: string[] = [];
const entries = Object.entries(sources).filter(([, s]) => s.doi);
for (const [id, source] of entries) {
  const work = await fetchWork(source.doi as string);
  if (!work) {
    errors.push(`${id}: DOI ${source.doi} does not exist`);
    continue;
  }
  // Crossref often keeps the subtitle apart: compare against both together.
  const title = [work.title?.[0], work.subtitle?.[0]].filter(Boolean).join(": ");
  if (titleMatch(source.title, title) < 0.8)
    errors.push(`${id}: title doesn't match Crossref: "${title}"`);
  const first = work.author?.find((a) => a.sequence === "first") ?? work.author?.[0];
  if (first?.family && !sameName(first.family, source.firstAuthor)) {
    errors.push(`${id}: first author is ${first.family}, not ${source.firstAuthor}`);
  }
  const year = work.issued?.["date-parts"]?.[0]?.[0];
  // Online-first and print years can differ by one.
  if (year && Math.abs(year - source.year) > 1)
    errors.push(`${id}: year is ${year}, not ${source.year}`);
  const notice = work["updated-by"]?.find((u) => /retraction|withdrawal|removal|expression.of.concern/i.test(u.type ?? ""));
  if (notice) errors.push(`${id}: ${notice.type} notice on this paper`);
  // A correction may change a number we quote: someone reads it before relying on the paper.
  const correction = work["updated-by"]?.find((u) =>
    /correction|erratum|corrigendum/i.test(u.type ?? ""),
  );
  if (correction && !source.correctionChecked)
    console.warn(`warn  ${id}: has a ${correction.type} notice: check what it changed`);
}
for (const error of errors) console.error(`error ${error}`);
console.log(`${entries.length - errors.length}/${entries.length} DOIs ok`);
process.exit(errors.length ? 1 : 0);
