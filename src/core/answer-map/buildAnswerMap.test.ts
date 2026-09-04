// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildSemanticDocument } from "../document/semanticDocument";
import { buildAnswerMap, filterAnswerMap } from "./buildAnswerMap";

function mappedAnswer() {
  const root = document.createElement("div");
  root.innerHTML = `
    <h2>Define the workload</h2>
    <p>Measure the context length and latency tolerance.</p>
    <ul>
      <li>Measure latency before rollout.</li>
      <li>The deployment already has monitoring.</li>
    </ul>
    <h2>Compare evidence</h2>
    <p>Use the <a href="https://example.com/report">evaluation report</a> as the baseline.</p>
    <h2>Run the gate</h2>
    <pre data-language="shell"><code>npm run verify\nnpm run build</code></pre>
  `;
  return buildSemanticDocument(root, "map-answer");
}

describe("buildAnswerMap", () => {
  it("maps exact sections, actions, real links, and code", () => {
    const map = buildAnswerMap(mappedAnswer());

    expect(map.filter((item) => item.kind === "outline")).toHaveLength(3);
    expect(map.find((item) => item.kind === "action")?.label).toBe(
      "Measure latency before rollout.",
    );
    expect(map.find((item) => item.kind === "source")?.href).toBe(
      "https://example.com/report",
    );
    expect(map.find((item) => item.kind === "code")?.label).toBe(
      "shell · npm run verify",
    );
  });

  it("rejects unsafe and non-web source links", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <p><a href="javascript:alert(1)">Unsafe</a></p>
      <p><a href="mailto:test@example.com">Email</a></p>
      <p><a href="https://safe.example/research">Safe research</a></p>
    `;

    const map = buildAnswerMap(buildSemanticDocument(root, "safe-links"));

    expect(map.filter((item) => item.kind === "source").map((item) => item.label)).toEqual([
      "Safe research",
    ]);
  });

  it("filters by tab and literal search text", () => {
    const map = buildAnswerMap(mappedAnswer());

    expect(filterAnswerMap(map, "action", "latency")).toHaveLength(1);
    expect(filterAnswerMap(map, "outline", "evidence")[0].label).toBe(
      "Compare evidence",
    );
    expect(filterAnswerMap(map, "code", "missing")).toEqual([]);
  });

  it("keeps item ids stable for an unchanged answer", () => {
    const first = buildAnswerMap(mappedAnswer());
    const second = buildAnswerMap(mappedAnswer());

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
  });
});
