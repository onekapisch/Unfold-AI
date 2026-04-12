// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { planChunks } from "./chunker";

function buildRoot(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

describe("planChunks", () => {
  it("never splits a code block", () => {
    const root = buildRoot(`
      <p>${"word ".repeat(200)}</p>
      <pre><code>${"line\n".repeat(60)}</code></pre>
      <p>${"tail ".repeat(20)}</p>
    `);
    const plan = planChunks(root, "standard");
    const codeChunks = plan.chunks.filter((c) => c.blocks.some((b) => b.kind === "code"));
    expect(codeChunks).toHaveLength(1);
    // Code block must be a single block inside its chunk (atomic).
    const codeBlocksInChunk = codeChunks[0].blocks.filter((b) => b.kind === "code");
    expect(codeBlocksInChunk).toHaveLength(1);
  });

  it("starts a new chunk at headings", () => {
    const root = buildRoot(`
      <p>${"a ".repeat(40)}</p>
      <h2>Section</h2>
      <p>${"b ".repeat(40)}</p>
    `);
    const plan = planChunks(root, "standard");
    const headingChunkIdx = plan.chunks.findIndex((c) => c.blocks[0]?.kind === "heading");
    expect(headingChunkIdx).toBeGreaterThan(0);
  });

  it("produces a stable hash for identical content", () => {
    const a = planChunks(buildRoot("<p>hello world</p>"), "standard");
    const b = planChunks(buildRoot("<p>hello world</p>"), "standard");
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("hash changes when content changes", () => {
    const a = planChunks(buildRoot("<p>hello world</p>"), "standard");
    const b = planChunks(buildRoot("<p>hello there</p>"), "standard");
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it("respects preset target size (quick < standard < deep)", () => {
    const html = Array.from({ length: 10 }, (_, i) => `<p>${`word${i} `.repeat(50)}</p>`).join("");
    const quick = planChunks(buildRoot(html), "quick").chunks.length;
    const standard = planChunks(buildRoot(html), "standard").chunks.length;
    const deep = planChunks(buildRoot(html), "deep").chunks.length;
    expect(quick).toBeGreaterThanOrEqual(standard);
    expect(standard).toBeGreaterThanOrEqual(deep);
  });
});
