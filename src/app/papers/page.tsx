import { CURRICULUM, PAPERS } from "@/lib/content-index";
import { SOURCES } from "@/lib/refs-index";
import { requireUser } from "@/lib/session";
import { repsOf } from "@/lib/study";
import { TabBar } from "../TabBar";
import { PaperList } from "./PaperList";

/** Tier title of a lesson or module id. */
const tierOf = (topic: string) =>
  CURRICULUM.filter((t) => t.modules.some((m) => m.id === topic || m.lessons.includes(topic))).map(
    (t) => t.title,
  );

export const dynamic = "force-dynamic";

/** Papers of the week, newest first; "new" until you've answered its questions. */
export default async function PapersPage() {
  const userId = await requireUser();
  const reps = await repsOf(
    userId,
    PAPERS.flatMap((p) => p.items.map((i) => i.id)),
  );
  const papers = PAPERS.map((paper) => ({
    id: paper.id,
    headline: paper.headline,
    grade: paper.grade,
    source: SOURCES[paper.source],
    fresh: paper.items.some((i) => !reps.has(i.id)),
    tiers: [...new Set(paper.topics.flatMap(tierOf))],
  }));
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
        <PaperList
          papers={papers}
          tiers={CURRICULUM.map((t) => t.title).filter((t) =>
            papers.some((p) => p.tiers.includes(t)),
          )}
        />
      )}
      <TabBar active="/papers" />
    </main>
  );
}
