import { describe, expect, it, vi } from "vitest";
import type { WebExtensionApi } from "../../platform/webExtension";
import { normalizeSettings, subscribeSettings } from "./storage";

describe("normalizeSettings", () => {
  it("migrates v1 presets and collapse behavior", () => {
    expect(
      normalizeSettings({
        defaultPreset: "standard",
        autoCollapse: true,
        enabledProviders: { chatgpt: false },
      }),
    ).toMatchObject({
      schemaVersion: 2,
      defaultPreset: "balanced",
      autoUnfold: true,
      preferBuiltInSummary: true,
      enabledProviders: { chatgpt: false, claude: true },
    });
  });

  it("rejects unknown presets and clamps the activation threshold", () => {
    expect(normalizeSettings({ defaultPreset: "turbo", lengthThreshold: 5 })).toMatchObject({
      defaultPreset: "balanced",
      lengthThreshold: 60,
    });
    expect(normalizeSettings({ lengthThreshold: 10_000 }).lengthThreshold).toBe(1200);
  });
});

describe("subscribeSettings", () => {
  it("normalizes matching storage changes and unsubscribes", () => {
    let emit: ((changes: Record<string, { newValue?: unknown }>, area: string) => void) | undefined;
    const unsubscribe = vi.fn();
    const api: WebExtensionApi = {
      async storageGet<T>() { return undefined as T | undefined; },
      async storageSet() { return undefined; },
      async storageRemove() { return undefined; },
      storageSubscribe(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) {
        emit = listener;
        return unsubscribe;
      },
      async runtimeSendMessage<T>() { return undefined as T | undefined; },
      async openExtensionPage() { return undefined; },
      getManifestVersion() { return undefined; },
      isExtensionContext() { return true; },
    };
    const listener = vi.fn();

    const stop = subscribeSettings(listener, api);
    emit?.({ "lar:settings": { newValue: { enabled: false, defaultPreset: "quick" } } }, "local");

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      defaultPreset: "focus",
    }));
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
