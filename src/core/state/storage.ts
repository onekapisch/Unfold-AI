import type { ConversationState, GlobalSettings, MessageState } from "../types";
import { DEFAULT_SETTINGS } from "../types";

// chrome.storage wrappers — works in Chrome (callback API) and Firefox
// (Promise-based browser.* API).
//
// Cross-browser strategy:
//   1. Firefox: prefer browser.* (native Promise API). The chrome.* compat
//      shim exists in Firefox but its callback form can silently never fire,
//      hanging any awaiting caller. Always use browser.* first on Firefox.
//   2. Chrome / Arc / Dia: use chrome.* with callback → Promise wrapper.
//   3. Dev / test pages: fall back to localStorage.

const SETTINGS_KEY = "lar:settings";
const CONV_PREFIX = "lar:conv:";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _browser: any = (() => {
  try { return (globalThis as any).browser ?? undefined; } catch { return undefined; }
})();

async function get<T>(key: string): Promise<T | undefined> {
  // ── Firefox: use browser.storage.local (native Promise API) ────────
  if (_browser?.storage?.local && _browser?.runtime?.id) {
    try {
      const res = await (_browser.storage.local.get(key) as Promise<Record<string, T>>);
      return res[key] as T | undefined;
    } catch {
      return undefined;
    }
  }

  // ── Chrome / Arc / Dia: callback → Promise ─────────────────────────
  if (typeof chrome !== "undefined" && chrome?.storage?.local && chrome?.runtime?.id) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(key, (res) => {
          if (chrome.runtime.lastError) { resolve(undefined); return; }
          resolve((res as Record<string, T>)[key] as T | undefined);
        });
      } catch {
        resolve(undefined);
      }
    });
  }

  // ── Fallback: localStorage (dev preview / unit tests) ──────────────
  const raw = globalThis.localStorage?.getItem(key);
  return raw ? (JSON.parse(raw) as T) : undefined;
}

async function set<T>(key: string, value: T): Promise<void> {
  // ── Firefox ─────────────────────────────────────────────────────────
  if (_browser?.storage?.local && _browser?.runtime?.id) {
    try {
      await (_browser.storage.local.set({ [key]: value }) as Promise<void>);
    } catch { /* ignore */ }
    return;
  }

  // ── Chrome / Arc / Dia ──────────────────────────────────────────────
  if (typeof chrome !== "undefined" && chrome?.storage?.local && chrome?.runtime?.id) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) { resolve(); return; }
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }

  // ── Fallback ─────────────────────────────────────────────────────────
  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

export async function loadSettings(): Promise<GlobalSettings> {
  const stored = await get<Partial<GlobalSettings>>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  await set(SETTINGS_KEY, settings);
}

function convKey(providerId: string, conversationId: string): string {
  return `${CONV_PREFIX}${providerId}:${conversationId}`;
}

export async function loadConversationState(
  providerId: string,
  conversationId: string,
): Promise<ConversationState> {
  const existing = await get<ConversationState>(convKey(providerId, conversationId));
  return existing ?? { providerId, conversationId, messages: {} };
}

export async function saveMessageState(
  providerId: string,
  conversationId: string,
  messageId: string,
  state: MessageState,
): Promise<void> {
  const current = await loadConversationState(providerId, conversationId);
  current.messages[messageId] = state;
  await set(convKey(providerId, conversationId), current);

  // Track access order for eviction
  await trackConversationAccess(providerId, conversationId);
}

// ── Storage eviction ──────────────────────────────────────────────────
const ACCESS_KEY = "lar:conv-access-order";
const MAX_CONVERSATIONS = 100;

interface AccessEntry {
  key: string;
  ts: number;
}

async function trackConversationAccess(providerId: string, conversationId: string): Promise<void> {
  try {
    const key = convKey(providerId, conversationId);
    const entries = (await get<AccessEntry[]>(ACCESS_KEY)) ?? [];

    // Remove existing entry for this conversation
    const filtered = entries.filter((e) => e.key !== key);
    filtered.push({ key, ts: Date.now() });

    // Evict oldest if over limit
    if (filtered.length > MAX_CONVERSATIONS) {
      const toRemove = filtered.splice(0, filtered.length - MAX_CONVERSATIONS);
      for (const entry of toRemove) {
        await remove(entry.key);
      }
    }

    await set(ACCESS_KEY, filtered);
  } catch {
    // Eviction is best-effort — never block the main save
  }
}

async function remove(key: string): Promise<void> {
  if (_browser?.storage?.local && _browser?.runtime?.id) {
    try { await (_browser.storage.local.remove(key) as Promise<void>); } catch { /* ignore */ }
    return;
  }
  if (typeof chrome !== "undefined" && chrome?.storage?.local && chrome?.runtime?.id) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(key, () => { resolve(); });
      } catch { resolve(); }
    });
  }
  globalThis.localStorage?.removeItem(key);
}
