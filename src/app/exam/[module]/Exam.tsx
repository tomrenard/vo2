"use client";

import { useState } from "react";
import type { Item } from "@/lib/content";
import { examFinished } from "../../actions";
import { Go } from "../../Nav";
import { Prose } from "../../ui/Prose";
import { Question, type Result } from "../../ui/Question";

type Entry = { item: Item; lessonId: string; reps: number; variant: Item["variants"][number] };

/** The exam run: no feedback per question; the score and every miss explained at the end. */
export function Exam({
  scopeId,
  title,
  questions,
  pass,
}: {
  scopeId: string;
  title: string;
  questions: Entry[];
  pass: number;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [saveError, setSaveError] = useState(false);
  const entry = questions[index];

  if (!entry) {
    const right = results.filter((r) => r.correct).length;
    const score = Math.round((100 * right) / Math.max(results.length, 1));
    const misses = questions.filter((_, i) => !results[i]?.correct);
    return (
      <main className="screen">
        <p className="eyebrow">{title}</p>
        <h1 className="font-serif text-4xl">{score}%</h1>
        <p className="prose-text">
          {score >= pass
            ? `Passed (${pass}% needed). ${right} of ${results.length} right.`
            : `Not yet: ${pass}% needed. ${right} of ${results.length} right. Your misses are already back in your reviews.`}
        </p>
        {saveError && (
          <p role="alert" className="text-sm text-[var(--wrong)]">
            Some answers or the result weren't saved, so missed questions may not be back in your
            reviews. Check your connection.
          </p>
        )}
        {misses.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="eyebrow">Your misses</p>
            {misses.map(({ item, variant, lessonId }) => {
              const right = variant?.options.find((o) => o.correct);
              return (
                <div key={item.id} className="card flex flex-col gap-2">
                  <Prose
                    text={variant?.stem ?? ""}
                    prefix={`m-${item.id}`}
                    className="font-serif text-lg leading-snug"
                  />
                  <p className="font-semibold text-[var(--right)]">✓ {right?.text}</p>
                  <Prose text={right?.why ?? ""} prefix={`mw-${item.id}`} className="font-serif" />
                  <Go
                    href={`/lesson/${lessonId}/read#${item.concept}`}
                    className="text-sm text-[var(--brand)] underline"
                  >
                    Read the concept again
                  </Go>
                </div>
              );
            })}
          </section>
        )}
        <Go href="/map" className="btn btn-primary">
          Back to the map
        </Go>
      </main>
    );
  }

  const { variant } = entry;
  return (
    <main className="screen">
      <div className="flex items-center gap-3">
        <Go
          href="/map"
          aria-label="Leave the exam"
          className="muted -ml-1 p-1 text-2xl leading-none"
        >
          ×
        </Go>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)]"
            style={{ width: `${(100 * index) / questions.length}%` }}
          />
        </div>
        <span className="muted font-mono text-xs tabular-nums">
          {index + 1}/{questions.length}
        </span>
      </div>
      <p className="eyebrow">{title} · no feedback until the end</p>
      <Question
        key={index}
        item={entry.item}
        variant={variant}
        mode="exam"
        reps={entry.reps}
        onSaveError={() => setSaveError(true)}
        onDone={(result) => {
          const all = [...results, result];
          setResults(all);
          setIndex(index + 1);
          window.scrollTo(0, 0);
          if (all.length === questions.length) {
            const score = (100 * all.filter((r) => r.correct).length) / all.length;
            examFinished(scopeId, score).catch(() => setSaveError(true));
          }
        }}
      />
    </main>
  );
}
