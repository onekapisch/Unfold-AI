import { describe, expect, it, vi } from "vitest";
import { createWebExtensionApi } from "./webExtension";

describe("createWebExtensionApi", () => {
  it("prefers Firefox's promise-based browser API", async () => {
    const browserGet = vi.fn().mockResolvedValue({ setting: "firefox" });
    const chromeGet = vi.fn();
    const api = createWebExtensionApi({
      browser: {
        runtime: { id: "firefox", sendMessage: vi.fn() },
        storage: { local: { get: browserGet, set: vi.fn(), remove: vi.fn() }, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
      },
      chrome: {
        runtime: { id: "chrome", sendMessage: vi.fn() },
        storage: { local: { get: chromeGet, set: vi.fn(), remove: vi.fn() }, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
      },
    });

    await expect(api.storageGet<string>("setting")).resolves.toBe("firefox");
    expect(browserGet).toHaveBeenCalledWith("setting");
    expect(chromeGet).not.toHaveBeenCalled();
  });

  it("normalizes Chrome's callback storage API", async () => {
    const api = createWebExtensionApi({
      chrome: {
        runtime: { id: "chrome", sendMessage: vi.fn(), lastError: undefined },
        storage: {
          local: {
            get: (key: string, callback: (value: Record<string, unknown>) => void) => callback({ [key]: 42 }),
            set: (_value: Record<string, unknown>, callback: () => void) => callback(),
            remove: (_key: string, callback: () => void) => callback(),
          },
          onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
        },
      },
    });

    await expect(api.storageGet<number>("answer")).resolves.toBe(42);
    await expect(api.storageSet("answer", 43)).resolves.toBeUndefined();
    await expect(api.storageRemove("answer")).resolves.toBeUndefined();
  });

  it("falls back to localStorage without an extension context", async () => {
    const localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ enabled: true })),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const api = createWebExtensionApi({ localStorage });

    await expect(api.storageGet<{ enabled: boolean }>("settings")).resolves.toEqual({ enabled: true });
    await api.storageSet("settings", { enabled: false });
    expect(localStorage.setItem).toHaveBeenCalledWith("settings", JSON.stringify({ enabled: false }));
  });
});
