import { BaseAdapter } from "./baseAdapter";

/**
 * DeepSeek adapter — targets chat.deepseek.com.
 *
 * DOM structure (inspected April 2025):
 *
 *   DeepSeek's chat interface follows a React-based chat layout:
 *
 *   div[class*="markdown"]                ← content root (rendered markdown)
 *     P, H2, H3, UL, OL, PRE, TABLE…    ← prose children
 *
 *   Assistant messages are distinguished from user messages by their container.
 *   The user message container typically uses a different alignment/styling.
 *
 * When selectors break, patch THIS FILE ONLY.
 */
export class DeepSeekAdapter extends BaseAdapter {
  id = "deepseek";

  matches(url: URL): boolean {
    return (
      url.hostname === "chat.deepseek.com" ||
      url.hostname.endsWith(".deepseek.com")
    );
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    const PROSE = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "UL", "OL", "TABLE", "BLOCKQUOTE"]);

    // Strategy 1: data attribute markers
    const byAttr = Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-message-author-role='assistant'], " +
        "div[class*='assistant-message'], " +
        "div[data-role='assistant']",
      ),
    );
    if (byAttr.length > 0) return byAttr;

    // Strategy 2: DeepSeek wraps assistant markdown in containers with
    // class containing "markdown" — filter to those with prose children
    // that aren't inside user input areas.
    const markdownEls = Array.from(
      root.querySelectorAll<HTMLElement>("div[class*='markdown']"),
    );
    const assistantMsgs: HTMLElement[] = [];

    for (const el of markdownEls) {
      // Skip if inside a user message or input area
      if (el.closest("[data-role='user'], [class*='user-message'], textarea, [contenteditable]")) {
        continue;
      }
      const proseCount = Array.from(el.children).filter((c) => PROSE.has(c.tagName)).length;
      if (proseCount >= 1) {
        // Use the parent container if it's a message wrapper
        const wrapper = el.closest<HTMLElement>("[class*='message'], [class*='chat-message']");
        assistantMsgs.push(wrapper ?? el);
      }
    }

    // Deduplicate nested matches
    return assistantMsgs.filter(
      (el) => !assistantMsgs.some((other) => other !== el && other.contains(el)),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findUserMessages(_root: Document | HTMLElement): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-message-author-role='user'], div[data-role='user'], div[class*='user-message']",
      ),
    );
  }

  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    // Find the markdown-rendered content container
    const md =
      el.querySelector<HTMLElement>("div[class*='markdown']") ||
      el.querySelector<HTMLElement>(".prose") ||
      el.querySelector<HTMLElement>("div[class*='message-content']");

    if (md && md.children.length > 0) return md;

    // If el itself is the markdown container
    if (el.className.includes("markdown") && el.children.length > 0) return el;

    return null;
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    if (
      el.querySelector(".result-streaming, [data-streaming='true'], [data-is-streaming='true']") != null ||
      el.querySelector(".animate-pulse, .streaming-cursor") != null ||
      el.getAttribute("aria-busy") === "true"
    ) return true;

    // Check for global stop button only for the last message
    const allMsgs = this.findAssistantMessages(document);
    const isLast = allMsgs.length > 0 && allMsgs[allMsgs.length - 1] === el;
    if (isLast && document.querySelector("button[class*='stop'], [aria-label*='Stop']")) {
      return true;
    }

    return false;
  }

  override getConversationId(): string | null {
    // URLs: /chat/<id> or /a/chat/s/<id>
    const m = location.pathname.match(/\/(?:chat|s)\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}
