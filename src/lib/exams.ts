import { and, eq, max } from "drizzle-orm";
import { db } from "../db/client.ts";
import { activityLogs } from "../db/schema.ts";
import { CURRICULUM } from "./content-index.ts";
import { COURSE_ORDER, lessonById, moduleOf } from "./course.ts";
import { shuffled } from "./shuffle.ts";

/** Percent needed to pass. */
export const PASS = 70;

/** The course exam's id: everything you've done so far, one group per tier. */
export const COURSE = "course";

/** Lessons done before the course exam opens. */
export const COURSE_MIN = 10;

/**
 * What an exam covers: a module (15 questions), a whole tier (30, cumulative: every module of
 * the tier) or the course (40, every tier; the exam page keeps only lessons you've done).
 * `complete` is false while some of its lessons aren't written yet.
 */
export function examScope(id: string) {
  if (id === COURSE) {
    return {
      kind: "Course" as const,
      title: "Everything so far",
      lessons: COURSE_ORDER,
      groups: CURRICULUM.map((tier) =>
        COURSE_ORDER.filter((l) => moduleOf(l.module)?.tier.id === tier.id).flatMap((lesson) =>
          lesson.items.map((item) => ({ item, lessonId: lesson.id })),
        ),
      ),
      size: 40,
      complete: true,
    };
  }
  const tier = CURRICULUM.find((t) => t.id === id);
  const module = moduleOf(id)?.module;
  const modules = tier?.modules ?? (module ? [module] : []);
  if (!modules.length) return undefined;
  const ids = modules.flatMap((m) => m.lessons);
  const lessons = ids.flatMap((l) => lessonById(l) ?? []);
  return {
    kind: tier ? ("Tier" as const) : ("Module" as const),
    title: tier?.title ?? modules[0]?.title ?? id,
    lessons,
    /** One group of questions per module (a module exam has one), for an even draw. */
    groups: modules.map((m) =>
      m.lessons.flatMap((id) => {
        const lesson = lessonById(id);
        return lesson ? lesson.items.map((item) => ({ item, lessonId: id })) : [];
      }),
    ),
    size: tier ? 30 : 15,
    complete: lessons.length > 0 && lessons.length === ids.length,
  };
}

/** Best score per exam taken, by module or tier id. */
export async function bestExamScores(userId: string) {
  const rows = await db()
    .select({ ref: activityLogs.ref, best: max(activityLogs.score) })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.kind, "exam")))
    .groupBy(activityLogs.ref);
  return new Map(rows.map((row) => [row.ref, row.best ?? 0]));
}

export async function saveExam(userId: string, scopeId: string, score: number) {
  await db()
    .insert(activityLogs)
    .values({ userId, kind: "exam", ref: scopeId, score: Math.round(score) });
}

/**
 * Up to `size` picks, taken round-robin over shuffled groups (in shuffled order), so a tier exam
 * asks about every module instead of letting a big module crowd out a small one; then shuffled,
 * so the order doesn't tell which module comes next.
 */
export function drawEvenly<T>(groups: T[][], size: number, random: () => number = Math.random) {
  const pools = shuffled(groups, random).map((group) => shuffled(group, random));
  const rounds = Math.max(0, ...pools.map((pool) => pool.length));
  const picked: T[] = [];
  for (let r = 0; r < rounds; r++) {
    for (const pool of pools) if (r < pool.length) picked.push(pool[r] as T);
  }
  return shuffled(picked.slice(0, size), random);
}
