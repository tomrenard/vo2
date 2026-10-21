import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { matches, PaperList } from "./PaperList";

const paper = (i: number) => ({
  id: `2026-10-${i}`,
  headline: `Paper ${i}`,
  grade: "weak" as const,
  fresh: i === 0,
  tiers: [i % 2 ? "Nutrition" : "Training"],
});

it("shows the first 10 papers, an end marker for the rest, and the tiers given", () => {
  const papers = Array.from({ length: 12 }, (_, i) => paper(i));
  const html = renderToStaticMarkup(
    <PaperList papers={papers} tiers={["Training", "Nutrition"]} />,
  );
  expect(html.match(/class="card/g)).toHaveLength(10);
  expect(html).toContain('aria-hidden="true" class="h-8"');
  expect(html.indexOf("<option>Training")).toBeLessThan(html.indexOf("<option>Nutrition"));
});

it("filters by text, tier and new only", () => {
  const p = {
    ...paper(0),
    source: { firstAuthor: "Burke", journal: "J Physiol", title: "Fat adaptation" },
  } as Parameters<typeof matches>[0];
  const all = { q: "", tier: "", freshOnly: false };
  expect(matches(p, all)).toBe(true);
  expect(matches(p, { ...all, q: "burke" })).toBe(true);
  expect(matches(p, { ...all, q: "physiol" })).toBe(true);
  expect(matches(p, { ...all, q: "fat adapt" })).toBe(true);
  expect(matches(p, { ...all, q: "altitude" })).toBe(false);
  expect(matches(p, { ...all, tier: "Training" })).toBe(true);
  expect(matches(p, { ...all, tier: "Nutrition" })).toBe(false);
  expect(matches({ ...p, fresh: false }, { ...all, freshOnly: true })).toBe(false);
});
