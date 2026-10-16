import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemStates } from "@/db/schema";
import { testDb } from "@/test/db";
import { answer, counts, dueItems } from "./study";

vi.mock("./content-index", () => {
  const options = [
    { id: "a", text: "right", correct: true, why: "" },
    { id: "b", text: "wrong", why: "" },
    { id: "c", text: "wrong too", why: "" },
  ];
  const item = {
    id: "q1",
    concept: "c1",
    bloom: "apply",
    sources: ["s"],
    variants: [
      { id: "v1", stem: "?", options },
      { id: "v2", stem: "??", options },
    ],
  };
  return {
    CURRICULUM: [
      { id: "t", title: "", modules: [{ id: "m", title: "", icon: "", lessons: ["l1"] }] },
    ],
    LESSONS: [
      {
        id: "l1",
        module: "m",
        title: "",
        goal: "",
        requires: [],
        lastReviewed: "",
        steps: [],
        items: [item],
      },
    ],
    PAPERS: [{ id: "2026-01-01-p", items: [{ ...item, id: "p1", concept: "2026-01-01-p" }] }],
    HASHES: { q1: "h1", p1: "h2" },
  };
});

const base = { itemId: "q1", variantId: "v1", durationMs: 3000, seenReps: 0 } as const;

describe("answer", () => {
  let db: Awaited<ReturnType<typeof testDb>>;
  beforeEach(async () => {
    db = await testDb();
  });

  it("decides correctness from the content and schedules a lesson answer", async () => {
    expect(await answer("u1", { ...base, optionId: "b", sure: true, context: "lesson" })).toEqual({
      correct: false,
    });
    const [state] = await db.select().from(itemStates);
    // Missed: back in 10 minutes, so it is in the next session.
    expect(state?.due.getTime()).toBeLessThan(Date.now() + 11 * 60_000);
    expect((await dueItems("u1")).map((d) => d.itemId)).toEqual(["q1"]);
    expect((await counts("u1")).confidentMisses).toBe(1);
  });

  it("drops a repeated submit", async () => {
    await answer("u1", { ...base, optionId: "a", sure: true, context: "lesson" });
    await answer("u1", { ...base, optionId: "a", sure: true, context: "lesson" });
    const [state] = await db.select().from(itemStates);
    expect(state?.fsrs.reps).toBe(1);
  });

  it("doesn't schedule pretest answers, and a sure right answer is done for the day", async () => {
    await answer("u1", { ...base, optionId: "b", sure: false, context: "pretest" });
    expect(await db.select().from(itemStates)).toEqual([]);
    await answer("u1", { ...base, optionId: "a", sure: true, context: "lesson" });
    expect(await dueItems("u1")).toEqual([]);
    expect((await counts("u1")).confidentMisses).toBe(0);
  });

  it("logs exam answers without scheduling, and brings a missed one back now", async () => {
    await answer("u1", { ...base, optionId: "a", sure: true, context: "lesson" });
    expect(await dueItems("u1")).toEqual([]);
    await answer("u1", {
      ...base,
      variantId: "v2",
      optionId: "b",
      sure: true,
      context: "exam",
      seenReps: 1,
    });
    const [state] = await db.select().from(itemStates);
    expect(state?.fsrs.reps).toBe(1);
    expect((await dueItems("u1")).map((d) => d.itemId)).toEqual(["q1"]);
  });

  it("ignores questions retired from the content", async () => {
    await db.insert(itemStates).values({
      userId: "u1",
      itemId: "retired",
      fsrs: {
        due: new Date(),
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        last_review: new Date(),
      },
      due: new Date(Date.now() - 60_000),
    });
    expect(await dueItems("u1")).toEqual([]);
    expect((await counts("u1")).due).toBe(0);
  });

  it("schedules a paper's questions like a lesson's", async () => {
    await answer("u1", { ...base, itemId: "p1", optionId: "b", sure: false, context: "lesson" });
    expect((await dueItems("u1")).map((d) => d.itemId)).toEqual(["p1"]);
  });

  it("rejects an option that doesn't exist", async () => {
    await expect(
      answer("u1", { ...base, optionId: "d", sure: true, context: "lesson" }),
    ).rejects.toThrow();
  });
});
