// biome-ignore-all lint/suspicious/noArrayIndexKey: static text that is never reordered
import { Fragment, type ReactNode } from "react";
import type { Lesson } from "@/lib/content";
import { GLOSSARY } from "@/lib/refs-index";
import { EvidenceButton, EvidencePopover } from "./Evidence";

type Claim = Extract<Lesson["steps"][number], { type: "concept" }>["claims"][number];

/**
 * **bold**, *italic*, [[c:claim]] (an evidence badge) and [text](g:term) (a glossary term with
 * its definition one tap away). `prefix` keeps popover ids unique on the page. Popovers go to
 * `pops`, rendered after the text: a <ul> may not sit inside a <p>.
 */
function inline(text: string, claims: Claim[], prefix: string, pops: ReactNode[]): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[\[c:[a-z0-9-]+\]\]|\[[^\]]+\]\(g:[a-z0-9-]+\))/g)
    .map((part, i) => {
      const key = `${prefix}-${i}`;
      // Bold may hold a term link or a badge: render its inside the same way.
      if (part.startsWith("**")) {
        return <strong key={key}>{inline(part.slice(2, -2), claims, `${key}b`, pops)}</strong>;
      }
      if (part.startsWith("[[c:")) {
        const claim = claims.find((c) => c.id === part.slice(4, -2));
        if (!claim) return null;
        pops.push(<EvidencePopover key={key} claim={claim} id={`${key}-c`} />);
        return <EvidenceButton key={key} claim={claim} id={`${key}-c`} />;
      }
      const term = part.match(/^\[([^\]]+)\]\(g:([a-z0-9-]+)\)$/);
      if (term) {
        const entry = GLOSSARY[term[2] as string];
        const id = `${key}-g`;
        pops.push(
          <div key={key} popover="auto" id={id} className="font-sans text-base">
            <strong className="block">{entry?.term ?? term[1]}</strong>
            {entry?.short}
          </div>,
        );
        return (
          <button
            key={key}
            type="button"
            popoverTarget={id}
            className="underline decoration-[var(--brand)] decoration-dotted underline-offset-4"
          >
            {term[1]}
          </button>
        );
      }
      if (part.startsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
      return <Fragment key={key}>{part}</Fragment>;
    });
}

type Kind = "table" | "list" | "text";
const kind = (line: string): Kind =>
  line.startsWith("|") ? "table" : line.startsWith("- ") ? "list" : "text";

function blocks(text: string): string[][] {
  const runs: string[][] = [];
  let last: Kind | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      last = null;
      continue;
    }
    if (kind(line) === last) runs.at(-1)?.push(line);
    else runs.push([line]);
    last = kind(line);
  }
  return runs;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

/** The small markdown the content uses: paragraphs, "- " lists, pipe tables, inline marks. */
export function Prose({
  text,
  claims = [],
  prefix = "p",
  className = "prose-text",
}: {
  text: string;
  claims?: Claim[];
  prefix?: string;
  className?: string;
}) {
  const pops: ReactNode[] = [];
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {blocks(text).map((lines, b) => {
        const at = (n: number) => `${prefix}-${b}-${n}`;
        if (lines.every((line) => line.startsWith("|"))) {
          const [head = "", , ...rows] = lines;
          return (
            <div key={b} className="overflow-x-auto">
              <table className="w-full text-left font-sans text-sm tabular-nums">
                <thead>
                  <tr>
                    {cells(head).map((cell, c) => (
                      <th key={c} className="line border-b-2 px-2 py-1 font-semibold">
                        {inline(cell, claims, at(c), pops)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => (
                    <tr key={r}>
                      {cells(row).map((cell, c) => (
                        <td key={c} className="line border-b px-2 py-1">
                          {inline(cell, claims, at(100 * (r + 1) + c), pops)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={b} className="flex list-disc flex-col gap-1 pl-5">
              {lines.map((line, l) => (
                <li key={l}>{inline(line.slice(2), claims, at(l), pops)}</li>
              ))}
            </ul>
          );
        }
        return <p key={b}>{inline(lines.join(" "), claims, at(0), pops)}</p>;
      })}
      {pops}
    </div>
  );
}
