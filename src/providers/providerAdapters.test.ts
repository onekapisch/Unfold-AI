// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProviderAdapter } from "../core/types";
import { ChatGPTAdapter } from "./chatgpt";
import { ClaudeAdapter } from "./claude";
import { DeepSeekAdapter } from "./deepseek";
import { GeminiAdapter } from "./gemini";
import { GrokAdapter } from "./grok";
import { ManusAdapter } from "./manus";
import { PerplexityAdapter } from "./perplexity";

const fixtures: Array<{ adapter: ProviderAdapter; url: string; file: string }> = [
  { adapter: new ChatGPTAdapter(), url: "https://chatgpt.com/c/test", file: "chatgpt.html" },
  { adapter: new ClaudeAdapter(), url: "https://claude.ai/chat/test", file: "claude.html" },
  { adapter: new GeminiAdapter(), url: "https://gemini.google.com/app/test", file: "gemini.html" },
  { adapter: new GrokAdapter(), url: "https://grok.com/c/test", file: "grok.html" },
  { adapter: new PerplexityAdapter(), url: "https://www.perplexity.ai/search/test", file: "perplexity.html" },
  { adapter: new DeepSeekAdapter(), url: "https://chat.deepseek.com/chat/test", file: "deepseek.html" },
  { adapter: new ManusAdapter(), url: "https://manus.im/app/test", file: "manus.html" },
];

describe("provider adapters", () => {
  beforeEach(() => document.body.replaceChildren());

  for (const fixture of fixtures) {
    it(`identifies a high-confidence ${fixture.adapter.id} answer root`, () => {
      document.body.innerHTML = readFileSync(join(process.cwd(), "fixtures/providers", fixture.file), "utf8");
      expect(fixture.adapter.matches(new URL(fixture.url))).toBe(true);
      const messages = fixture.adapter.findAssistantMessages(document);
      expect(messages).toHaveLength(1);
      const root = fixture.adapter.getRenderableContentRoot(messages[0]);
      expect(root?.querySelector("h2")?.textContent).toBe("Plan");
      expect(root?.querySelector("p")?.textContent).toBe("Measure first.");
    });
  }

  it("does not request access to the broader X site for Grok", () => {
    expect(new GrokAdapter().matches(new URL("https://x.com/i/grok"))).toBe(false);
  });
});
