/**
 * Keyboard shortcuts.
 *
 * Mac:   ⌘→ show next   ⌘← step back   ⌘↓ expand all   ⌘↑ collapse
 * Win:   Ctrl+→          Ctrl+←          Ctrl+↓           Ctrl+↑
 *
 * On every keydown we find the "active" message by viewport proximity —
 * the enhanced message whose vertical midpoint is closest to the viewport
 * center. This is reliable regardless of whether the reveal bar is visible,
 * hidden, or off-screen.
 */
import { getCallbacks } from "./enhancer";

const ENHANCED_SELECTOR = "[data-lar-enhanced='1']";

function findActiveCallbacks() {
  const messages = Array.from(
    document.querySelectorAll<HTMLElement>(ENHANCED_SELECTOR),
  );
  if (messages.length === 0) return null;

  const viewMid = window.scrollY + window.innerHeight / 2;
  let best: HTMLElement | null = null;
  let bestDist = Infinity;

  for (const msg of messages) {
    const rect = msg.getBoundingClientRect();
    const msgMid = window.scrollY + rect.top + rect.height / 2;
    const dist = Math.abs(msgMid - viewMid);
    if (dist < bestDist) {
      bestDist = dist;
      best = msg;
    }
  }

  return best ? (getCallbacks(best) ?? null) : null;
}

export function initShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    // Never steal keys while the user is typing.
    const target = e.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable
    ) return;

    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    // Only intercept the four arrow keys with modifier.
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;

    const cb = findActiveCallbacks();
    if (!cb) return;

    e.preventDefault();
    switch (e.key) {
      case "ArrowRight": cb.onShowNext();  break;
      case "ArrowLeft":  cb.onStepBack();  break;
      case "ArrowDown":  cb.onExpandAll(); break;
      case "ArrowUp":    cb.onCollapse();  break;
    }
  };

  document.addEventListener("keydown", handler, { capture: true });
  return () => document.removeEventListener("keydown", handler, { capture: true });
}

export const SHORTCUT_LABELS: Array<{ action: string; mac: string; win: string }> = [
  { action: "Show next",  mac: "⌘ →", win: "Ctrl →" },
  { action: "Step back",  mac: "⌘ ←", win: "Ctrl ←" },
  { action: "Expand all", mac: "⌘ ↓", win: "Ctrl ↓" },
  { action: "Collapse",   mac: "⌘ ↑", win: "Ctrl ↑" },
];
