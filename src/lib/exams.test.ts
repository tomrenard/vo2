import { expect, it, vi } from "vitest";
import { drawEvenly, examScope } from "./exams";

vi.mock("./content-index", () => {
  const lesson = (id: string, module: string) => ({ id, module, items: [], steps: [] });
  return {
    CURRICULUM: [
      {
        id: "t1",
        title: "Tier one",
        modules: [
          { id: "t1-a", title: "A", icon: "", lessons: ["a1", "a2"] },
          { id: "t1-b", title: "B", icon: "", lessons: ["b1", "b2"] },
        ],
      },
    ],
    LESSONS: [lesson("a1", "t1-a"), lesson("a2", "t1-a"), lesson("b1", "t1-b")],
    PAPERS: [],
    HASHES: {},
  };
});

it("scopes a module exam to its lessons", () => {
  expect(examScope("t1-a")).toMatchObject({ kind: "Module", title: "A", size: 15, complete: true });
  expect(examScope("t1-a")?.lessons.map((l) => l.id)).toEqual(["a1", "a2"]);
});

it("scopes a tier exam to every module, complete only when all lessons are written", () => {
  const tier = examScope("t1");
  expect(tier).toMatchObject({ kind: "Tier", title: "Tier one", size: 30, complete: false });
  expect(tier?.lessons.map((l) => l.id)).toEqual(["a1", "a2", "b1"]);
  expect(examScope("t1-b")?.complete).toBe(false);
});

it("knows no exam for an unknown id", () => {
  expect(examScope("nope")).toBeUndefined();
});

it("draws evenly across groups, then fills from the bigger ones", () => {
  const picked = drawEvenly([["a1", "a2", "a3", "a4", "a5"], ["b1"], ["c1", "c2"]], 5);
  expect(picked).toHaveLength(5);
  expect(picked.filter((p) => p.startsWith("b"))).toEqual(["b1"]);
  expect(picked.filter((p) => p.startsWith("c")).sort()).toEqual(["c1", "c2"]);
  expect(drawEvenly([["x"], ["y"]], 10)).toHaveLength(2);
});
