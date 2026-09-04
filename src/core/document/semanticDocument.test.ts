// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildSemanticDocument, sectionText } from "./semanticDocument";

function fixture(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

describe("buildSemanticDocument", () => {
  it("keeps headings with the blocks that follow them", () => {
    const root = fixture(`
      <h2>Choose a model</h2>
      <p>Start with measured needs and a representative evaluation.</p>
      <pre><code>npm run evaluate</code></pre>
      <h2>Control the rollout</h2>
      <p>Record the approval threshold before production.</p>
    `);

    const result = buildSemanticDocument(root, "answer-1");

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].title).toBe("Choose a model");
    expect(result.sections[0].blocks.map((block) => block.kind)).toEqual([
      "heading",
      "paragraph",
      "code",
    ]);
    expect(result.sections[1].title).toBe("Control the rollout");
  });

  it("creates source-faithful labels when headings are absent", () => {
    const root = fixture(`
      <p>Measure latency before choosing a model. Record the result.</p>
      <p>Compare the total operating cost for the full workload.</p>
    `);

    const result = buildSemanticDocument(root, "answer-2");

    expect(result.sections[0].title).toBe("Measure latency before choosing a model");
    expect(result.plainText).toContain("Compare the total operating cost");
  });

  it("creates stable section ids without changing the source DOM", () => {
    const root = fixture(`<h3>Evaluation</h3><p>Use the same prompts for each candidate.</p>`);
    const before = root.innerHTML;

    const first = buildSemanticDocument(root, "answer-3");
    const second = buildSemanticDocument(root, "answer-3");

    expect(first.sections[0].id).toBe(second.sections[0].id);
    expect(root.innerHTML).toBe(before);
    expect(sectionText(first.sections[0])).toBe(
      "Evaluation\nUse the same prompts for each candidate.",
    );
  });

  it("uses one section for leading content before the first heading", () => {
    const root = fixture(`
      <p>The decision depends on measured quality and cost.</p>
      <h2>Evaluation</h2>
      <p>Test representative prompts.</p>
    `);

    const result = buildSemanticDocument(root, "answer-4");

    expect(result.sections.map((section) => section.title)).toEqual([
      "The decision depends on measured quality and cost",
      "Evaluation",
    ]);
  });
});
