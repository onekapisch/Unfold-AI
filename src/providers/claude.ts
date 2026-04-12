import { BaseAdapter } from "./baseAdapter";

/**
 * Claude adapter — targets claude.ai.
 *
 * Confirmed DOM structure (as of 2025):
 *
 *   div.font-claude-response          ← assistant message root
 *     div                             ← anonymous wrapper
 *       div.standard-markdown         ← rendered prose (52 children, p/h2/pre/ul…)
 *         <p>, <h2>, <p>, <pre>…
 *
 * No data-testid on the message or content elements.
 * Class names use Tailwind — only the semantic names
 * (font-claude-response, standard-markdown) are stable.
 */
export class ClaudeAdapter extends BaseAdapter {
  id = "claude";

  matches(url: URL): boolean {
    return url.hostname === "claude.ai" || url.hostname.endsWith(".claude.ai");
  }

  findAssistantMessages(root: Document | HTMLElement): HTMLElement[] {
    // Primary: data-testid (may return if Claude re-adds it)
    const byTestId = Array.from(
      root.querySelectorAll<HTMLElement>("[data-testid='message-content']"),
    );
    if (byTestId.length > 0) return byTestId;

    // Current (2025): outer response wrapper has class font-claude-response
    // We only want the OUTER wrapper, not inner elements that also contain
    // "font-claude" in their class — so filter to elements whose parent
    // does NOT also contain font-claude-response (i.e. is the top-level one).
    const byResponse = Array.from(
      root.querySelectorAll<HTMLElement>("div.font-claude-response"),
    );
    if (byResponse.length > 0) return byResponse;

    // Fallback: broader match but deduplicated to outermost only
    const byFont = Array.from(
      root.querySelectorAll<HTMLElement>("div[class*='font-claude-response']"),
    );
    return deduplicateToOutermost(byFont);
  }

  findUserMessages(root: Document | HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-testid='user-message'], [data-testid='human-turn-content']",
      ),
    );
  }

  /**
   * Walk from the message root down single-child div wrappers until we find
   * the element whose direct children are actual prose nodes.
   *
   * Confirmed path:
   *   div.font-claude-response → div → div.standard-markdown ← target
   *
   * STREAMING NOTE: We return div.standard-markdown as soon as it exists,
   * even with only 1 child. Requiring ≥2 prose children delayed activation
   * until streaming was nearly/fully complete, defeating the purpose.
   * If the container is empty the word-count threshold won't be met anyway,
   * so returning it early is safe.
   */
  getRenderableContentRoot(el: HTMLElement): HTMLElement | null {
    const PROSE = new Set(["P","H1","H2","H3","H4","H5","H6","PRE","UL","OL","TABLE","BLOCKQUOTE"]);

    // Fast path: known class name — return as soon as it has any children.
    // Do NOT require ≥2 prose children — Claude adds paragraphs one at a time
    // during streaming, so we'd miss the mid-stream activation window.
    const sm = el.querySelector<HTMLElement>("div.standard-markdown, div[class*='standard-markdown']");
    if (sm && sm.children.length > 0) return sm;

    // Walk down single-child chains (handles future wrapper changes)
    let node: HTMLElement = el;
    for (let depth = 0; depth < 10; depth++) {
      if (proseChildCount(node, PROSE) >= 2) return node;
      // More than 1 child → can't walk down blindly, but check all div children
      if (node.children.length > 1) {
        for (const child of Array.from(node.children)) {
          if (child instanceof HTMLElement && child.tagName === "DIV") {
            if (proseChildCount(child, PROSE) >= 2) return child;
          }
        }
        break; // give up
      }
      const next = node.firstElementChild;
      if (!(next instanceof HTMLElement)) break;
      node = next;
    }

    // Return null — never fall back to the raw message wrapper (el) because
    // hiding its children doesn't match prose structure and causes enhancement
    // to appear to do nothing, then "snap" collapse after streaming ends.
    return null;
  }

  override isMessageStreaming(el: HTMLElement): boolean {
    return (
      el.querySelector("[data-is-streaming='true']") != null ||
      el.querySelector(".cursor-blink, [class*='streaming']") != null ||
      el.closest("[aria-busy='true']") != null
    );
  }

  override getConversationId(): string | null {
    const m = location.pathname.match(/\/chat\/([^/?#]+)/);
    return m ? m[1] : null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function proseChildCount(el: HTMLElement, proseSet: Set<string>): number {
  let n = 0;
  for (const c of Array.from(el.children)) {
    if (proseSet.has(c.tagName)) n++;
  }
  return n;
}

/**
 * Given a list of elements that may be nested inside each other,
 * keep only the outermost ones (i.e. drop any element that is a
 * descendant of another element in the list).
 */
function deduplicateToOutermost(els: HTMLElement[]): HTMLElement[] {
  return els.filter(
    (el) => !els.some((other) => other !== el && other.contains(el)),
  );
}
