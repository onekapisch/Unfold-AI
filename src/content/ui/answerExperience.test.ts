// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { buildAnswerMap } from "../../core/answer-map/buildAnswerMap";
import { buildSemanticDocument } from "../../core/document/semanticDocument";
import { summarizeExtractively } from "../../core/summary/extractiveSummary";
import { mountAnswerExperience } from "./answerExperience";

function model() {
  const root = document.createElement("div");
  root.innerHTML = `
    <h2>Choose a model</h2><p>Measure latency and total cost before rollout.</p>
    <h2>Ship safely</h2><ul><li>Test the fallback.</li></ul>
    <h2>Review sources</h2><p>Read <a href="https://example.com/guide">the guide</a>.</p>
  `;
  document.body.append(root);
  return { root, documentModel: buildSemanticDocument(root, "answer-one") };
}

describe("mountAnswerExperience", () => {
  it("renders isolated summary, counts, and filterable map controls", () => {
    const { root, documentModel } = model();
    const host = document.createElement("div");
    root.before(host);
    const view = mountAnswerExperience({
      host,
      documentModel,
      summary: summarizeExtractively(documentModel),
      mapEntries: buildAnswerMap(documentModel),
      callbacks: {
        onShowNext: vi.fn(), onPrevious: vi.fn(), onShowFull: vi.fn(),
        onCollapse: vi.fn(), onNavigate: vi.fn(), onSave: vi.fn(),
      },
    });

    const shadow = host.shadowRoot!;
    expect(shadow.querySelector("[aria-label='Unfold AI answer tools']")).not.toBeNull();
    expect(shadow.textContent).toContain("Local extractive summary");
    expect(shadow.textContent).toContain("3 sections");
    expect(shadow.querySelectorAll("[role='tab']")).toHaveLength(4);

    (shadow.querySelector("[data-tab='source']") as HTMLButtonElement).click();
    expect(shadow.querySelector("[data-map-list]")?.textContent).toContain("the guide");
    expect(shadow.querySelector("[data-map-list]")?.textContent).not.toContain("Choose a model");
    view.destroy();
    expect(host.shadowRoot?.textContent).toBe("");
  });

  it("routes navigation and explicit reading controls", () => {
    const { root, documentModel } = model();
    const host = document.createElement("div");
    root.before(host);
    const onNavigate = vi.fn();
    const onShowFull = vi.fn();
    mountAnswerExperience({
      host,
      documentModel,
      summary: summarizeExtractively(documentModel),
      mapEntries: buildAnswerMap(documentModel),
      callbacks: {
        onShowNext: vi.fn(), onPrevious: vi.fn(), onShowFull,
        onCollapse: vi.fn(), onNavigate, onSave: vi.fn(),
      },
    });

    (host.shadowRoot!.querySelector("[data-map-entry]") as HTMLButtonElement).click();
    expect(onNavigate).toHaveBeenCalledOnce();
    (host.shadowRoot!.querySelector("[data-action='full']") as HTMLButtonElement).click();
    expect(onShowFull).toHaveBeenCalledOnce();
  });
});
