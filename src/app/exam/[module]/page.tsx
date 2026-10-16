import { notFound } from "next/navigation";
import { reviewVariant } from "@/lib/course";
import { drawEvenly, examScope, PASS } from "@/lib/exams";
import { requireUser } from "@/lib/session";
import { lessonsDone, repsOf } from "@/lib/study";
import { Go } from "../../Nav";
import { Exam } from "./Exam";

export const dynamic = "force-dynamic";

/**
 * A module or tier exam (the route param is either id): questions from all its lessons, in a
 * wording other than the next review's when there are 3+, no feedback until the end. Open once
 * every lesson it covers is done.
 */
export default async function ExamPage({ params }: { params: Promise<{ module: string }> }) {
  const userId = await requireUser();
  const scopeId = (await params).module;
  const scope = examScope(scopeId);
  if (!scope?.lessons.length) notFound();
  const { kind, title, lessons, complete, size } = scope;
  const done = await lessonsDone(userId);
  const missing = lessons.filter((l) => !done.has(l.id));
  if (!complete || missing.length) {
    return (
      <main className="screen justify-center">
        <p className="eyebrow">{kind} exam</p>
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="prose-text">
          {complete
            ? `Finish every lesson first: ${missing.map((l) => l.title).join(", ")}.`
            : `Some lessons of this ${kind.toLowerCase()} aren't written yet. The exam opens when they are.`}
        </p>
        <Go href="/map" className="btn">
          Back to the map
        </Go>
      </main>
    );
  }
  const picked = drawEvenly(scope.groups, size);
  const reps = await repsOf(
    userId,
    picked.map((p) => p.item.id),
  );
  const questions = picked.map(({ item, lessonId }) => ({
    item,
    lessonId,
    reps: reps.get(item.id) ?? 0,
    // The wording after the one your next review would show (with 1–2 variants, one you've seen).
    variant: reviewVariant(item, (reps.get(item.id) ?? 0) + 1),
  }));
  return (
    <Exam scopeId={scopeId} title={`${kind} exam · ${title}`} questions={questions} pass={PASS} />
  );
}
