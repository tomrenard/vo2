import { COURSE_ORDER, moduleOf } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { BACKLOG, counts, lessonsDone, nextLesson, SESSION_SIZE } from "@/lib/study";
import { Go } from "./Nav";
import { TabBar } from "./TabBar";

export const dynamic = "force-dynamic";

/** Study: one button that does the right thing (reviews first, then the next lesson). */
export default async function StudyPage() {
  const userId = await requireUser();
  const [c, done] = await Promise.all([counts(userId), lessonsDone(userId)]);
  const lesson = nextLesson(done);
  const where = lesson ? moduleOf(lesson.module) : undefined;
  const reviews = Math.min(c.due, SESSION_SIZE);
  const catchUp = c.due > BACKLOG;

  return (
    <main className="screen with-tabs">
      <header className="flex items-baseline justify-between pt-2">
        <h1 className="font-serif text-3xl text-[var(--brand)]">
          V̇O<sub className="text-lg">2</sub>
        </h1>
        <span className="muted font-mono text-xs tabular-nums">{c.week} answers this week</span>
      </header>

      <section className="card flex flex-col gap-4">
        <p className="eyebrow">Today</p>
        {c.due > 0 ? (
          <>
            <p className="font-serif text-2xl leading-snug">
              {c.due} question{c.due === 1 ? "" : "s"} to review
            </p>
            {catchUp && (
              <p className="muted text-sm">
                That's a lot: review before starting new lessons, so it doesn't keep growing.
              </p>
            )}
            <Go href="/session" className="btn btn-primary">
              Review {reviews} now
            </Go>
          </>
        ) : (
          <p className="font-serif text-2xl leading-snug">No reviews waiting.</p>
        )}
        {lesson && (
          <Go
            href={`/lesson/${lesson.id}`}
            className={`btn ${c.due > 0 ? "" : "btn-primary"} flex-col items-start! gap-0.5 text-left`}
          >
            {/* On the red button the grey label was unreadable: white, a little faded. */}
            <span className={`eyebrow ${c.due > 0 ? "" : "text-white/75"}`}>
              {c.due > 0 ? "Then" : "Next lesson"} · {where?.module.title}
            </span>
            <span className="font-serif text-lg leading-snug">{lesson.title}</span>
          </Go>
        )}
        {!lesson && COURSE_ORDER.length > 0 && (
          <p className="muted text-sm">
            You've done every lesson written so far. New ones are on the way.
          </p>
        )}
      </section>

      {c.confidentMisses > 0 && (
        <section
          className="card flex flex-col gap-1 border-l-4"
          style={{ borderLeftColor: "var(--wrong)" }}
        >
          <p className="font-semibold">
            {c.confidentMisses} sure-but-wrong answer{c.confidentMisses === 1 ? "" : "s"}
          </p>
          <p className="muted text-sm">
            The mistakes most worth fixing. They come back first in your reviews.
          </p>
        </section>
      )}

      <Go href="/map" className="card flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <span className="eyebrow">Course</span>
          <span className="muted font-mono text-xs tabular-nums">
            {done.size}/{COURSE_ORDER.length}
          </span>
        </span>
        <span
          className="h-2 overflow-hidden rounded-full bg-[var(--line)]"
          role="progressbar"
          aria-label="Lessons done"
          aria-valuemin={0}
          aria-valuemax={COURSE_ORDER.length}
          aria-valuenow={done.size}
        >
          <span
            className="block h-full rounded-full bg-[var(--brand)]"
            style={{ width: `${(done.size / Math.max(1, COURSE_ORDER.length)) * 100}%` }}
          />
        </span>
        <span className="muted text-sm">
          {done.size} of {COURSE_ORDER.length} lessons done · {c.today} answers today
        </span>
      </Go>
      <TabBar active="/" />
    </main>
  );
}
