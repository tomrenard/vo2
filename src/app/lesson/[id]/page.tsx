import { notFound } from "next/navigation";
import { lessonById } from "@/lib/course";
import { requireUser } from "@/lib/session";
import { repsOf } from "@/lib/study";
import { Player } from "./Player";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUser();
  const lesson = lessonById((await params).id);
  if (!lesson) notFound();
  const reps = await repsOf(
    userId,
    lesson.items.map((item) => item.id),
  );
  return <Player lesson={lesson} reps={Object.fromEntries(reps)} />;
}
