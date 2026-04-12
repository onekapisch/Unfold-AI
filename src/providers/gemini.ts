import { BaseAdapter } from "./baseAdapter";

/**
 * Gemini adapter — targets gemini.google.com.
 *
 * Confirmed DOM structure (live inspection April 2025):
 *   Message element:  <model-response> custom element
 *   User queries:     <user-query> custom element
 *   Content root:     div.markdown.markdown-main-panel
 *     (inside model-response > div.container > message-content > div.markdown)
 *     Has direct prose children: H3, P, UL, OL, PRE, TABLE…
 *
 *   NOTE: div.response-content exists but has only 4 children (thoughts, h2,
 *   structured-content-container, footer) — NOT suitable as content root.
 *   div.markdown.markdown-main-panel is the correct target.
 *
 * When selectors break, patch THIS FILE ONLY.
 */
export class GeminiAdapter extends BaseAdapter {
  id = "gemini";

  matches(url: URL): boolean {
    return url.hostname === "gemini.google.com" || url.hostname.endsWith(".gemini.google.com");
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    // model-response is a stable custom element Gemini has used since launch.
    return Array.from(root.querySelectorAll<HTMLElement>("model-response"));
  }

  findUserMessages(root: Document | HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>("user-query"));
  }

  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    // Primary: div.markdown.markdown-main-panel — has direct H3/P/UL/PRE children
    const mdPanel = el.querySelector<HTMLElement>("div.markdown.markdown-main-panel");
    if (mdPanel && mdPanel.children.length >= 2) return mdPanel;

    // Fallback: any div with "markdown" and "main-panel" in class
    const mdFallback = el.querySelector<HTMLElement>("div[class*='markdown'][class*='main-panel']");
    if (mdFallback && mdFallback.children.length >= 2) return mdFallback;

    // Broader fallback: any div.markdown with substantial prose children
    const PROSE = new Set(["P","H1","H2","H3","H4","H5","H6","PRE","UL","OL","TABLE","BLOCKQUOTE"]);
    const allMarkdown = Array.from(el.querySelectorAll<HTMLElement>("div.markdown"));
    for (const m of allMarkdown) {
      const proseCount = Array.from(m.children).filter(c => PROSE.has(c.tagName)).length;
      if (proseCount >= 2) return m;
    }

    return null;
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    // Scope checks to the element first; use global stop button only as fallback
    // when the element itself is the LAST model-response in the document.
    if (
      el.querySelector(".pending") != null ||
      el.hasAttribute("data-is-streaming") ||
      el.getAttribute("aria-busy") === "true"
    ) return true;

    // Only check global stop button for the last assistant message to avoid
    // marking all messages as streaming when only the latest one is.
    const allResponses = document.querySelectorAll("model-response");
    const isLast = allResponses.length > 0 && allResponses[allResponses.length - 1] === el;
    if (isLast && document.querySelector("[aria-label='Stop response'], [aria-label='Stop generating']")) {
      return true;
    }

    return false;
  }

  override getConversationId(): string | null {
    // URLs look like /app/<hex-id>
    const m = location.pathname.match(/\/app\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}
