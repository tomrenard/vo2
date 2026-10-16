import { PAPERS } from "@/lib/content-index";
import { SOURCES } from "@/lib/refs-index";
import { requireUser } from "@/lib/session";
import { repsOf } from "@/lib/study";
import { Go } from "../Nav";
import { TabBar } from "../TabBar";
import { cite, GradeMark } from "../ui/Evidence";

export const dynamic = "force-dynamic";

/** Papers of the week, newest first; "new" until you've answered its questions. */
export default async function PapersPage() {
  const userId = await requireUser();
  const reps = await repsOf(
    userId,
    PAPERS.flatMap((p) => p.items.map((i) => i.id)),
  );
  return (
    <main className="screen with-tabs">
      <h1 className="pt-2 font-serif text-3xl">Papers</h1>
      {PAPERS.length === 0 ? (
        <div className="card flex flex-col gap-2">
          <p className="font-semibold">The first papers arrive with the weekly routine.</p>
          <p className="muted text-sm">
            Each week 1–3 new studies: what they did, who they studied, what they found, what limits
            them, and the lessons they touch. Then a few questions.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {PAPERS.map((paper) => {
            const source = SOURCES[paper.source];
            const fresh = paper.items.some((i) => !reps.has(i.id));
            return (
              <li key={paper.id}>
                <Go href={`/papers/${paper.id}`} className="card flex flex-col gap-1.5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="eyebrow">{paper.id.slice(0, 10)}</span>
                    {fresh && (
                      <span className="text-xs font-semibold text-[var(--brand)]">new</span>
                    )}
                  </span>
                  <span className="font-serif text-xl leading-snug">{paper.headline}</span>
                  <span className="muted flex flex-wrap items-center gap-x-2 text-sm">
                    {source && cite(source)}
                    <GradeMark grade={paper.grade} />
                    {source?.type === "preprint" && <span>· preprint</span>}
                  </span>
                </Go>
              </li>
            );
          })}
        </ul>
      )}
      <TabBar active="/papers" />
    </main>
  );
}
