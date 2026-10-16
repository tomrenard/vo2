import { requireUser } from "@/lib/session";
import { TabBar } from "../TabBar";

/** Papers of the week: added by the weekly routine (summary, design, limits, questions). */
export default async function PapersPage() {
  await requireUser();
  return (
    <main className="screen with-tabs">
      <h1 className="pt-2 font-serif text-3xl">Papers</h1>
      <div className="card flex flex-col gap-2">
        <p className="font-semibold">The first papers arrive with the weekly routine.</p>
        <p className="muted text-sm">
          Each week 1–3 new studies: what they did, who they studied, what they found, what limits
          them, its evidence grade, and the lessons it touches. Then a few questions.
        </p>
      </div>
      <TabBar active="/papers" />
    </main>
  );
}
