import type { Lesson, Source } from "@/lib/content";
import { SOURCES } from "@/lib/content-index";

type Claim = Extract<Lesson["steps"][number], { type: "concept" }>["claims"][number];
type Grade = Claim["grade"];

export const GRADE_INFO: Record<Grade, string> = {
  strong:
    "Consistent systematic reviews or a consensus statement, or physiology settled by many independent studies.",
  moderate: "Several controlled studies that agree.",
  weak: "One small study, or mechanistic or observational work only.",
  disputed: "Good studies disagree.",
};

/** "Gastin 2001, Sports Med" plus the type of study. */
export function cite(source: Source) {
  return `${source.firstAuthor} ${source.year}${source.journal ? `, ${source.journal}` : ""}`;
}

/** A source in a list: citation, title, study type and sample, and a link to it. */
export function SourceLine({ id }: { id: string }) {
  const source = SOURCES[id];
  if (!source) return null;
  const href = source.doi ? `https://doi.org/${source.doi}` : source.url;
  return (
    <li className="flex flex-col gap-0.5 text-sm">
      <span className="font-semibold">{cite(source)}</span>
      <span>{source.title}</span>
      <span className="muted">
        {source.type.replace("-", " ")}
        {source.n ? ` · n = ${source.n}` : ""}
        {source.sample ? ` · ${source.sample}` : ""}
        {source.industryFunded ? " · industry funded" : ""}
        {source.type === "preprint" ? " · not peer reviewed" : ""}
      </span>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="text-[var(--brand)] underline">
          {source.doi ? `doi:${source.doi}` : "Open"}
        </a>
      )}
    </li>
  );
}

/** A grade mark: a coloured dot and the grade's name. */
export function GradeMark({ grade }: { grade: Grade }) {
  return (
    <span
      className="inline-flex items-center gap-1 align-middle font-sans text-[0.7rem] font-semibold tracking-wide uppercase"
      style={{ color: `var(--${grade})` }}
    >
      <span
        aria-hidden="true"
        className="size-2 rounded-full"
        style={{ background: `var(--${grade})` }}
      />
      {grade}
    </span>
  );
}

/** The evidence badge after a claim: tap it for EvidencePopover (same id). */
export function EvidenceButton({ claim, id }: { claim: Claim; id: string }) {
  return (
    <button
      type="button"
      popoverTarget={id}
      aria-label={`Evidence: ${claim.grade}`}
      className="ml-1 rounded-full border px-1.5 py-0.5 align-[0.1em] leading-none line"
    >
      <GradeMark grade={claim.grade} />
    </button>
  );
}

/** The grade, the quoted evidence and the sources of a claim. */
export function EvidencePopover({ claim, id }: { claim: Claim; id: string }) {
  return (
    <div popover="auto" id={id} className="font-sans text-base">
      <div className="flex flex-col gap-3">
        <GradeMark grade={claim.grade} />
        <strong>{claim.text}</strong>
        <span className="muted text-sm">{GRADE_INFO[claim.grade]}</span>
        {claim.evidence.map((e) => (
          <figure key={e.quote} className="line border-l-2 pl-3">
            <q className="font-serif italic">{e.quote}</q>
            <figcaption className="muted text-xs">
              {SOURCES[e.source] ? cite(SOURCES[e.source] as Source) : e.source}, {e.level}
            </figcaption>
          </figure>
        ))}
        <ul className="flex flex-col gap-2">
          {claim.sources.map((s) => (
            <SourceLine key={s} id={s} />
          ))}
        </ul>
      </div>
    </div>
  );
}
