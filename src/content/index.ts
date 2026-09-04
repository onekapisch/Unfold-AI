import { loadConversationState, loadSettings, subscribeSettings } from "../core/state/storage";
import type { GlobalSettings } from "../core/types";
import { webExtension } from "../platform/webExtension";
import { getActiveAdapter } from "../providers/providerRegistry";
import { enhanceMessage, teardownAll } from "./enhancer";
import { initShortcuts } from "./shortcuts";

async function main(): Promise<void> {
  const adapter = getActiveAdapter();
  if (!adapter || !webExtension.isExtensionContext()) return;

  let settings: GlobalSettings = await loadSettings();
  let lastConversationId = adapter.getConversationId();
  let conversation = lastConversationId
    ? await loadConversationState(adapter.id, lastConversationId)
    : null;
  let disposeShortcuts: (() => void) | undefined;

  const syncShortcuts = (): void => {
    disposeShortcuts?.();
    disposeShortcuts = settings.keyboardShortcuts ? initShortcuts() : undefined;
  };
  syncShortcuts();

  const scan = async (): Promise<void> => {
    if (!webExtension.isExtensionContext()) return;
    if (!settings.enabled || !settings.enabledProviders[adapter.id]) {
      teardownAll();
      return;
    }

    const currentConversationId = adapter.getConversationId();
    if (currentConversationId !== lastConversationId) {
      lastConversationId = currentConversationId;
      conversation = currentConversationId
        ? await loadConversationState(adapter.id, currentConversationId)
        : null;
    }

    adapter.findAssistantMessages(document).forEach((messageEl, index) => {
      const messageId = adapter.getMessageStableId(messageEl, index);
      enhanceMessage(
        {
          adapter,
          settings,
          messageEl,
          messageId,
          conversationId: lastConversationId,
        },
        conversation?.messages[messageId],
      );
    });
  };

  let timer: number | undefined;
  const scheduleScan = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      void scan();
    }, 350);
  };

  const observer = adapter.observeRoot(document, scheduleScan);
  subscribeSettings((nextSettings) => {
    settings = nextSettings;
    teardownAll();
    syncShortcuts();
    scheduleScan();
  });

  window.addEventListener("pagehide", () => {
    observer.disconnect();
    disposeShortcuts?.();
    teardownAll();
  }, { once: true });

  await scan();
}

void main();
