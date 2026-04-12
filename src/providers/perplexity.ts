import { BaseAdapter } from "./baseAdapter";

/**
 * Perplexity adapter — targets www.perplexity.ai.
 *
 * DOM structure (inspected April 2025):
 *
 *   div.prose  (or div[class*="prose"])       ← answer content root
 *     P, H2, H3, UL, OL, PRE, TABLE…         ← prose children
 *
 *   Assistant answers are wrapped in a parent container with a
 *   data attribute or class that distinguishes them from follow-up
 *   question panels and sidebar content.
 *
 *   Perplexity uses streaming — the answer grows paragraph by paragraph.
 *   A "Stop" button appears during generation.
 *
 * When selectors break, patch THIS FILE ONLY.
 */
export class PerplexityAdapter extends BaseAdapter {
  id = "perplexity";

  matches(url: URL): boolean {
    return (
      url.hostname === "www.perplexity.ai" ||
      url.hostname === "perplexity.ai" ||
      url.hostname.endsWith(".perplexity.ai")
    );
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    // Perplexity wraps each answer in a container with class containing "prose"
    // inside a parent that serves as the answer block.
    // Look for the answer wrapper divs that contain prose content.
    const PROSE = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "UL", "OL", "TABLE", "BLOCKQUOTE"]);

    // Strategy 1: Look for answer containers by common Perplexity patterns
    const answerBlocks = Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-testid='answer-content'], " +
        "div.relative.default.font-sans.text-base, " +
        "div[class*='prose'][class*='dark:prose-invert']",
      ),
    );
    if (answerBlocks.length > 0) return answerBlocks;

    // Strategy 2: Find prose containers with substantial content
    const proseEls = Array.from(root.querySelectorAll<HTMLElement>("div.prose, div[class*='prose']"));
    return proseEls.filter((el) => {
      const proseCount = Array.from(el.children).filter((c) => PROSE.has(c.tagName)).length;
      return proseCount >= 2;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findUserMessages(_root: Document | HTMLElement): HTMLElement[] {
    return [];
  }

  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    const PROSE = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "UL", "OL", "TABLE", "BLOCKQUOTE"]);

    // If the element itself is a prose container, use it directly
    if (el.classList.contains("prose") || el.className.includes("prose")) {
      const proseCount = Array.from(el.children).filter((c) => PROSE.has(c.tagName)).length;
      if (proseCount >= 1) return el;
    }

    // Look for a prose child
    const prose = el.querySelector<HTMLElement>("div.prose, div[class*='prose']");
    if (prose && prose.children.length > 0) return prose;

    // Fallback: any div.markdown inside the element
    const md = el.querySelector<HTMLElement>("div[class*='markdown']");
    if (md && md.children.length > 0) return md;

    return null;
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    // Perplexity shows a pulsing cursor or a stop button during streaming
    if (
      el.querySelector(".animate-pulse, .streaming-cursor, [data-streaming='true']") != null ||
      el.getAttribute("aria-busy") === "true"
    ) return true;

    // Only check the global stop button for the last answer
    const allAnswers = this.findAssistantMessages(document);
    const isLast = allAnswers.length > 0 && allAnswers[allAnswers.length - 1] === el;
    if (isLast && document.querySelector("button[aria-label*='Stop'], button[aria-label*='stop']")) {
      return true;
    }

    return false;
  }

  override getConversationId(): string | null {
    // URLs: /search/<id> or /thread/<id>
    const m = location.pathname.match(/\/(?:search|thread)\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}
