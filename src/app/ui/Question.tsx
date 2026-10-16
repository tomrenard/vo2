"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Item } from "@/lib/content";
import { seededShuffle } from "@/lib/shuffle";
import { flagQuestion, submitAnswer } from "../actions";
import { Go } from "../Nav";
import { SourceLine } from "./Evidence";
import { Prose } from "./Prose";

export type Mode = "lesson" | "pretest" | "review" | "exam";
export type Result = { correct: boolean; sure: boolean };
type Variant = Item["variants"][number];

const LETTERS = ["A", "B", "C", "D"];

/**
 * One multiple-choice question. Pick an option, then say how sure you are (that is the FSRS
 * grade: wrong = Again, guessed = Hard, sure = Good). Feedback explains every option. Pretests
 * have no Sure/Guess and are never scored; exams show no feedback.
 * Keys: 1–4 pick, Enter = sure, G = guess, Enter again = continue.
 */
export function Question({
  item,
  variant,
  mode,
  reps,
  conceptHref,
  onDone,
}: {
  item: Item;
  variant: Variant;
  mode: Mode;
  /** Review count shown, so a repeated submit is dropped by the server. */
  reps: number;
  /** Where the concept this question tests can be read again. */
  conceptHref?: string;
  onDone: (result: Result) => void;
}) {
  const [options] = useState(() => seededShuffle(variant.options, `${variant.id}:${reps}`));
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(!item.recallFirst || mode === "pretest");
  const [result, setResult] = useState<Result | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [, startSaving] = useTransition();
  const startedAt = useRef(Date.now());

  const save = (sure: boolean) => {
    if (!picked) return;
    const correct = variant.options.find((o) => o.id === picked)?.correct === true;
    const answer = {
      itemId: item.id,
      variantId: variant.id,
      optionId: picked,
      sure,
      durationMs: Date.now() - startedAt.current,
      context: mode,
      seenReps: reps,
    };
    const send = () =>
      startSaving(async () => {
        try {
          await submitAnswer(answer);
          setSaveError(false);
        } catch {
          setSaveError(true);
        }
      });
    send();
    retry.current = send;
    // Feedback at once; the answer saves in the background.
    if (mode === "exam") onDone({ correct, sure });
    else setResult({ correct, sure });
  };
  const retry = useRef<() => void>(() => {});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.metaKey || event.ctrlKey) return;
      if (result) {
        if (event.key === "Enter") onDone(result);
        return;
      }
      const n = Number(event.key);
      if (shown && n >= 1 && n <= options.length) setPicked(options[n - 1]?.id ?? null);
      else if (!shown && event.key === " ") setShown(true);
      else if (event.key === "Enter" && picked) save(mode !== "pretest");
      else if (event.key.toLowerCase() === "g" && picked && mode !== "pretest") save(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const right = variant.options.find((o) => o.correct);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {mode === "pretest" && (
        <p className="eyebrow text-[var(--brand)]!">Guess first · not scored</p>
      )}
      <Prose
        text={variant.stem}
        prefix={`stem-${variant.id}`}
        className="font-serif text-[1.3rem] leading-snug"
      />

      {!result ? (
        <div className="mt-auto flex flex-col gap-2.5">
          {!shown ? (
            <button type="button" className="btn" onClick={() => setShown(true)}>
              Think of your answer, then show the options
            </button>
          ) : (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="sr-only">Options</legend>
              {options.map((option, i) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={picked === option.id}
                  onClick={() => setPicked(option.id)}
                  className={`card flex items-start gap-3 py-3.5 text-left transition-colors ${
                    picked === option.id ? "border-[var(--brand)]! bg-[var(--brand-soft)]!" : ""
                  }`}
                >
                  <span className="muted font-mono text-sm leading-6">{LETTERS[i]}</span>
                  <Prose
                    text={option.text}
                    prefix={`o-${option.id}`}
                    className="font-sans text-base leading-6"
                  />
                </button>
              ))}
            </fieldset>
          )}
          {shown &&
            (mode === "pretest" ? (
              <button
                type="button"
                className="btn btn-primary mt-2"
                disabled={!picked}
                onClick={() => save(false)}
              >
                Check
              </button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  className="btn"
                  disabled={!picked}
                  onClick={() => save(false)}
                >
                  Not sure
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!picked}
                  onClick={() => save(true)}
                >
                  I'm sure
                </button>
              </div>
            ))}
        </div>
      ) : (
        <Feedback
          variant={variant}
          item={item}
          picked={picked as string}
          letters={Object.fromEntries(options.map((o, i) => [o.id, LETTERS[i] as string]))}
          result={result}
          pretest={mode === "pretest"}
          conceptHref={conceptHref}
          onContinue={() => onDone(result)}
          right={right?.id ?? ""}
        />
      )}
      {saveError && (
        <p role="alert" className="text-sm text-[var(--wrong)]">
          Your answer wasn't saved.{" "}
          <button type="button" className="underline" onClick={() => retry.current()}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

function Feedback({
  item,
  variant,
  picked,
  right,
  letters,
  result,
  pretest,
  conceptHref,
  onContinue,
}: {
  item: Item;
  variant: Variant;
  picked: string;
  right: string;
  letters: Record<string, string>;
  result: Result;
  pretest: boolean;
  conceptHref?: string;
  onContinue: () => void;
}) {
  const chosen = variant.options.find((o) => o.id === picked);
  const correctOption = variant.options.find((o) => o.id === right);
  const others = variant.options.filter((o) => o.id !== picked && o.id !== right);
  const flagId = `flag-${item.id}-${variant.id}`;
  const [flagged, setFlagged] = useState(false);

  const headline = result.correct
    ? result.sure || pretest
      ? "Right"
      : "Right, but you guessed"
    : pretest
      ? "Not yet: this is what the next cards explain"
      : result.sure
        ? "Wrong, and you were sure"
        : "Not quite";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-4"
        style={{
          background: result.correct ? "var(--right-soft)" : "var(--wrong-soft)",
          color: result.correct ? "var(--right)" : "var(--wrong)",
        }}
      >
        <p className="font-semibold">{headline}</p>
        {!result.correct && result.sure && !pretest && (
          <p className="text-sm">These are the mistakes worth fixing: it comes back soon.</p>
        )}
        {result.correct && !result.sure && !pretest && (
          <p className="text-sm">It comes back sooner than a sure answer would.</p>
        )}
      </div>

      {!result.correct && chosen && (
        <OptionWhy letter={letters[chosen.id]} text={chosen.text} why={chosen.why} tone="wrong" />
      )}
      {correctOption && (
        <OptionWhy
          letter={letters[correctOption.id]}
          text={correctOption.text}
          why={correctOption.why}
          tone="right"
        />
      )}
      {variant.solution && (
        <div className="card">
          <p className="eyebrow mb-2">Worked solution</p>
          <Prose
            text={variant.solution}
            prefix={`sol-${variant.id}`}
            className="font-mono text-sm leading-6"
          />
        </div>
      )}
      {others.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Why not the others</summary>
          <div className="mt-3 flex flex-col gap-3">
            {others.map((o) => (
              <OptionWhy key={o.id} letter={letters[o.id]} text={o.text} why={o.why} />
            ))}
          </div>
        </details>
      )}

      <details className="text-sm">
        <summary className="muted cursor-pointer">Sources</summary>
        <ul className="mt-2 flex flex-col gap-3">
          {item.sources.map((s) => (
            <SourceLine key={s} id={s} />
          ))}
        </ul>
      </details>

      <div className="flex items-center justify-between text-sm">
        {conceptHref && !pretest ? (
          <Go href={conceptHref} className="text-[var(--brand)] underline">
            Read the concept again
          </Go>
        ) : (
          <span />
        )}
        <button type="button" popoverTarget={flagId} className="muted underline">
          {flagged ? "Flagged, thanks" : "Flag this question"}
        </button>
      </div>
      <form
        popover="auto"
        id={flagId}
        className="w-[min(24rem,calc(100vw-2rem))]"
        action={async (form) => {
          await flagQuestion(item.id, variant.id, String(form.get("note") ?? ""));
          setFlagged(true);
          document.getElementById(flagId)?.hidePopover();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-semibold">What looks wrong?</span>
          <textarea
            name="note"
            required
            rows={4}
            className="field"
            placeholder="Two answers look right, the numbers don't add up…"
          />
        </label>
        <button type="submit" className="btn btn-primary mt-3 w-full">
          Send
        </button>
      </form>

      <button
        type="button"
        className="btn btn-primary sticky bottom-[max(1rem,env(safe-area-inset-bottom))] mt-auto"
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  );
}

function OptionWhy({
  letter,
  text,
  why,
  tone,
}: {
  letter?: string;
  text: string;
  why: string;
  tone?: "right" | "wrong";
}) {
  return (
    <div
      className="card border-l-4"
      style={tone ? { borderLeftColor: `var(--${tone})` } : undefined}
    >
      <p className="mb-1 flex gap-2 font-semibold">
        <span className="muted font-mono text-sm leading-6">{letter}</span>
        <span>
          {tone === "right" ? "✓ " : tone === "wrong" ? "✗ " : ""}
          {text}
        </span>
      </p>
      <Prose
        text={why}
        prefix={`why-${letter}`}
        className="font-serif text-[1.05rem] leading-relaxed"
      />
    </div>
  );
}
