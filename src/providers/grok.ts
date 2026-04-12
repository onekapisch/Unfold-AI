import { BaseAdapter } from "./baseAdapter";

/**
 * Grok adapter — targets grok.com (xAI).
 *
 * Confirmed DOM structure (live inspection April 2025):
 *   All messages: div.message-bubble.prose (with no data-role attributes)
 *   User bubbles:      parent div has class "items-end"
 *   Assistant bubbles: parent div has class "items-start"
 *   Content root:      div.response-content-markdown (direct prose children: P, H2, H3…)
 *
 * When selectors break, patch THIS FILE ONLY.
 */
export class GrokAdapter extends BaseAdapter {
  id = "grok";

  matches(url: URL): boolean {
    if (url.hostname === "grok.com" || url.hostname.endsWith(".grok.com")) return true;
    // Grok is also embedded at x.com/i/grok — match ONLY that path, never all of x.com.
    if (url.hostname === "x.com" && url.pathname.startsWith("/i/grok")) return true;
    return false;
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    // Grok has no data-role attributes on messages.
    // Distinguish user vs assistant by parent flex alignment:
    //   User:      parent has class "items-end"
    //   Assistant: parent has class "items-start"
    const bubbles = Array.from(
      root.querySelectorAll<HTMLElement>("div.message-bubble"),
    );
    return bubbles.filter((b) => b.parentElement?.classList.contains("items-start"));
  }

  findUserMessages(root: Document | HTMLElement): HTMLElement[] {
    const bubbles = Array.from(
      root.querySelectorAll<HTMLElement>("div.message-bubble"),
    );
    return bubbles.filter((b) => b.parentElement?.classList.contains("items-end"));
  }

  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    // response-content-markdown has direct prose children: P, H2, H3, UL, OL, PRE…
    return (
      el.querySelector<HTMLElement>("div.response-content-markdown") ||
      el.querySelector<HTMLElement>("[class*='response-content-markdown']") ||
      el.querySelector<HTMLElement>("[class*='markdown']") ||
      null
    );
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    // Grok shows a thinking-container while generating, then removes it.
    if (
      el.querySelector(".thinking-container") != null ||
      el.getAttribute("aria-busy") === "true"
    ) return true;

    // Only check global stop button for the last assistant message to avoid
    // marking all messages as streaming when only the latest one is.
    const assistantBubbles = Array.from(
      document.querySelectorAll<HTMLElement>("div.message-bubble"),
    ).filter((b) => b.parentElement?.classList.contains("items-start"));
    const isLast = assistantBubbles.length > 0 && assistantBubbles[assistantBubbles.length - 1] === el;
    if (isLast && document.querySelector("[aria-label*='Stop'], [aria-label*='stop generating']")) {
      return true;
    }

    return false;
  }

  override getConversationId(): string | null {
    // URLs look like /c/<uuid>?rid=<rid>  — we want just the uuid
    const m = location.pathname.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}
