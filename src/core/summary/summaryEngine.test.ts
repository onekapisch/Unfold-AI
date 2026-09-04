// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { buildSemanticDocument } from "../document/semanticDocument";
import {
  createSummaryEngine,
  type BuiltInSummarizerFactory,
} from "./summaryEngine";

function documentFixture() {
  const root = document.createElement("div");
  root.innerHTML = `
    <h2>Recommendation</h2>
    <p>Start with the smallest model that passes a representative evaluation.</p>
    <p>Measure latency and total operating cost before rollout.</p>
  `;
  return buildSemanticDocument(root, "engine-fixture");
}

function factory(
  availability: "available" | "downloadable" | "unavailable",
  summarize: () => Promise<string>,
): BuiltInSummarizerFactory {
  return {
    availability: vi.fn().mockResolvedValue(availability),
    create: vi.fn().mockResolvedValue({ summarize, destroy: vi.fn() }),
  };
}

describe("createSummaryEngine", () => {
  it("uses Chrome's built-in summary when the model is available", async () => {
    const builtIn = factory("available", async () => "Use the smallest model that clears the evaluation.");
    const engine = createSummaryEngine({ builtIn, timeoutMs: 100 });

    const output = await engine.summarize(documentFixture());

    expect(output.engine).toBe("built-in");
    expect(output.bottomLine).toBe("Use the smallest model that clears the evaluation.");
    expect(builtIn.create).toHaveBeenCalledOnce();
  });

  it("uses the extractive engine when built-in AI is unavailable", async () => {
    const builtIn = factory("unavailable", async () => "Not used");
    const engine = createSummaryEngine({ builtIn });

    const output = await engine.summarize(documentFixture());

    expect(output.engine).toBe("extractive");
    expect(builtIn.create).not.toHaveBeenCalled();
  });

  it("falls back when built-in summarization rejects", async () => {
    const builtIn = factory("available", async () => {
      throw new Error("model failed");
    });
    const engine = createSummaryEngine({ builtIn });

    await expect(engine.summarize(documentFixture())).resolves.toMatchObject({
      engine: "extractive",
    });
  });

  it("falls back when built-in summarization exceeds the timeout", async () => {
    const builtIn = factory("available", () => new Promise<string>(() => undefined));
    const engine = createSummaryEngine({ builtIn, timeoutMs: 10 });

    await expect(engine.summarize(documentFixture())).resolves.toMatchObject({
      engine: "extractive",
    });
  });

  it("does not trigger a model download without user activation", async () => {
    const builtIn = factory("downloadable", async () => "Ready later");
    const engine = createSummaryEngine({ builtIn });

    await expect(engine.requestModelDownload(false)).resolves.toBe("requires-user-activation");
    expect(builtIn.create).not.toHaveBeenCalled();
  });
});
