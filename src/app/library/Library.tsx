"use client";

import { useDeferredValue, useState } from "react";
import type { Glossary, Source } from "@/lib/content";
import { Go } from "../Nav";
import { cite } from "../ui/Evidence";

type Concept = { title: string; lesson: string; id: string; lessonTitle: string };

const has = (query: string, ...texts: (string | undefined)[]) =>
  texts.some((t) => t?.toLowerCase().includes(query));

export function Library({
  concepts,
  glossary,
  sources,
}: {
  concepts: Concept[];
  glossary: Glossary;
  sources: Record<string, Source>;
}) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const terms = Object.entries(glossary)
    .filter(([, t]) => has(q, t.term, t.short))
    .sort(([, a], [, b]) => a.term.localeCompare(b.term));
  const found = concepts.filter((c) => has(q, c.title, c.lessonTitle));
  const cited = Object.entries(sources)
    .filter(([, s]) => has(q, s.title, s.firstAuthor, s.journal, String(s.year)))
    .sort(([, a], [, b]) => a.firstAuthor.localeCompare(b.firstAuthor));

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search: lactate, Gastin, PCr…"
        aria-label="Search the library"
        className="field"
      />
      <Section title="Terms" empty={!terms.length}>
        {terms.map(([id, t]) => (
          <li key={id} className="flex flex-col">
            <span className="font-semibold">{t.term}</span>
            <span className="text-sm">{t.short}</span>
            {t.lesson && (
              // A real tap target (≥ 32 px), not an 11 px underlined word.
              <Go
                href={`/lesson/${t.lesson}/read`}
                className="-my-1 self-start py-2 text-sm font-semibold text-[var(--brand)]"
              >
                Read the lesson →
              </Go>
            )}
          </li>
        ))}
      </Section>
      <Section title="Concepts" empty={!found.length}>
        {found.map((c) => (
          <li key={`${c.lesson}-${c.id}`}>
            <Go href={`/lesson/${c.lesson}/read#${c.id}`} className="flex flex-col">
              <span className="font-semibold">{c.title}</span>
              <span className="muted text-xs">{c.lessonTitle}</span>
            </Go>
          </li>
        ))}
      </Section>
      <Section title="Sources" empty={!cited.length}>
        {cited.map(([id, s]) => (
          <li key={id} className="flex flex-col text-sm">
            <span className="font-semibold">{cite(s)}</span>
            <span>{s.title}</span>
            {s.doi && (
              <a
                href={`https://doi.org/${s.doi}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--brand)] underline"
              >
                doi:{s.doi}
              </a>
            )}
          </li>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <section className="flex flex-col gap-2">
      <p className="eyebrow">{title}</p>
      <ul className="card flex flex-col gap-3">{children}</ul>
    </section>
  );
}
