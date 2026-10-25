import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { createEmptyCard, fsrs, type Grade, TypeConvert } from "ts-fsrs";
import { db } from "../db/client.ts";
import { activityLogs, answers, flags, itemStates } from "../db/schema.ts";
import { COURSE_ORDER, hashOf, ITEM_IDS, itemById, ratingFor } from "./course.ts";

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

/** This study week's Monday, Berlin local time (the week starts on Monday at 4:00). */
const WEEK = sql`date_trunc('week', (now() at time zone 'Europe/Berlin') - interval '4 hours')`;
const WEEK_START = sql`((${WEEK} + interval '4 hours') at time zone 'Europe/Berlin')`;

/** Answers a week to fill the ring on Study. */
export const WEEK_GOAL = 150;

/** New questions started today past this: Study suggests stopping, so next week's reviews stay manageable. */
export const NEW_PER_DAY = 40;

export type Context = "lesson" | "review" | "exam";
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

/** Questions still in the content: retired ones keep their state but are never asked or counted. */
const CURRENT = inArray(itemStates.itemId, ITEM_IDS);

/** The item's latest scored answer was wrong while sure. */
const CONFIDENT_MISS = sql`coalesce((select not a.correct and a.sure from answers a
  where a.user_id = ${itemStates.userId} and a.item_id = ${itemStates.itemId} and a.context <> 'pretest'
  order by a.id desc limit 1), false)`;

/**
 * Questions to review now: confident misses first, then the rest in random order, so modules
 * mix (interleaving). With `only` (a module's questions): those already started, due or not,
 * the ones due soonest (least likely recalled) first.
 */
export async function dueItems(userId: string, only?: string[]) {
  if (only && !only.length) return [];
  const rows = await db()
    .select({
      itemId: itemStates.itemId,
      reps: sql<number>`(${itemStates.fsrs}->>'reps')::int`,
      lapses: sql<number>`(${itemStates.fsrs}->>'lapses')::int`,
    })
    .from(itemStates)
    .where(
      and(
        eq(itemStates.userId, userId),
        only ? inArray(itemStates.itemId, only) : lte(itemStates.due, LEARN_AHEAD),
        CURRENT,
      ),
    )
    .orderBy(...(only ? [itemStates.due] : [sql`${CONFIDENT_MISS} desc`, sql`random()`]))
    .limit(SESSION_SIZE);
  return rows;
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
 * Questions whose latest answer in the last 14 days was wrong while sure (`item_id`, `at`): the
 * mistakes most worth fixing. Study counts them, Progress lists them.
 */
const sureMisses = (userId: string) => sql`(
  select item_id, at from (
    select distinct on (item_id) item_id, correct, sure, at from answers
    where user_id = ${userId} and at >= now() - interval '14 days' and context <> 'pretest' and item_id in ${ITEM_IDS}
    order by item_id, at desc
  ) latest where not correct and sure
) misses`;

/**
 * `due`: questions to review now. `confidentMisses`: answered wrong while sure in the last 14
 * days and not yet answered right since: the mistakes most worth fixing. `today`: answers today.
 * `week`: answers since Monday. `newToday`: questions started today. `next7`: due later this week (not yet due now).
 */
export async function counts(userId: string) {
  const result = await db().execute(sql`
    select
      (select count(*) from item_states where user_id = ${userId} and due <= ${LEARN_AHEAD} and ${CURRENT})::int as due,
      (select count(*) from answers where user_id = ${userId} and at >= ${DAY_START})::int as today,
      (select count(*) from answers where user_id = ${userId} and at >= ${WEEK_START})::int as week,
      (select count(*) from item_states where user_id = ${userId} and introduced_at >= ${DAY_START})::int as "newToday",
      (select count(*) from item_states where user_id = ${userId} and due > ${LEARN_AHEAD} and due <= now() + interval '7 days' and ${CURRENT})::int as next7,
      (select count(*) from ${sureMisses(userId)})::int as "confidentMisses"`);
  const [row] = rowsOf<{
    due: number;
    today: number;
    week: number;
    newToday: number;
    next7: number;
    confidentMisses: number;
  }>(result);
  return row ?? { due: 0, today: 0, week: 0, newToday: 0, next7: 0, confidentMisses: 0 };
}

/** postgres.js returns the rows, PGlite (tests) { rows }. */
const rowsOf = <T>(result: unknown) =>
  (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as T[];

/** Missed this many times after learning it: repeating isn't working, reread the concept. */
export const LEECH = 4;

/** For the Progress page: how sure-ness matches being right, weekly answers, what keeps failing. */
export async function progress(userId: string) {
  const [calibration, weeks, misses, leeches, exams, flagged] = await Promise.all([
    db().execute(sql`
      select sure, count(*)::int as n, (count(*) filter (where correct))::int as "right"
      from answers where user_id = ${userId} and context in ('lesson', 'review')
      group by sure`),
    db().execute(sql`
      select w.week::date::text as week, count(a.id)::int as n
      from generate_series(${WEEK} - interval '11 weeks', ${WEEK}, interval '1 week') w(week)
      left join answers a on a.user_id = ${userId}
        and a.at >= ((${WEEK} - interval '11 weeks' + interval '4 hours') at time zone 'Europe/Berlin')
        and date_trunc('week', (a.at at time zone 'Europe/Berlin') - interval '4 hours') = w.week
      group by w.week order by w.week`),
    db().execute(sql`
      select item_id as "itemId" from ${sureMisses(userId)} order by at desc limit 20`),
    db()
      .select({
        itemId: itemStates.itemId,
        lapses: sql<number>`(${itemStates.fsrs}->>'lapses')::int`,
      })
      .from(itemStates)
      .where(
        and(
          eq(itemStates.userId, userId),
          CURRENT,
          sql`(${itemStates.fsrs}->>'lapses')::int >= ${LEECH}`,
        ),
      )
      .orderBy(sql`(${itemStates.fsrs}->>'lapses')::int desc`)
      .limit(20),
    db()
      .select({ ref: activityLogs.ref, score: activityLogs.score, at: activityLogs.at })
      .from(activityLogs)
      .where(and(eq(activityLogs.userId, userId), eq(activityLogs.kind, "exam")))
      .orderBy(desc(activityLogs.at))
      .limit(20),
    db()
      .select({ itemId: flags.itemId, note: flags.note, at: flags.at })
      .from(flags)
      .where(eq(flags.userId, userId))
      .orderBy(desc(flags.at))
      .limit(20),
  ]);
  const cal = rowsOf<{ sure: boolean; n: number; right: number }>(calibration);
  return {
    sure: cal.find((c) => c.sure) ?? { n: 0, right: 0 },
    unsure: cal.find((c) => !c.sure) ?? { n: 0, right: 0 },
    weeks: rowsOf<{ week: string; n: number }>(weeks),
    misses: rowsOf<{ itemId: string }>(misses).map((m) => m.itemId),
    leeches,
    exams,
    flagged,
  };
}

/**
 * Per item: how likely you are to recall it now (FSRS retrievability, 0–1). Items never
 * answered are missing.
 */
export async function recall(userId: string) {
  const rows = await db()
    .select({ itemId: itemStates.itemId, fsrs: itemStates.fsrs })
    .from(itemStates)
    .where(eq(itemStates.userId, userId));
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
