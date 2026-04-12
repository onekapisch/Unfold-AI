import type { ProviderAdapter } from "@core/types";
import { ChatGPTAdapter } from "./chatgpt";
import { ClaudeAdapter } from "./claude";
import { GeminiAdapter } from "./gemini";
import { GrokAdapter } from "./grok";
import { ManusAdapter } from "./manus";
import { PerplexityAdapter } from "./perplexity";
import { DeepSeekAdapter } from "./deepseek";

// Order matters: first adapter whose matches() returns true wins.
const ADAPTERS: ProviderAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new GrokAdapter(),
  new ManusAdapter(),
  new PerplexityAdapter(),
  new DeepSeekAdapter(),
];

export function getActiveAdapter(url: URL = new URL(location.href)): ProviderAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}

export function listAdapters(): ProviderAdapter[] {
  return ADAPTERS.slice();
}
