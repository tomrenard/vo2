import { and, eq, max } from "drizzle-orm";
import { db } from "../db/client.ts";
import { activityLogs } from "../db/schema.ts";
import { lessonById, moduleOf } from "./course.ts";

/** Questions in a module exam, at most; fewer when the module has fewer. */
export const EXAM_SIZE = 15;
/** Percent needed to pass. */
export const PASS = 70;

/** A module's written lessons, and whether every lesson it lists is written. */
export function moduleLessons(moduleId: string) {
  const module = moduleOf(moduleId)?.module;
  const lessons = module?.lessons.flatMap((id) => lessonById(id) ?? []) ?? [];
  return { module, lessons, complete: !!module && lessons.length === module.lessons.length };
}

/** Best score per module exam taken, by module id. */
export async function bestExamScores(userId: string) {
  const rows = await db()
    .select({ ref: activityLogs.ref, best: max(activityLogs.score) })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.kind, "exam")))
    .groupBy(activityLogs.ref);
  return new Map(rows.map((row) => [row.ref, row.best ?? 0]));
}

export async function saveExam(userId: string, moduleId: string, score: number) {
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "exam", ref: moduleId, score: Math.round(score) });
}
