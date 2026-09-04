// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildSemanticDocument } from "../document/semanticDocument";
import { summarizeExtractively } from "./extractiveSummary";

function answer(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  return buildSemanticDocument(root, "summary-fixture");
}

describe("summarizeExtractively", () => {
  it("returns only complete source sentences", () => {
    const source = answer(`
      <h2>Recommendation</h2>
      <p>Start with the smallest model that passes a representative evaluation. This keeps latency and cost under control.</p>
      <p>Measure quality, latency, and total operating cost before rollout.</p>
    `);

    const output = summarizeExtractively(source);

    expect(output.engine).toBe("extractive");
    expect(source.plainText).toContain(output.bottomLine);
    output.keyPoints.forEach((point) => expect(source.plainText).toContain(point));
    expect(output.bottomLine.endsWith(".")).toBe(true);
  });

  it("ignores conversational filler when a substantive sentence follows", () => {
    const source = answer(`
      <p>Great question! Here is a detailed overview. Measure latency and total cost before rollout.</p>
      <p>Record the threshold used for approval.</p>
    `);

    const output = summarizeExtractively(source);

    expect(output.bottomLine).toBe("Measure latency and total cost before rollout.");
  });

  it("prefers distinct list items as key points", () => {
    const source = answer(`
      <p>Use a representative evaluation before choosing a model.</p>
      <ul>
        <li>Measure latency on production hardware.</li>
        <li>Compare total operating cost.</li>
        <li>Document the quality threshold.</li>
      </ul>
      <p>Measure latency on production hardware.</p>
    `);

    const output = summarizeExtractively(source);

    expect(output.keyPoints).toEqual([
      "Measure latency on production hardware.",
      "Compare total operating cost.",
      "Document the quality threshold.",
    ]);
  });

  it("reports reading time and structural counts", () => {
    const words = Array.from({ length: 230 }, (_, index) => `word${index}`).join(" ");
    const source = answer(`<p>${words}.</p><pre><code>npm run verify</code></pre><table><tr><td>Cost</td></tr></table>`);

    const output = summarizeExtractively(source);

    expect(output.readTimeSec).toBeGreaterThanOrEqual(60);
    expect(output.counts).toEqual({ sections: 1, actions: 0, sources: 0, code: 1 });
  });
});
