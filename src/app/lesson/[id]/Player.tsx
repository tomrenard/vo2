"use client";

import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/content";
import { lessonFinished } from "../../actions";
import { Diagram } from "../../diagrams/Diagram";
import { Go } from "../../Nav";
import { SourceLine } from "../../ui/Evidence";
import { Prose } from "../../ui/Prose";
import { Question, type Result } from "../../ui/Question";

const saved = (id: string) => `vo2:lesson:${id}`;

/** A lesson, one step at a time: concept cards, worked examples, questions, recap. */
export function Player({ lesson, reps }: { lesson: Lesson; reps: Record<string, number> }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [counts, setCounts] = useState(reps);
  const [done, setDone] = useState(false);
  const steps = lesson.steps;
  const step = steps[index];

  // Pick up where you left off (this device only).
  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(saved(lesson.id)));
      if (at > 0 && at < steps.length) setIndex(at);
    } catch {}
  }, [lesson.id, steps.length]);

  const go = (next: number) => {
    setIndex(next);
    try {
      localStorage.setItem(saved(lesson.id), String(next));
    } catch {}
    window.scrollTo(0, 0);
  };
  const next = () => (index + 1 < steps.length ? go(index + 1) : finish());
  const finish = async () => {
    await lessonFinished(lesson.id);
    try {
      localStorage.removeItem(saved(lesson.id));
    } catch {}
    setDone(true);
  };

  if (done) return <Done lesson={lesson} results={results} />;
  if (!step) return null;

  return (
    <main className="screen">
      <div className="flex items-center gap-3">
        <Go href="/" aria-label="Close lesson" className="muted -ml-1 p-1 text-2xl leading-none">
          ×
        </Go>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width]"
            style={{ width: `${(100 * index) / steps.length}%` }}
          />
        </div>
        <span className="muted font-mono text-xs tabular-nums">
          {index + 1}/{steps.length}
        </span>
      </div>

      {step.type === "concept" && (
        <article className="flex flex-1 flex-col gap-4">
          <p className="eyebrow">{lesson.title}</p>
          <h1 className="font-serif text-3xl leading-tight">{step.title}</h1>
          <Prose text={step.text} claims={step.claims} prefix={step.id} />
          {step.diagram && <Diagram spec={step.diagram} />}
          {step.debate && <Debate debate={step.debate} />}
          <button type="button" className="btn btn-primary mt-auto" onClick={next}>
            Continue
          </button>
        </article>
      )}

      {step.type === "example" && <Example key={index} step={step} onDone={next} />}

      {step.type === "question" &&
        (() => {
          const item = lesson.items.find((i) => i.id === step.item);
          const variant = item?.variants.find((v) => v.id === step.variant) ?? item?.variants[0];
          if (!item || !variant) return null;
          return (
            <Question
              key={index}
              item={item}
              variant={variant}
              mode={step.pretest ? "pretest" : "lesson"}
              reps={counts[item.id] ?? 0}
              conceptHref={`/lesson/${lesson.id}/read#${item.concept}`}
              onDone={(result) => {
                if (!step.pretest) {
                  setResults((r) => [...r, result]);
                  setCounts((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }));
                }
                next();
              }}
            />
          );
        })()}

      {step.type === "recap" && (
        <article className="flex flex-1 flex-col gap-4">
          <p className="eyebrow">Recap</p>
          <h1 className="font-serif text-3xl leading-tight">{lesson.title}</h1>
          <ul className="prose-text flex list-disc flex-col gap-2 pl-5">
            {step.points.map((point) => (
              <li key={point}>
                <Prose text={point} prefix={`r-${point.slice(0, 8)}`} className="" />
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary mt-auto" onClick={next}>
            Finish lesson
          </button>
        </article>
      )}
    </main>
  );
}

type ExampleStep = Extract<Lesson["steps"][number], { type: "example" }>;

/** A worked example: the problem, then one step of the solution per tap. */
function Example({ step, onDone }: { step: ExampleStep; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const all = shown >= step.steps.length;
  return (
    <article className="flex flex-1 flex-col gap-4">
      <p className="eyebrow">Worked example</p>
      <h1 className="font-serif text-3xl leading-tight">{step.title}</h1>
      <Prose text={step.problem} prefix={`${step.id}-p`} />
      <ol className="flex flex-col gap-3">
        {step.steps.slice(0, shown).map((s, i) => (
          <li key={s} className="card flex gap-3">
            <span className="muted font-mono text-sm leading-6">{i + 1}</span>
            <Prose text={s} prefix={`${step.id}-${i}`} className="font-mono text-sm leading-6" />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-primary mt-auto"
        onClick={() => (all ? onDone() : setShown(shown + 1))}
      >
        {all ? "Continue" : shown === 0 ? "Show the first step" : "Next step"}
      </button>
    </article>
  );
}

type DebateSpec = NonNullable<Extract<Lesson["steps"][number], { type: "concept" }>["debate"]>;

export function Debate({ debate }: { debate: DebateSpec }) {
  return (
    <aside className="card border-l-4" style={{ borderLeftColor: "var(--disputed)" }}>
      <p className="eyebrow mb-2" style={{ color: "var(--disputed)" }}>
        What's debated
      </p>
      <p className="mb-3 font-semibold">{debate.question}</p>
      <div className="flex flex-col gap-3">
        {debate.sides.map((side) => (
          <details key={side.position}>
            <summary className="cursor-pointer font-serif text-[1.05rem]">{side.position}</summary>
            <ul className="mt-2 flex flex-col gap-2 pl-4">
              {side.sources.map((s) => (
                <SourceLine key={s} id={s} />
              ))}
            </ul>
          </details>
        ))}
      </div>
    </aside>
  );
}

function Done({ lesson, results }: { lesson: Lesson; results: Result[] }) {
  const right = results.filter((r) => r.correct).length;
  const confidentMisses = results.filter((r) => !r.correct && r.sure).length;
  const guessed = results.filter((r) => r.correct && !r.sure).length;
  return (
    <main className="screen justify-center">
      <p className="eyebrow">Lesson done</p>
      <h1 className="font-serif text-3xl leading-tight">{lesson.title}</h1>
      <p className="prose-text">{lesson.goal}</p>
      <dl className="card grid grid-cols-3 gap-2 text-center">
        <Stat label="right" value={`${right}/${results.length}`} />
        <Stat label="guessed" value={guessed} />
        <Stat label="sure but wrong" value={confidentMisses} />
      </dl>
      <p className="muted text-sm">
        Every question is now in your reviews. Missed ones come back in about 10 minutes, the others
        in a few days.
      </p>
      <Go href="/session" className="btn btn-primary">
        Review now
      </Go>
      <Go href="/" className="btn">
        Back to Study
      </Go>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dd className="font-mono text-2xl tabular-nums">{value}</dd>
      <dt className="muted text-xs">{label}</dt>
    </div>
  );
}
