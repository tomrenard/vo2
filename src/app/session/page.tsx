import { itemById, lessonById, moduleOf, reviewVariant } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { dueItems, LEECH, lessonsDone, nextLesson } from "@/lib/study";
import { Session } from "./Session";

export const dynamic = "force-dynamic";

/**
 * A review session: due questions from every module, mixed, each in a new wording. With
 * `?module=`: that module's questions you've started, least likely recalled first (weak spots).
 */
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string | string[] }>;
}) {
  const userId = await requireUser();
  const moduleId = (await searchParams).module;
  const module = typeof moduleId === "string" ? moduleOf(moduleId)?.module : undefined;
  const only = module?.lessons.flatMap((id) => lessonById(id)?.items.map((i) => i.id) ?? []);
  const [due, done] = await Promise.all([dueItems(userId, only), lessonsDone(userId)]);
  const queue = due.flatMap(({ itemId, reps, lapses }) => {
    const found = itemById(itemId);
    if (!found) return [];
    return [
      {
        item: found.item,
        href: found.href,
        reps,
        variantId: reviewVariant(found.item, reps).id,
        // This miss would make it a leech, or it already is one.
        leech: lapses >= LEECH - 1,
      },
    ];
  });
  const lesson = nextLesson(done);
  return <Session queue={queue} next={lesson ? { id: lesson.id, title: lesson.title } : null} />;
}
