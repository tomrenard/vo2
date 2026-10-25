import { CURRICULUM } from "@/lib/content-index";
import { itemById, lessonById } from "@/lib/course";
import { COURSE, COURSE_MIN, examScope, PASS } from "@/lib/exams";
import { requireUser } from "@/lib/session";
import { counts, LEECH, lessonsDone, progress, recall, WEEK_GOAL } from "@/lib/study";
import { Go } from "../Nav";
import { Ring } from "../ui/Ring";

export const dynamic = "force-dynamic";

/** Modules with fewer started questions than this aren't ranked as weak spots. */
const MIN_STARTED = 5;

const pct = (right: number, n: number) => (n ? Math.round((100 * right) / n) : 0);
/** A stem as plain text: links and emphasis markup dropped. */
const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
const day = (at: Date) => at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** A question's first wording, cut short, and where its concept is explained. */
function ItemLink({ itemId, extra }: { itemId: string; extra?: string }) {
  const found = itemById(itemId);
  const stem = plain(found?.item.variants[0]?.stem ?? itemId);
  return (
    <li>
      <Go href={found?.href ?? "/"} className="flex justify-between gap-3 py-2 text-sm">
        <span className="line-clamp-2">{stem}</span>
        {extra && <span className="muted shrink-0 font-mono text-xs">{extra}</span>}
      </Go>
    </li>
  );
}

/** Shown before the rest of a list folds away. */
const SHOWN = 5;

/** A list showing its first few rows; the rest open on tap. */
function Folded({ rows }: { rows: React.ReactNode[] }) {
  return (
    <>
      <ul className="flex flex-col divide-y divide-[var(--line)]">{rows.slice(0, SHOWN)}</ul>
      {rows.length > SHOWN && (
        <details>
          <summary className="muted cursor-pointer py-2 text-sm">
            {rows.length - SHOWN} more
          </summary>
          <ul className="flex flex-col divide-y divide-[var(--line)]">{rows.slice(SHOWN)}</ul>
        </details>
      )}
    </>
  );
}

/**
 * Progress: the week, how well "sure" matches being right, weak modules, the questions that
 * keep failing, exams and your flags.
 */
