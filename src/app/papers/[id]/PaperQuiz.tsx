"use client";

import { useState } from "react";
import type { Item } from "@/lib/content";
import { sessionFinished } from "../../actions";
import { Question, type Result } from "../../ui/Question";

/** The paper's questions, one at a time; they join your reviews like lesson questions. */
export function PaperQuiz({
  items,
}: {
  items: { item: Item; variant: Item["variants"][number]; reps: number }[];
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const entry = index === null ? undefined : items[index];

  if (index === null) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setIndex(0)}>
        Answer its {items.length} questions
      </button>
    );
  }
  if (!entry) {
    const right = results.filter((r) => r.correct).length;
    return (
      <section className="card flex flex-col gap-1">
        <p className="font-semibold">
          {right} of {results.length} right
        </p>
        <p className="muted text-sm">These questions are now in your reviews.</p>
      </section>
    );
  }
  return (
    <section className="card flex min-h-[70dvh] flex-col">
      <p className="eyebrow mb-3">
        Question {index + 1} of {items.length}
      </p>
      <Question
        key={entry.item.id}
        item={entry.item}
        variant={entry.variant}
        mode="lesson"
        reps={entry.reps}
        onDone={(result) => {
          setResults((r) => [...r, result]);
          setIndex(index + 1);
          // Tab pages (Papers' "new", Study's counts) drop their cached copy.
          if (index + 1 === items.length) void sessionFinished();
        }}
      />
    </section>
  );
}
