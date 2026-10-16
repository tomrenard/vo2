import { notFound } from "next/navigation";
import { lessonById, moduleOf } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { Diagram } from "../../../diagrams/Diagram";
import { Go } from "../../../Nav";
import { Prose } from "../../../ui/Prose";
import { Debate } from "../Player";

/** A lesson's concept cards and worked examples as one article: for reading again. */
export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const lesson = lessonById((await params).id);
  if (!lesson) notFound();
  const where = moduleOf(lesson.module);
  return (
    <main className="screen gap-8">
      <Go href="/map" className="muted text-sm">
        ← {where?.module.title ?? "Map"}
      </Go>
      <header className="flex flex-col gap-2">
        <p className="eyebrow">{where?.tier.title}</p>
        <h1 className="font-serif text-4xl leading-tight">{lesson.title}</h1>
        <p className="prose-text muted">{lesson.goal}</p>
      </header>
      {lesson.steps.map((step) =>
        step.type === "concept" ? (
          <section key={step.id} id={step.id} className="flex scroll-mt-4 flex-col gap-3">
            <h2 className="font-serif text-2xl">{step.title}</h2>
            <Prose text={step.text} claims={step.claims} prefix={step.id} />
            {step.diagram && <Diagram spec={step.diagram} />}
            {step.debate && <Debate debate={step.debate} />}
          </section>
        ) : step.type === "example" ? (
          <section key={step.id} id={step.id} className="card flex flex-col gap-3">
            <p className="eyebrow">Worked example</p>
            <h2 className="font-serif text-xl">{step.title}</h2>
            <Prose text={step.problem} prefix={`${step.id}-p`} />
            <ol className="flex list-decimal flex-col gap-2 pl-5 font-mono text-sm">
              {step.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        ) : null,
      )}
      <p className="muted text-xs">Content last reviewed {lesson.lastReviewed}.</p>
      <Go href={`/lesson/${lesson.id}`} className="btn">
        Do the lesson
      </Go>
    </main>
  );
}
