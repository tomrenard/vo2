"use server";

import { itemById, lessonById } from "@/lib/course";
import { freshPages } from "@/lib/fresh";
import { requireUser } from "@/lib/session";
import { type Answer, answer, finishLesson, flag } from "@/lib/study";

const CONTEXTS = new Set(["lesson", "pretest", "review", "exam"]);

export async function submitAnswer(a: Answer) {
  const userId = await requireUser();
  // Server actions are plain POSTs: check the shape before it reaches the database.
  const ok =
    typeof a.itemId === "string" &&
    typeof a.variantId === "string" &&
    typeof a.optionId === "string" &&
    typeof a.sure === "boolean" &&
    Number.isFinite(a.durationMs) &&
    Number.isInteger(a.seenReps) &&
    CONTEXTS.has(a.context);
  if (!ok) throw new Error("Bad answer");
  return answer(userId, a);
}

export async function lessonFinished(lessonId: string) {
  const userId = await requireUser();
  if (!lessonById(lessonId)) throw new Error(`Unknown lesson ${lessonId}`);
  await finishLesson(userId, lessonId);
  freshPages();
}

export async function flagQuestion(itemId: string, variantId: string, note: string) {
  const userId = await requireUser();
  const variant = itemById(String(itemId))?.item.variants.find((v) => v.id === variantId);
  if (!variant || typeof note !== "string" || !note.trim()) return;
  await flag(userId, itemId, variantId, note.trim());
}

/** After a review session: the tab pages show the new counts. */
export async function sessionFinished() {
  await requireUser();
  freshPages();
}
