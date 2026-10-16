import { notFound } from "next/navigation";
import { lessonById, moduleOf, paperById, reviewVariant } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { repsOf } from "@/lib/study";
import { Go } from "../../Nav";
import { GRADE_INFO, GradeMark, SourceLine } from "../../ui/Evidence";
import { Prose } from "../../ui/Prose";
import { PaperQuiz } from "./PaperQuiz";

export const dynamic = "force-dynamic";

const SECTIONS = [
  ["The question", "question"],
  ["What they did", "design"],
  ["What they found", "findings"],
  ["What limits it", "limits"],
  ["How it fits the course", "meaning"],
] as const;

/** One paper: the study in plain words, its limits and grade, then its questions. */
export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUser();
  const paper = paperById((await params).id);
  if (!paper) notFound();
  const reps = await repsOf(
    userId,
    paper.items.map((i) => i.id),
  );
  return (
    <main className="screen gap-6">
      <Go href="/papers" className="muted text-sm">
        ← Papers
      </Go>
      <header className="flex flex-col gap-2">
        <p className="eyebrow">Paper of the week · {paper.id.slice(0, 10)}</p>
        <h1 className="font-serif text-3xl leading-tight">{paper.headline}</h1>
        <ul>
          <SourceLine id={paper.source} />
        </ul>
        <p className="flex items-center gap-2 text-sm">
          <GradeMark grade={paper.grade} />
          <span className="muted">{GRADE_INFO[paper.grade]}</span>
        </p>
      </header>
      {SECTIONS.map(([title, key]) => (
        <section key={key} className="flex flex-col gap-2">
          <h2 className="eyebrow">{title}</h2>
          <Prose text={paper[key]} prefix={key} />
        </section>
      ))}
      {paper.topics.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">In the course</h2>
          <ul className="flex flex-col gap-1">
            {paper.topics.map((id) => {
              const lesson = lessonById(id);
              const module = moduleOf(id)?.module;
              return (
                <li key={id}>
                  {lesson ? (
                    <Go href={`/lesson/${id}/read`} className="text-[var(--brand)] underline">
                      {lesson.title}
                    </Go>
                  ) : (
                    <Go href="/map" className="text-[var(--brand)] underline">
                      {module?.title ?? id}
                      {module && !module.lessons.some((l) => lessonById(l)) && " (coming soon)"}
                    </Go>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <PaperQuiz
        items={paper.items.map((item) => {
          const n = reps.get(item.id) ?? 0;
          return { item, variant: reviewVariant(item, n), reps: n };
        })}
      />
    </main>
  );
}
