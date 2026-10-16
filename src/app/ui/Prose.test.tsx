import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Prose } from "./Prose";

it("renders a term link inside bold as a term, not raw markdown", () => {
  const html = renderToStaticMarkup(<Prose text="Watch **[RER](g:rer)** rise." />);
  expect(html).toContain("<strong><button");
  expect(html).not.toContain("](g:");
});

it("renders an evidence badge inside bold", () => {
  const claim = { id: "x", text: "t", grade: "weak" as const, sources: [], evidence: [] };
  const html = renderToStaticMarkup(<Prose text="**Big [[c:x]]**" claims={[claim]} />);
  expect(html).toContain("Evidence: weak");
  expect(html).not.toContain("[[c:");
});
