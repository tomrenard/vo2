"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { Paper, Source } from "@/lib/content";
import { Go } from "../Nav";
import { cite, GradeMark } from "../ui/Evidence";

type PaperRow = {
  id: string;
  headline: string;
  grade: Paper["grade"];
  source?: Source;
  fresh: boolean;
  tiers: string[];
};

const PAGE = 10;

/** Search (lowercased query) over headline, author, journal and title, plus tier and "new only". */
export function matches(
  p: PaperRow,
  { q, tier, freshOnly }: { q: string; tier: string; freshOnly: boolean },
) {
  return (
    (!freshOnly || p.fresh) &&
    (!tier || p.tiers.includes(tier)) &&
    [p.headline, p.source?.firstAuthor, p.source?.journal, p.source?.title].some((t) =>
      t?.toLowerCase().includes(q),
    )
  );
}

/** Papers with a search box, a tier filter and a "new only" toggle; loads 10 more on scroll. */
export function PaperList({ papers, tiers }: { papers: PaperRow[]; tiers: string[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [freshOnly, setFreshOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const end = useRef<HTMLLIElement>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  const found = papers.filter((p) => matches(p, { q, tier, freshOnly }));
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setShown(PAGE);
    };

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-observe after each page, or a still-visible end marker never fires again
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting) setShown((n) => n + PAGE);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, found.length]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => filter(setQuery)(e.target.value)}
        placeholder="Search: carbohydrate, altitude, Burke…"
        aria-label="Search papers"
        className="field"
      />
      <div className="flex items-center gap-3 text-sm">
        <select
          value={tier}
          onChange={(e) => filter(setTier)(e.target.value)}
          aria-label="Filter by tier"
          className="field min-w-0 flex-1"
        >
          <option value="">All topics</option>
          {tiers.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="flex shrink-0 items-center gap-1.5">
          <input
            type="checkbox"
            checked={freshOnly}
            onChange={(e) => filter(setFreshOnly)(e.target.checked)}
          />
          New only
        </label>
      </div>
      {found.length === 0 && <p className="muted text-sm">No paper matches.</p>}
      <ul className="flex flex-col gap-3">
        {found.slice(0, shown).map((paper) => (
          <li key={paper.id}>
            <Go href={`/papers/${paper.id}`} className="card flex flex-col gap-1.5">
              <span className="flex items-center justify-between gap-2">
                <span className="eyebrow">{paper.id.slice(0, 10)}</span>
                {paper.fresh && (
                  <span className="text-xs font-semibold text-[var(--brand)]">new</span>
                )}
              </span>
              <span className="font-serif text-xl leading-snug">{paper.headline}</span>
              <span className="muted flex flex-wrap items-center gap-x-2 text-sm">
                {paper.source && cite(paper.source)}
                <GradeMark grade={paper.grade} />
                {paper.source?.type === "preprint" && <span>· preprint</span>}
              </span>
            </Go>
          </li>
        ))}
        {shown < found.length && <li ref={end} aria-hidden className="h-8" />}
      </ul>
    </div>
  );
}
