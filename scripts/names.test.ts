import { expect, it } from "vitest";
import { sameName, titleMatch } from "./names";

it("matches names across accents, special letters and Crossref's garbling", () => {
  expect(sameName("Medbo", "Medbø")).toBe(true);
  expect(sameName("Vøllestad", "Vollestad")).toBe(true);
  expect(sameName("B??rsheim", "Børsheim")).toBe(true);
  expect(sameName("Mairbäurl", "Mairbaurl")).toBe(true);
  expect(sameName("Smith", "Smyth")).toBe(false);
  expect(sameName("B??rsheim", "Bergström")).toBe(false);
});

it("scores how much of our title Crossref's title contains", () => {
  expect(
    titleMatch("Energy system interaction", "Energy System Interaction and relative contribution"),
  ).toBe(1);
  expect(titleMatch("Lactate shuttle", "Glycogen in muscle")).toBe(0);
});
