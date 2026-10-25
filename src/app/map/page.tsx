import { CURRICULUM } from "@/lib/content-index";
import { lessonById } from "@/lib/course";
import { bestExamScores, examScope, PASS } from "@/lib/exams";
import { requireUser } from "@/lib/session";
import { lessonsDone, recall } from "@/lib/study";
import { Go } from "../Nav";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

/**
 * The course as a map: tiers, then modules. Each module shows lessons done (the bar) and how much
 * of what you've learnt you'd recall now (mean FSRS retrievability of its started questions).
 */
export default async function MapPage() {
  const userId = await requireUser();
  const [done, recalls, exams] = await Promise.all([
    lessonsDone(userId),
    recall(userId),
    bestExamScores(userId),
  ]);

  // A tier exam opens once every lesson of the tier is written and done.
  const tierDone = (tierId: string) => {
    const scope = examScope(tierId);
    return !!scope?.complete && scope.lessons.every((l) => done.has(l.id));
  };

  return (
    <main className="screen with-tabs">
      <h1 className="pt-2 font-serif text-3xl">Map</h1>
      {CURRICULUM.map((tier) => (
        <section key={tier.id} className="flex flex-col gap-2">
          <p className="eyebrow">{tier.title}</p>
          <div className="card flex flex-col divide-y p-0 [&>*]:border-[var(--line)]">
            {tier.modules.map((module) => {
              const lessons = module.lessons.flatMap((id) => lessonById(id) ?? []);
              const items = lessons.flatMap((l) => l.items.map((i) => i.id));
              const started = items.flatMap((id) => recalls.get(id) ?? []);
              const mean = started.length
                ? Math.round((100 * started.reduce((a, b) => a + b, 0)) / started.length)
                : null;
              const doneCount = module.lessons.filter((id) => done.has(id)).length;
              const allDone = lessons.length > 0 && doneCount === module.lessons.length;
              const best = exams.get(module.id);
              const next = lessons.find((l) => !done.has(l.id));
              return (
                <details key={module.id} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <span aria-hidden="true" className="text-xl">
                      {module.icon}
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{module.title}</span>
                      <span className="muted text-xs">
                        {lessons.length
                          ? `${doneCount}/${module.lessons.length} lessons`
                          : "coming soon"}
                        {mean !== null && ` · you'd recall ${mean}% of it now`}
                      </span>
                    </span>
                    {doneCount > 0 && (
                      // Inside <summary> a progressbar isn't read out; the "N/M lessons" text says it.
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--line)]"
                      >
                        <span
                          className="block h-full bg-[var(--right)]"
                          style={{ width: `${(100 * doneCount) / module.lessons.length}%` }}
                        />
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="muted inline-block transition-transform group-open:rotate-90"
                    >
                      ›
                    </span>
                  </summary>
                  {lessons.length > 0 && (
                    <ol className="mt-3 flex flex-col gap-1">
                      {lessons.map((lesson, n) => {
                        const isDone = done.has(lesson.id);
                        const isNext = lesson === next;
                        const missing = lesson.requires.filter(
                          (r) => lessonById(r) && !done.has(r),
                        );
                        return (
                          <li key={lesson.id} className="flex items-center gap-2">
                            <Go
                              href={`/lesson/${lesson.id}`}
                              className={`flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 py-2 ${isNext ? "bg-[var(--line)]/40" : ""}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`grid size-8 shrink-0 place-items-center rounded-full border font-mono text-sm ${
                                  isDone
                                    ? "border-[var(--right)] bg-[var(--right)] text-white"
                                    : isNext
                                      ? "border-[var(--brand)] text-[var(--brand)]"
                                      : "muted border-[var(--line)]"
                                }`}
                              >
                                {isDone ? "✓" : n + 1}
                              </span>
                              <span className="flex flex-1 flex-col">
                                <span className="leading-snug font-medium">{lesson.title}</span>
                                <span className="muted text-xs">
                                  {isNext ? "Next · " : ""}
                                  {lesson.items.length} questions
                                  {missing.length > 0 &&
                                    ` · builds on ${missing.map((r) => lessonById(r)?.title).join(", ")}`}
                                </span>
                              </span>
                              <span aria-hidden="true" className="muted text-lg">
                                ›
                              </span>
                            </Go>
                            {isDone && (
                              <Go
                                href={`/lesson/${lesson.id}/read`}
                                className="muted rounded-lg border border-[var(--line)] px-3 py-2.5 text-xs"
                              >
                                Read
                              </Go>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {allDone && (
                    <Go
                      href={`/exam/${module.id}`}
                      className="btn mt-3 flex justify-between text-sm"
                    >
                      <span>Module exam</span>
                      <span className="muted font-mono">
                        {best === undefined ? `${PASS}% to pass` : `best ${best}%`}
                      </span>
                    </Go>
                  )}
                </details>
              );
            })}
          </div>
          {tierDone(tier.id) && (
            <Go href={`/exam/${tier.id}`} className="btn flex justify-between text-sm">
              <span>Tier exam: everything in this tier</span>
              <span className="muted font-mono">
                {exams.has(tier.id) ? `best ${exams.get(tier.id)}%` : `${PASS}% to pass`}
              </span>
            </Go>
          )}
        </section>
      ))}
      <TabBar active="/map" />
    </main>
  );
}
