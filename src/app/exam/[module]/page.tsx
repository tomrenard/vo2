import { notFound } from "next/navigation";
import { reviewVariant } from "@/lib/course";
import { COURSE_MIN, drawEvenly, examScope, PASS } from "@/lib/exams";
import { requireUser } from "@/lib/session";
import { lessonsDone, repsOf } from "@/lib/study";
import { Go } from "../../Nav";
import { Exam } from "./Exam";

export const dynamic = "force-dynamic";

/**
 * A module, tier or course exam (the route param is the id): questions from its lessons, in a
 * wording other than the next review's when there are 3+, no feedback until the end. Open once
 * every lesson it covers is done (the course exam: after a few lessons, asking only those).
 */
export default async function ExamPage({ params }: { params: Promise<{ module: string }> }) {
  const userId = await requireUser();
  const scopeId = (await params).module;
  const scope = examScope(scopeId);
  if (!scope?.lessons.length) notFound();
  const { kind, title, complete, size } = scope;
  const done = await lessonsDone(userId);
  const course = kind === "Course";
  // The course exam asks only what you've learnt; the others open once all of theirs is done.
  const lessons = course ? scope.lessons.filter((l) => done.has(l.id)) : scope.lessons;
  const groups = course
    ? scope.groups.map((g) => g.filter((p) => done.has(p.lessonId))).filter((g) => g.length)
    : scope.groups;
  const missing = lessons.filter((l) => !done.has(l.id));
  const locked = course
    ? lessons.length < COURSE_MIN &&
      `It opens after ${COURSE_MIN} lessons. You've done ${lessons.length}.`
    : !complete
      ? `Some lessons of this ${kind.toLowerCase()} aren't written yet. The exam opens when they are.`
      : missing.length > 0 &&
        `Finish every lesson first: ${missing.map((l) => l.title).join(", ")}.`;
  if (locked) {
    return (
      <main className="screen justify-center">
        <p className="eyebrow">{kind} exam</p>
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="prose-text">{locked}</p>
        <Go href={course ? "/progress" : "/map"} className="btn">
          {course ? "Back to Progress" : "Back to the map"}
        </Go>
      </main>
    );
  }
  const picked = drawEvenly(groups, size);
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
