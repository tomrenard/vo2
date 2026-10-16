import { notFound } from "next/navigation";
import { reviewVariant } from "@/lib/course";
import { EXAM_SIZE, moduleLessons, PASS } from "@/lib/exams";
import { requireUser } from "@/lib/session";
import { shuffled } from "@/lib/shuffle";
import { lessonsDone, repsOf } from "@/lib/study";
import { Go } from "../../Nav";
import { Exam } from "./Exam";

export const dynamic = "force-dynamic";

/**
 * A module exam: questions from all its lessons, in a wording other than the next review's when there are 3+, no
 * feedback until the end. Open once every lesson of the module is done.
 */
export default async function ExamPage({ params }: { params: Promise<{ module: string }> }) {
  const userId = await requireUser();
  const moduleId = (await params).module;
  const { module, lessons, complete } = moduleLessons(moduleId);
  if (!module || !lessons.length) notFound();
  const done = await lessonsDone(userId);
  const missing = lessons.filter((l) => !done.has(l.id));
  if (!complete || missing.length) {
    return (
      <main className="screen justify-center">
        <p className="eyebrow">Module exam</p>
        <h1 className="font-serif text-3xl">{module.title}</h1>
        <p className="prose-text">
          {complete
            ? `Finish every lesson first: ${missing.map((l) => l.title).join(", ")}.`
            : "Some lessons of this module aren't written yet. The exam opens when they are."}
        </p>
        <Go href="/map" className="btn">
          Back to the map
        </Go>
      </main>
    );
  }
  const items = lessons.flatMap((lesson) =>
    lesson.items.map((item) => ({ item, lessonId: lesson.id })),
  );
  const picked = shuffled(items, Math.random).slice(0, EXAM_SIZE);
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
  return <Exam moduleId={moduleId} title={module.title} questions={questions} pass={PASS} />;
}
