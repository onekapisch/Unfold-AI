import type { ProviderAdapter } from "@core/types";
import { fnv1a } from "@core/hashing";

/**
 * Utilities shared by all provider adapters.
 * Concrete adapters supply their own selectors; everything else is shared
 * so per-provider files stay small and easy to patch when DOM shifts.
 */
export abstract class BaseAdapter implements ProviderAdapter {
  abstract id: string;
  abstract matches(url: URL): boolean;
  abstract findAssistantMessages(root: Document | HTMLElement): HTMLElement[];
  abstract findUserMessages(root: Document | HTMLElement): HTMLElement[];
  abstract getRenderableContentRoot(el: HTMLElement): HTMLElement | null;

  /** Default: pull the last path segment that looks like an id. */
  getConversationId(): string | null {
    const parts = location.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (/[0-9a-f]{6,}/i.test(p)) return p;
    }
    return null;
  }

  /** Default streaming heuristic: message has a "result-streaming"-like marker
   *  OR its text grew in the last tick. Concrete adapters override when needed. */
  isMessageStreaming(el: HTMLElement): boolean {
    return (
      el.querySelector("[data-message-streaming='true']") != null ||
      el.classList.contains("result-streaming") ||
      el.getAttribute("aria-busy") === "true"
    );
  }

  getMessageStableId(el: HTMLElement, index: number): string {
    const native =
      el.getAttribute("data-message-id") ||
      el.getAttribute("data-id") ||
      el.getAttribute("id");
    if (native) return `${this.id}:${native}`;
    // Fallback: hash the first 200 chars of textContent + index.
    const sig = (el.textContent ?? "").slice(0, 200);
    return `${this.id}:${index}:${fnv1a(sig)}`;
  }

  observeRoot(root: Document, onPotentialChange: () => void): MutationObserver {
    let timer: number | null = null;
    const debounced = () => {
      if (timer != null) return;
      timer = window.setTimeout(() => {
        timer = null;
        onPotentialChange();
      }, 150);
    };
    const obs = new MutationObserver(debounced);
    obs.observe(root.body, { childList: true, subtree: true, characterData: true });
    return obs;
  }

  getTheme(): "light" | "dark" | "unknown" {
    const html = document.documentElement;
    if (html.classList.contains("dark") || html.dataset.theme === "dark") return "dark";
    if (html.classList.contains("light") || html.dataset.theme === "light") return "light";
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (mq?.matches) return "dark";
    return "unknown";
  }
}
