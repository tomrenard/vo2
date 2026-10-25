"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/content";
import { sessionFinished } from "../actions";
import { Go } from "../Nav";
import { Question, type Result } from "../ui/Question";

type Entry = { item: Item; href: string; reps: number; variantId: string; leech: boolean };

/**
 * Reviews one by one. A missed question goes to the end of the queue in its next wording, so
 * it is asked again before the session ends (the server has it due in 10 minutes too).
 */
export function Session({
  queue: start,
  next,
}: {
  queue: Entry[];
  next: { id: string; title: string } | null;
}) {
  const [queue, setQueue] = useState(start);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const entry = queue[index];
  const finished = !entry && results.length > 0;
  // The tab pages drop their cached counts once the session is over.
  useEffect(() => {
    if (finished) void sessionFinished();
  }, [finished]);

  if (!entry) {
    const right = results.filter((r) => r.correct).length;
    return (
      <main className="screen justify-center">
        <p className="eyebrow">{results.length ? "Session done" : "Nothing to review"}</p>
        <h1 className="font-serif text-3xl leading-tight">
          {results.length ? `${right} of ${results.length} right` : "You're up to date."}
        </h1>
        {next && (
          <Go href={`/lesson/${next.id}`} className="btn btn-primary">
            Next lesson: {next.title}
          </Go>
        )}
        <Go href="/" className="btn">
          Back to Study
        </Go>
      </main>
    );
  }

  const variant =
    entry.item.variants.find((v) => v.id === entry.variantId) ?? entry.item.variants[0];
  if (!variant) return null;
  return (
    <main className="screen">
      <div className="flex items-center gap-3">
        <Go
          href="/"
          aria-label="End session"
          className="muted -ml-1 p-1 text-2xl leading-none"
          onClick={() => void sessionFinished()}
        >
          ×
        </Go>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width]"
            style={{ width: `${(100 * index) / queue.length}%` }}
          />
        </div>
        <span className="muted font-mono text-xs tabular-nums">{queue.length - index} left</span>
      </div>
      <Question
        key={index}
        item={entry.item}
        variant={variant}
        mode="review"
        reps={entry.reps}
        conceptHref={entry.href}
        leech={entry.leech}
        onDone={(result) => {
          setResults((r) => [...r, result]);
          if (!result.correct) {
            const reps = entry.reps + 1;
            const again = entry.item.variants[reps % entry.item.variants.length] ?? variant;
            setQueue((q) => [...q, { ...entry, reps, variantId: again.id }]);
          }
          setIndex(index + 1);
          window.scrollTo(0, 0);
        }}
      />
    </main>
  );
}
