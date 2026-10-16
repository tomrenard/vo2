/** Matching our citations against Crossref's metadata (used by sources-check.ts). */

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

/**
 * Crossref's title with its markup removed, read two ways: a tag sitting inside a word
 * (V<sub>2</sub>, often pretty-printed on its own line) joins up, while a tag between words
 * (Five <scp>CPET</scp> Systems) is a gap. Text alone can't tell which, so both are tried.
 */
const readings = (theirs: string) => [
  theirs.replace(/\s*<[^>]+>\s*/g, (tag) => (/\n/.test(tag) ? "" : tag)).replace(/<[^>]+>/g, ""),
  theirs.replace(/<[^>]+>/g, " "),
];

/** Share of our title's words found in Crossref's (case, accents, punctuation, markup ignored). */
export function titleMatch(ours: string, theirs: string) {
  const a = words(ours);
  return Math.max(
    ...readings(theirs).map((reading) => {
      const b = words(reading);
      return [...a].filter((w) => b.has(w)).length / Math.max(a.size, 1);
    }),
  );
}

/** Lowercase letters only; accents dropped, and letters NFD can't split spelled out (ø → o). */
const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/[øœæßłđ]/g, (c) => ({ ø: "o", œ: "oe", æ: "ae", ß: "ss", ł: "l", đ: "d" })[c] ?? c)
    .normalize("NFD")
    .replace(/[^a-z]/g, "");

/** Same family name. Crossref sometimes garbles a letter into "?" (B??rsheim): each "?" run matches 0–2 letters. */
export function sameName(theirs: string, ours: string) {
  const pattern = theirs.split(/\?+/).map(plain).join(".{0,2}");
  return new RegExp(`^${pattern}$`).test(plain(ours));
}
