// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalSettings, ProviderAdapter } from "../core/types";
import { DEFAULT_SETTINGS } from "../core/types";
import { enhanceMessage, teardownMessage } from "./enhancer";

function fixture(streaming = false): { message: HTMLElement; root: HTMLElement; adapter: ProviderAdapter } {
  const message = document.createElement("article");
  const root = document.createElement("div");
  root.className = "content";
  root.innerHTML = `
    <h2>Evaluate</h2><p>${"Measure latency and cost before rollout. ".repeat(20)}</p>
    <h2>Prepare</h2><p>${"Record thresholds and owners before launch. ".repeat(20)}</p>
    <h2>Launch</h2><p>${"Test the fallback with representative traffic. ".repeat(20)}</p>
  `;
  message.append(root);
  document.body.append(message);
  const adapter: ProviderAdapter = {
    id: "test",
    matches: () => true,
    getConversationId: () => "conversation",
    findAssistantMessages: () => [message],
    findUserMessages: () => [],
    isMessageStreaming: () => streaming,
    getMessageStableId: () => "answer",
    getRenderableContentRoot: () => root,
    observeRoot: () => new MutationObserver(() => undefined),
    getTheme: () => "light",
  };
  return { message, root, adapter };
}

describe("enhanceMessage", () => {
  beforeEach(() => document.body.replaceChildren());

  it("waits for streaming to finish and leaves short answers untouched", () => {
    const active = fixture(true);
    expect(enhanceMessage({
      adapter: active.adapter, settings: DEFAULT_SETTINGS,
      messageEl: active.message, messageId: "answer", conversationId: "conversation",
    })).toBe(false);
    expect(active.message.querySelector("unfold-ai-root")).toBeNull();

    const short = fixture(false);
    short.root.textContent = "A short answer.";
    expect(enhanceMessage({
      adapter: short.adapter, settings: DEFAULT_SETTINGS,
      messageEl: short.message, messageId: "short", conversationId: "conversation",
    })).toBe(false);
  });

  it("shows two semantic sections in balanced mode and always restores the full source", () => {
    const { adapter, message, root } = fixture();
    const settings: GlobalSettings = { ...DEFAULT_SETTINGS, lengthThreshold: 60 };
    expect(enhanceMessage({ adapter, settings, messageEl: message, messageId: "answer", conversationId: "conversation" })).toBe(true);

    const host = message.querySelector<HTMLElement>("unfold-ai-root")!;
    expect(host.shadowRoot).not.toBeNull();
    expect(Array.from(root.children).filter((item) => (item as HTMLElement).style.display === "none")).toHaveLength(2);
    (host.shadowRoot!.querySelector("[data-action='full']") as HTMLButtonElement).click();
    expect(Array.from(root.children).every((item) => (item as HTMLElement).style.display !== "none")).toBe(true);

    teardownMessage(message, root);
    expect(message.querySelector("unfold-ai-root")).toBeNull();
    expect(Array.from(root.children).every((item) => (item as HTMLElement).style.display !== "none")).toBe(true);
  });

  it("sends exact source text through the validated save boundary", () => {
    const { adapter, message } = fixture();
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    enhanceMessage({
      adapter,
      settings: { ...DEFAULT_SETTINGS, lengthThreshold: 60 },
      messageEl: message,
      messageId: "answer",
      conversationId: "conversation",
      sendMessage,
    });
    const host = message.querySelector<HTMLElement>("unfold-ai-root")!;
    (host.shadowRoot!.querySelector("[data-action='save']") as HTMLButtonElement).click();
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "saved:create",
      input: expect.objectContaining({ text: expect.stringContaining("Measure latency") }),
    }));
  });
});
