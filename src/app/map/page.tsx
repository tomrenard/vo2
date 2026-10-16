import { CURRICULUM } from "@/lib/content-index";
import { lessonById } from "@/lib/course";
import { bestExamScores, PASS } from "@/lib/exams";
import { requireUser } from "@/lib/session";
import { lessonsDone, recall } from "@/lib/study";
import { Go } from "../Nav";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

/**
 * The course as a map: tiers, then modules. Each module shows lessons done and how much you'd
 * recall now (mean FSRS retrievability of its started questions), not just "done".
 */
export default async function MapPage() {
  const userId = await requireUser();
  const [done, recalls, exams] = await Promise.all([
    lessonsDone(userId),
    recall(userId),
    bestExamScores(userId),
  ]);

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
                        {mean !== null && ` · recall ${mean}%`}
                      </span>
                    </span>
                    {mean !== null && (
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--line)]">
                        <span
                          className="block h-full bg-[var(--right)]"
                          style={{ width: `${mean}%` }}
                        />
                      </span>
                    )}
                  </summary>
                  {lessons.length > 0 && (
                    <ol className="mt-3 flex flex-col gap-1 pl-9">
                      {module.lessons.map((id) => {
                        const lesson = lessonById(id);
                        if (!lesson) return null;
                        const missing = lesson.requires.filter(
                          (r) => lessonById(r) && !done.has(r),
                        );
                        return (
                          <li key={id} className="flex items-center gap-2 text-sm">
                            <span
                              aria-hidden="true"
                              className={done.has(id) ? "text-[var(--right)]" : "muted"}
                            >
                              {done.has(id) ? "✓" : "○"}
                            </span>
                            <Go href={`/lesson/${id}`} className="flex-1">
                              {lesson.title}
                              {missing.length > 0 && (
                                <span className="muted block text-xs">
                                  Builds on: {missing.map((r) => lessonById(r)?.title).join(", ")}
                                </span>
                              )}
                            </Go>
                            {done.has(id) && (
                              <Go href={`/lesson/${id}/read`} className="muted text-xs underline">
                                read
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
                      className="btn mt-3 ml-9 flex justify-between text-sm"
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
        </section>
      ))}
      <TabBar active="/map" />
    </main>
  );
}
