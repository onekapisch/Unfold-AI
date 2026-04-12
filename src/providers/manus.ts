import { BaseAdapter } from "./baseAdapter";

/**
 * Manus adapter — targets manus.im (agentic AI platform).
 *
 * Confirmed DOM structure (inspected live, April 2025):
 *
 *   div[data-event-id].flex.flex-col.gap-2.w-full.group.mt-3
 *     └── div[dir="auto"][class*="max-w-none"]   ← content root
 *           ├── DIV / P / H2 / OL / UL …         ← prose children
 *
 * The `dir="auto"` attribute on the `max-w-none` div is the stable
 * selector — it doesn't appear on sidebar step items or user message cards.
 *
 * User messages are displayed as short prompt cards without this structure,
 * so the word-count threshold naturally excludes them even if selected.
 */
export class ManusAdapter extends BaseAdapter {
  id = "manus";

  matches(url: URL): boolean {
    return url.hostname === "manus.im" || url.hostname.endsWith(".manus.im");
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    // The content root div (dir="auto" + max-w-none class) is unique to
    // Manus AI message blocks.  Walk up one level to get the event wrapper.
    const contentRoots = Array.from(
      root.querySelectorAll<HTMLElement>('div[dir="auto"][class*="max-w-none"]'),
    );

    const wrappers = new Set<HTMLElement>();
    for (const cr of contentRoots) {
      // The immediate parent is the data-event-id wrapper
      const parent = cr.parentElement;
      if (parent && parent.hasAttribute("data-event-id")) {
        wrappers.add(parent);
      } else {
        // Fallback: walk up to find nearest data-event-id ancestor
        let node = cr.parentElement;
        for (let i = 0; i < 5 && node; i++) {
          if (node.hasAttribute("data-event-id")) { wrappers.add(node); break; }
          node = node.parentElement;
        }
      }
    }
    return Array.from(wrappers);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findUserMessages(_root: Document | HTMLElement): HTMLElement[] {
    // Manus user prompts are rendered as short header cards — they don't
    // use the max-w-none structure, so we skip them to avoid false positives.
    return [];
  }

  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    // Primary: the confirmed content div with dir="auto" and max-w-none class
    const contentDiv = el.querySelector<HTMLElement>('div[dir="auto"][class*="max-w-none"]');
    if (contentDiv && contentDiv.children.length > 0) {
      // If the content div has direct prose/block children, use it as-is
      const PROSE = new Set(["P","H1","H2","H3","H4","H5","H6","PRE","UL","OL","TABLE","BLOCKQUOTE","DIV"]);
      const hasProse = Array.from(contentDiv.children).some(c => PROSE.has(c.tagName));
      if (hasProse) return contentDiv;

      // Single-child case: dig one level deeper
      if (contentDiv.children.length === 1 && contentDiv.firstElementChild instanceof HTMLElement) {
        return contentDiv.firstElementChild;
      }
      return contentDiv;
    }

    // Fallback for future DOM changes
    return (
      el.querySelector<HTMLElement>(".prose") ||
      el.querySelector<HTMLElement>("[class*='markdown']") ||
      null
    );
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    return (
      el.querySelector("[data-streaming='true'], [data-is-streaming='true']") != null ||
      el.querySelector(".streaming-cursor, .typing-indicator, .animate-pulse") != null ||
      el.getAttribute("aria-busy") === "true"
    );
  }

  override getConversationId(): string | null {
    // URLs: /app/[taskId]  or  /share/[taskId]
    const m = location.pathname.match(/\/(?:app|share|task|replay)\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}
