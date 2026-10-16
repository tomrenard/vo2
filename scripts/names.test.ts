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

it("matches a full title against Crossref's title plus subtitle", () => {
  const ours = "Critical Power: An Important Fatigue Threshold in Exercise Physiology";
  expect(titleMatch(ours, "Critical Power")).toBeLessThan(0.8);
  expect(
    titleMatch(ours, "Critical Power: An Important Fatigue Threshold in Exercise Physiology"),
  ).toBe(1);
});

it("reads a title with markup inside words the same as plain text", () => {
  expect(
    titleMatch(
      "V̇O2max: V̇O2peak is no longer acceptable",
      "<i>V</i>̇\n <scp>O</scp>\n <sub>2max</sub>: <i>V</i>̇O<sub>2peak</sub> is no longer acceptable",
    ),
  ).toBe(1);
});

it("keeps a wrapped line break between plain words as a gap", () => {
  expect(titleMatch("Five Different CPET Systems", "Five Different\n   CPET Systems")).toBe(1);
});

it("reads a tag between words as a gap", () => {
  expect(
    titleMatch(
      "Validity of Five Different CPET Systems",
      "Validity of Five Different\n   <scp>CPET</scp>\n   Systems",
    ),
  ).toBe(1);
});
