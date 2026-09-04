import type { ConversationState, GlobalSettings, MessageState, PresetId } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import {
  webExtension,
  type StorageChangeSet,
  type WebExtensionApi,
} from "../../platform/webExtension";

export const SETTINGS_KEY = "lar:settings";
const CONV_PREFIX = "lar:conv:";
const ACCESS_KEY = "lar:conv-access-order";
const MAX_CONVERSATIONS = 100;
const PROVIDERS = ["chatgpt", "claude", "gemini", "grok", "manus", "perplexity", "deepseek"];

interface AccessEntry {
  key: string;
  ts: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function presetValue(value: unknown): PresetId {
  const migrations: Record<string, PresetId> = {
    quick: "focus",
    standard: "balanced",
    deep: "full",
  };
  if (typeof value !== "string") return "balanced";
  if (value === "focus" || value === "balanced" || value === "full") return value;
  return migrations[value] ?? "balanced";
}

export function normalizeSettings(value: unknown): GlobalSettings {
  const input = isRecord(value) ? value : {};
  const storedProviders = isRecord(input.enabledProviders) ? input.enabledProviders : {};
  const enabledProviders = Object.fromEntries(
    PROVIDERS.map((provider) => [
      provider,
      booleanValue(storedProviders[provider], DEFAULT_SETTINGS.enabledProviders[provider] ?? true),
    ]),
  );
  const autoUnfold = booleanValue(
    input.autoUnfold,
    booleanValue(input.autoCollapse, DEFAULT_SETTINGS.autoUnfold),
  );

  return {
    enabled: booleanValue(input.enabled, DEFAULT_SETTINGS.enabled),
    enabledProviders,
    defaultPreset: presetValue(input.defaultPreset),
    autoUnfold,
    lengthThreshold: numberValue(input.lengthThreshold, DEFAULT_SETTINGS.lengthThreshold, 60, 1200),
    keyboardShortcuts: booleanValue(input.keyboardShortcuts, DEFAULT_SETTINGS.keyboardShortcuts),
    preferBuiltInSummary: booleanValue(
      input.preferBuiltInSummary,
      DEFAULT_SETTINGS.preferBuiltInSummary,
    ),
    schemaVersion: 2,
  };
}

export async function loadSettings(api: WebExtensionApi = webExtension): Promise<GlobalSettings> {
  const stored = await api.storageGet<unknown>(SETTINGS_KEY);
  const settings = normalizeSettings(stored);
  if (!isRecord(stored) || stored.schemaVersion !== 2) {
    await api.storageSet(SETTINGS_KEY, settings);
  }
  return settings;
}

export async function saveSettings(
  settings: GlobalSettings,
  api: WebExtensionApi = webExtension,
): Promise<void> {
  await api.storageSet(SETTINGS_KEY, normalizeSettings(settings));
}

export function subscribeSettings(
  listener: (settings: GlobalSettings) => void,
  api: WebExtensionApi = webExtension,
): () => void {
  return api.storageSubscribe((changes: StorageChangeSet, areaName: string) => {
    if (areaName !== "local") return;
    const next = changes[SETTINGS_KEY]?.newValue;
    if (next !== undefined) listener(normalizeSettings(next));
  });
}

function convKey(providerId: string, conversationId: string): string {
  return `${CONV_PREFIX}${providerId}:${conversationId}`;
}

export async function loadConversationState(
  providerId: string,
  conversationId: string,
  api: WebExtensionApi = webExtension,
): Promise<ConversationState> {
  const existing = await api.storageGet<ConversationState>(convKey(providerId, conversationId));
  return existing ?? { providerId, conversationId, messages: {} };
}

export async function saveMessageState(
  providerId: string,
  conversationId: string,
  messageId: string,
  state: MessageState,
  api: WebExtensionApi = webExtension,
): Promise<void> {
  const current = await loadConversationState(providerId, conversationId, api);
  current.messages[messageId] = state;
  await api.storageSet(convKey(providerId, conversationId), current);
  await trackConversationAccess(providerId, conversationId, api);
}

async function trackConversationAccess(
  providerId: string,
  conversationId: string,
  api: WebExtensionApi,
): Promise<void> {
  const key = convKey(providerId, conversationId);
  const entries = (await api.storageGet<AccessEntry[]>(ACCESS_KEY)) ?? [];
  const filtered = entries.filter((entry) => entry.key !== key);
  filtered.push({ key, ts: Date.now() });

  if (filtered.length > MAX_CONVERSATIONS) {
    const expired = filtered.splice(0, filtered.length - MAX_CONVERSATIONS);
    await Promise.all(expired.map((entry) => api.storageRemove(entry.key)));
  }
  await api.storageSet(ACCESS_KEY, filtered);
}
