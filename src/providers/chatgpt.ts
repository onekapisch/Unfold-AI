import { BaseAdapter } from "./baseAdapter";

/**
 * ChatGPT adapter — targets chatgpt.com.
 *
 * Selector strategy (layered, most-stable first):
 *   1. data-message-author-role="assistant" — ChatGPT's own marker, very stable.
 *   2. .markdown.prose — the rendered content root inside each turn.
 *
 * When these break, patch THIS FILE ONLY — core product stays stable.
 */
export class ChatGPTAdapter extends BaseAdapter {
  id = "chatgpt";

  matches(url: URL): boolean {
    return url.hostname === "chatgpt.com" || url.hostname.endsWith(".chatgpt.com");
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>("[data-message-author-role='assistant']"),
    );
  }

  findUserMessages(root: Document | HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>("[data-message-author-role='user']"),
    );
  }

  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    return (
      el.querySelector<HTMLElement>(".markdown.prose") ||
      el.querySelector<HTMLElement>(".markdown") ||
      el.querySelector<HTMLElement>("div[class*='prose']")
    );
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    // ChatGPT toggles a "result-streaming" class on the content root during generation.
    return (
      el.querySelector(".result-streaming") != null ||
      el.getAttribute("data-message-status") === "streaming"
    );
  }

  override getConversationId(): string | null {
    // URLs look like /c/<uuid>
    const m = location.pathname.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}