export default async function ProgressPage() {
  const userId = await requireUser();
  const [c, p, recalls, done] = await Promise.all([
    counts(userId),
    progress(userId),
    recall(userId),
    lessonsDone(userId),
  ]);
  const top = Math.max(1, ...p.weeks.map((w) => w.n));
  const weak = CURRICULUM.flatMap((tier) => tier.modules)
    .map((module) => {
      const ids = module.lessons.flatMap((l) => lessonById(l)?.items.map((i) => i.id) ?? []);
      const started = ids.flatMap((id) => recalls.get(id) ?? []);
      const mean = started.reduce((a, b) => a + b, 0) / Math.max(started.length, 1);
      return { module, started: started.length, mean };
    })
    .filter((m) => m.started >= MIN_STARTED)
    .sort((a, b) => a.mean - b.mean)
    .slice(0, 5);
  const lastCourse = p.exams.find((e) => e.ref === COURSE);

  return (
    <main className="screen">
      <header className="flex items-center gap-3 pt-2">
        <Go href="/" aria-label="Back to Study" className="muted -ml-1 p-1 text-2xl leading-none">
          ‹
        </Go>
        <h1 className="font-serif text-3xl">Progress</h1>
      </header>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Ring value={c.week} goal={WEEK_GOAL} size={44} />
          <p>
            <span className="font-serif text-2xl tabular-nums">{c.week}</span>
            <span className="muted"> of {WEEK_GOAL} answers this week</span>
          </p>
        </div>
        <p className="muted text-xs">The week starts on Monday. Missing a day costs nothing.</p>
        <div
          className="flex h-20 items-end gap-1"
          role="img"
          aria-label="Answers per week, last 12 weeks"
        >
          {p.weeks.map((w) => (
            <span
              key={w.week}
              title={`${w.week}: ${w.n}`}
              className="flex-1 rounded-t bg-[var(--brand)]"
              style={{ height: `${Math.max(2, (100 * w.n) / top)}%`, opacity: w.n ? 1 : 0.25 }}
            />
          ))}
        </div>
        <p className="muted flex justify-between font-mono text-xs">
          <span>11 weeks ago</span>
          <span>this week</span>
        </p>
      </section>

      <section className="card flex flex-col gap-3">
        <p className="eyebrow">How well you know what you know</p>
        {[
          { label: "When you said sure", ...p.sure },
          { label: "When you said not sure", ...p.unsure },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <span className="flex justify-between text-sm">
              <span>{row.label}</span>
              <span className="font-mono tabular-nums">
                {row.n ? `${pct(row.right, row.n)}% right` : "–"}
                <span className="muted"> · {row.n}</span>
              </span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
              <span
                className="block h-full rounded-full bg-[var(--brand)]"
                style={{ width: `${pct(row.right, row.n)}%` }}
              />
            </span>
          </div>
        ))}
        <p className="muted text-sm">
          Well calibrated: sure answers are almost always right, unsure ones much less often. If
          both are close, your "sure" isn't telling you much.
        </p>
      </section>

      {weak.length > 0 && (
        <section className="card flex flex-col gap-2">
          <p className="eyebrow">Weak spots</p>
          <ul className="flex flex-col">
            {weak.map(({ module, mean }) => (
              <li key={module.id}>
                <Go
                  href={`/session?module=${module.id}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm">
                    {module.icon} {module.title}
                  </span>
                  <span className="muted shrink-0 font-mono text-xs">
                    {Math.round(mean * 100)}% · review ›
                  </span>
                </Go>
              </li>
            ))}
          </ul>
          <p className="muted text-xs">
            % = how much of what you've learnt there you'd recall now, lowest first. Review asks
            that module only.
          </p>
        </section>
      )}

      {p.misses.length > 0 && (
        <section className="card flex flex-col gap-1">
          <p className="eyebrow">Sure but wrong, last 14 days</p>
          <Folded rows={p.misses.map((id) => <ItemLink key={id} itemId={id} />)} />
        </section>
      )}

      {p.leeches.length > 0 && (
        <section className="card flex flex-col gap-1">
          <p className="eyebrow">Keep missing ({LEECH}+ times)</p>
          <Folded
            rows={p.leeches.map((l) => (
              <ItemLink key={l.itemId} itemId={l.itemId} extra={`${l.lapses}×`} />
            ))}
          />
          <p className="muted text-xs">Tap one to reread its concept card.</p>
        </section>
      )}

      <section className="card flex flex-col gap-2">
        <p className="eyebrow">Exams</p>
        <Go href={`/exam/${COURSE}`} className="btn flex justify-between text-sm">
          <span>Course exam: 40 questions from everything you've done</span>
        </Go>
        <p className="muted text-xs">
          {done.size < COURSE_MIN
            ? `Opens after ${COURSE_MIN} lessons.`
            : lastCourse
              ? `Last taken ${day(lastCourse.at)} (${lastCourse.score}%). About once a month keeps old tiers fresh.`
              : "Not taken yet. About once a month keeps old tiers fresh."}
        </p>
        {p.exams.length > 0 && (
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {p.exams.map((e) => (
              <li
                key={`${e.ref}-${e.at.toISOString()}`}
                className="flex justify-between gap-3 py-2 text-sm"
              >
                <span>{examScope(e.ref)?.title ?? e.ref}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  <span style={{ color: (e.score ?? 0) >= PASS ? "var(--right)" : "var(--wrong)" }}>
                    {e.score}%
                  </span>
                  <span className="muted"> · {day(e.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.flagged.length > 0 && (
        <section className="card flex flex-col gap-1">
          <p className="eyebrow">Your flags</p>
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {p.flagged.map((f) => (
              <li
                key={`${f.itemId}-${f.at.toISOString()}`}
                className="flex flex-col gap-0.5 py-2 text-sm"
              >
                <span className="line-clamp-1">
                  {plain(itemById(f.itemId)?.item.variants[0]?.stem ?? f.itemId)}
                </span>
                <span className="muted">
                  “{f.note}” · {day(f.at)}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted text-xs">Read and fixed before each new batch of lessons.</p>
        </section>
      )}
    </main>
  );
}
