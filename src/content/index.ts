import { getActiveAdapter } from "@providers/providerRegistry";
import { loadConversationState, loadSettings } from "@core/state/storage";
import { enhanceMessage } from "./enhancer";
import { initShortcuts } from "./shortcuts";
import styles from "./styles.css?inline";

function injectStyles() {
  if (document.getElementById("lar-styles")) return;
  const style = document.createElement("style");
  style.id = "lar-styles";
  style.textContent = styles;
  document.documentElement.appendChild(style);
}

/** Returns false once the extension has been reloaded/unloaded. */
function isContextAlive(): boolean {
  try {
    // Prefer browser.* (Firefox native); fall back to chrome.* (Chrome/Arc/Dia).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (globalThis as any).browser ?? (typeof chrome !== "undefined" ? chrome : undefined);
    return !!api?.runtime?.id;
  } catch {
    return false;
  }
}

async function main() {
  const adapter = getActiveAdapter();
  if (!adapter) return;
  injectStyles();

  const settings = await loadSettings();
  if (!isContextAlive()) return;
  if (!settings.enabled) return;
  if (!settings.enabledProviders[adapter.id]) return;

  if (settings.keyboardShortcuts) initShortcuts();

  let lastConversationId = adapter.getConversationId();
  let convState = lastConversationId
    ? await loadConversationState(adapter.id, lastConversationId)
    : null;

  const scan = async () => {
    // Stop everything if the extension was reloaded — prevents the flood of
    // "Extension context invalidated" errors from lingering setTimeout/observers.
    if (!isContextAlive()) return;

    const currentConv = adapter.getConversationId();
    if (currentConv !== lastConversationId) {
      lastConversationId = currentConv;
      convState = currentConv ? await loadConversationState(adapter.id, currentConv) : null;
    }

    const messages = adapter.findAssistantMessages(document);
    messages.forEach((msg, idx) => {
      const id = adapter.getMessageStableId(msg, idx);
      const restore = convState?.messages[id];
      try {
        enhanceMessage(
          { adapter, settings, messageEl: msg, messageId: id, conversationId: lastConversationId },
          restore,
        );
      } catch (err) {
        console.warn("[unfold-ai] enhance failed", err);
      }
    });
  };

  let trailing: number | null = null;
  const scheduleTrailing = () => {
    if (trailing != null) window.clearTimeout(trailing);
    trailing = window.setTimeout(() => {
      trailing = null;
      void scan();
    }, 750);
  };

  const mutationObs = adapter.observeRoot(document, () => {
    if (!isContextAlive()) { mutationObs.disconnect(); return; }
    void scan();
    scheduleTrailing();
  });

  void scan();
  setTimeout(scan, 500);
}

void main();
