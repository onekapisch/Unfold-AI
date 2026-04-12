// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { planChunks } from "../chunking/chunker";
import { toSemanticBlock } from "../chunking/blockClassifier";
import { directElementChildren } from "../dom";
import { generateHeuristicSummary } from "./heuristicSummary";

function summarize(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  const blocks = Array.from(directElementChildren(root)).map(toSemanticBlock);
  const plan = planChunks(root, "standard");
  return generateHeuristicSummary({ blocks, chunks: plan.chunks });
}

describe("generateHeuristicSummary", () => {
  it("strips 'Great question!' preamble from the bottom line", () => {
    const s = summarize(`
      <p>Great question! The answer is that TypeScript provides static type checking at compile time.</p>
      <p>Some more detail follows here with additional context.</p>
    `);
    expect(s.bottomLine.toLowerCase()).not.toContain("great question");
    expect(s.bottomLine).toMatch(/typescript/i);
  });

  it("strips 'Here is a brief overview' preamble", () => {
    const s = summarize(`
      <p>Here's a brief overview: React uses a virtual DOM to minimize expensive real DOM operations.</p>
    `);
    expect(s.bottomLine.toLowerCase()).not.toContain("here's a brief");
    expect(s.bottomLine).toMatch(/react/i);
  });

  it("skips headings when picking the lead block", () => {
    const s = summarize(`
      <h1>Overview</h1>
      <p>The database should be indexed on the user_id column for performance.</p>
    `);
    expect(s.bottomLine).toMatch(/database/i);
  });

  it("extracts key points from the first list", () => {
    const s = summarize(`
      <p>${"filler ".repeat(50)}</p>
      <ul><li>First important point</li><li>Second point</li><li>Third point</li><li>Fourth</li></ul>
      <p>${"tail ".repeat(50)}</p>
    `);
    expect(s.keyPoints.length).toBeGreaterThan(0);
    expect(s.keyPoints.length).toBeLessThanOrEqual(3);
    expect(s.keyPoints[0]).toContain("First important point");
  });

  it("counts badges", () => {
    const s = summarize(`
      <p>Intro paragraph ${"x ".repeat(60)}</p>
      <pre><code>code</code></pre>
      <table><tr><td>a</td></tr></table>
      <ul><li>x</li></ul>
    `);
    expect(s.badges.code).toBe(1);
    expect(s.badges.table).toBe(1);
    expect(s.badges.list).toBe(1);
  });

  it("produces a sensible read time", () => {
    const s = summarize(`<p>${"word ".repeat(460)}</p>`); // ~460 words at 230 wpm = ~120s
    expect(s.readTimeSec).toBeGreaterThan(60);
    expect(s.readTimeSec).toBeLessThan(240);
  });
});
