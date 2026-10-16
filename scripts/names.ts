/** Matching our citations against Crossref's metadata (used by sources-check.ts). */

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
export function titleMatch(ours: string, theirs: string) {
  const a = words(ours);
  const b = words(theirs);
  return [...a].filter((w) => b.has(w)).length / Math.max(a.size, 1);
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
