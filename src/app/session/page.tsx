import { itemById, reviewVariant } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { dueItems, lessonsDone, nextLesson } from "@/lib/study";
import { Session } from "./Session";

export const dynamic = "force-dynamic";

/** A review session: due questions from every module, mixed, each in a new wording. */
export default async function SessionPage() {
  const userId = await requireUser();
  const [due, done] = await Promise.all([dueItems(userId), lessonsDone(userId)]);
  const queue = due.flatMap(({ itemId, reps }) => {
    const found = itemById(itemId);
    if (!found) return [];
    return [
      {
        item: found.item,
        lessonId: found.lesson.id,
        reps,
        variantId: reviewVariant(found.item, reps).id,
      },
    ];
  });
  const lesson = nextLesson(done);
  return <Session queue={queue} next={lesson ? { id: lesson.id, title: lesson.title } : null} />;
}
