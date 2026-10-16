import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { createEmptyCard, fsrs, type Grade, TypeConvert } from "ts-fsrs";
import { db } from "../db/client.ts";
import { activityLogs, answers, flags, itemStates } from "../db/schema.ts";
import { COURSE_ORDER, hashOf, itemById, ratingFor } from "./course.ts";

/** A missed question comes back once 10 minutes later; a right one is done for the day. */
const scheduler = fsrs({ enable_fuzz: true, learning_steps: ["10m"], relearning_steps: ["10m"] });

/** Questions due within this window are asked now, so a session ends in one go. */
const LEARN_AHEAD = sql`now() + interval '20 minutes'`;

/** A study session: this many reviews at most, then a lesson if one is waiting. */
export const SESSION_SIZE = 15;

/** More reviews waiting than this: Study suggests catching up before a new lesson. */
export const BACKLOG = 100;

/** The study day starts at 4:00 Berlin time. */
const DAY_START = sql`((date_trunc('day', (now() at time zone 'Europe/Berlin') - interval '4 hours') + interval '4 hours') at time zone 'Europe/Berlin')`;

export type Context = "lesson" | "pretest" | "review" | "exam";
export type Answer = {
  itemId: string;
  variantId: string;
  optionId: string;
  sure: boolean;
  durationMs: number;
  context: Context;
  /** The review count the screen was shown; a repeated submit no longer matches and is dropped. */
  seenReps: number;
};

/**
 * Records one answer and, for lesson and review answers, schedules the question. Correctness is
 * decided here from the content, never trusted from the client. Returns whether it was right.
 */
export async function answer(userId: string, a: Answer) {
  const found = itemById(a.itemId);
  const variant = found?.item.variants.find((v) => v.id === a.variantId);
  const option = variant?.options.find((o) => o.id === a.optionId);
  if (!found || !option) throw new Error(`Unknown answer ${a.itemId}/${a.variantId}/${a.optionId}`);
  const correct = option.correct === true;
  const scored = a.context === "lesson" || a.context === "review";
  const rating = ratingFor(correct, a.sure);
  const durationMs = Math.min(Math.max(Math.round(a.durationMs), 0), 10 * 60_000);

  await db().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(itemStates)
      .where(and(eq(itemStates.userId, userId), eq(itemStates.itemId, a.itemId)))
      .for("update");
    const before = row ? TypeConvert.card(row.fsrs) : createEmptyCard();
    if (scored && before.reps !== a.seenReps) return;
    const log = {
      userId,
      itemId: a.itemId,
      variantId: a.variantId,
      optionId: a.optionId,
      correct,
      sure: a.sure,
      hash: hashOf(a.itemId),
      context: a.context,
      durationMs,
    };
    if (!scored) {
      await tx.insert(answers).values({ ...log, rating: null, state: row ? before.state : null });
      // A question missed in an exam comes up in the next session.
      if (a.context === "exam" && !correct && row) {
        await tx
          .update(itemStates)
          .set({ due: new Date() })
          .where(and(eq(itemStates.userId, userId), eq(itemStates.itemId, a.itemId)));
      }
      return;
    }
    const now = new Date();
    const { card } = scheduler.next(before, now, rating as Grade);
    await tx
      .insert(itemStates)
      .values({ userId, itemId: a.itemId, fsrs: card, due: card.due, introducedAt: now })
      .onConflictDoUpdate({
        target: [itemStates.userId, itemStates.itemId],
        set: { fsrs: card, due: card.due },
      });
    await tx.insert(answers).values({ ...log, rating, state: before.state });
  });
  return { correct };
}

/** The item's latest scored answer was wrong while sure. */
const CONFIDENT_MISS = sql`coalesce((select not a.correct and a.sure from answers a
  where a.user_id = ${itemStates.userId} and a.item_id = ${itemStates.itemId} and a.context <> 'pretest'
  order by a.id desc limit 1), false)`;

/**
 * Questions to review now: confident misses first, then the rest in random order, so modules
 * mix (interleaving).
 */
export async function dueItems(userId: string, limit = SESSION_SIZE) {
  const rows = await db()
    .select({ itemId: itemStates.itemId, reps: sql<number>`(${itemStates.fsrs}->>'reps')::int` })
    .from(itemStates)
    .where(and(eq(itemStates.userId, userId), lte(itemStates.due, LEARN_AHEAD)))
    .orderBy(sql`${CONFIDENT_MISS} desc`, sql`random()`)
    .limit(limit);
  // Questions removed from the content can't be asked any more.
  return rows.filter((row) => itemById(row.itemId));
}

/** Lessons finished, as a set of lesson ids. */
export async function lessonsDone(userId: string) {
  const rows = await db()
    .selectDistinct({ ref: activityLogs.ref })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.kind, "lesson")));
  return new Set(rows.map((row) => row.ref));
}

export async function finishLesson(userId: string, lessonId: string) {
  await db().insert(activityLogs).values({ userId, kind: "lesson", ref: lessonId });
}

/** The first lesson in course order not finished yet. */
export const nextLesson = (done: Set<string>) =>
  COURSE_ORDER.find((lesson) => !done.has(lesson.id));

/**
 * `due`: questions to review now. `confidentMisses`: answered wrong while sure in the last 14
 * days and not yet answered right since: the mistakes most worth fixing. `today`: answers today.
 */
export async function counts(userId: string) {
  const result = await db().execute(sql`
    select
      (select count(*) from item_states where user_id = ${userId} and due <= ${LEARN_AHEAD})::int as due,
      (select count(*) from answers where user_id = ${userId} and at >= ${DAY_START})::int as today,
      (select count(*) from answers where user_id = ${userId} and at >= now() - interval '7 days')::int as week,
      (select count(*) from (
        select distinct on (item_id) item_id, correct, sure from answers
        where user_id = ${userId} and at >= now() - interval '14 days' and context <> 'pretest'
        order by item_id, at desc
      ) last where not correct and sure)::int as "confidentMisses"`);
  // postgres.js returns the rows, PGlite (tests) { rows }.
  const [row] = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as {
    due: number;
    today: number;
    week: number;
    confidentMisses: number;
  }[];
  return row ?? { due: 0, today: 0, week: 0, confidentMisses: 0 };
}

/**
 * Per item: how likely you are to recall it now (FSRS retrievability, 0–1). Items never
 * answered are missing.
 */
export async function recall(userId: string, itemIds?: string[]) {
  const rows = await db()
    .select({ itemId: itemStates.itemId, fsrs: itemStates.fsrs })
    .from(itemStates)
    .where(
      itemIds
        ? and(eq(itemStates.userId, userId), inArray(itemStates.itemId, itemIds))
        : eq(itemStates.userId, userId),
    );
  const now = new Date();
  return new Map(
    rows.map((row) => [
      row.itemId,
      scheduler.get_retrievability(TypeConvert.card(row.fsrs), now, false) as number,
    ]),
  );
}

/** The review count of each item (picks the variant to show). */
export async function repsOf(userId: string, itemIds: string[]) {
  if (!itemIds.length) return new Map<string, number>();
  const rows = await db()
    .select({ itemId: itemStates.itemId, reps: sql<number>`(${itemStates.fsrs}->>'reps')::int` })
    .from(itemStates)
    .where(and(eq(itemStates.userId, userId), inArray(itemStates.itemId, itemIds)));
  return new Map(rows.map((row) => [row.itemId, row.reps]));
}

export async function flag(userId: string, itemId: string, variantId: string, note: string) {
  await db()
    .insert(flags)
    .values({ userId, itemId, variantId, note: note.slice(0, 1000) });
}
