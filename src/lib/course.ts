import type { Item, Lesson } from "./content";
import { CURRICULUM, HASHES, LESSONS } from "./content-index";

const byId = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
const itemIndex = new Map(
  LESSONS.flatMap((lesson) => lesson.items.map((item) => [item.id, { item, lesson }] as const)),
);

export const lessonById = (id: string): Lesson | undefined => byId.get(id);
export const itemById = (id: string) => itemIndex.get(id);
export const hashOf = (itemId: string) => HASHES[itemId] ?? "";

/** Written lessons in course order (curriculum order, unwritten ones skipped). */
export const COURSE_ORDER: Lesson[] = CURRICULUM.flatMap((tier) =>
  tier.modules.flatMap((module) => module.lessons.flatMap((id) => byId.get(id) ?? [])),
);

export function moduleOf(moduleId: string) {
  for (const tier of CURRICULUM) {
    const module = tier.modules.find((m) => m.id === moduleId);
    if (module) return { tier, module };
  }
  return undefined;
}

/**
 * The variant shown at a review: a different one each time (by review count), so a review asks
 * the idea again instead of the remembered wording.
 */
export const reviewVariant = (item: Item, reps: number) =>
  // Every item has at least one variant (content.ts).
  item.variants[reps % item.variants.length] as Item["variants"][number];

/** wrong → Again, right but guessed → Hard, right and sure → Good. No Easy: speed is too noisy. */
export const ratingFor = (correct: boolean, sure: boolean): 1 | 2 | 3 =>
  !correct ? 1 : sure ? 3 : 2;
