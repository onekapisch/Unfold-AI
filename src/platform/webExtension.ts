export type StorageChangeSet = Record<string, { oldValue?: unknown; newValue?: unknown }>;
export type StorageChangeListener = (changes: StorageChangeSet, areaName: string) => void;

interface PromiseStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(value: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

interface CallbackStorageArea {
  get(key: string, callback: (value: Record<string, unknown>) => void): void;
  set(value: Record<string, unknown>, callback: () => void): void;
  remove(key: string, callback: () => void): void;
}

interface ChangeEvent {
  addListener(listener: StorageChangeListener): void;
  removeListener(listener: StorageChangeListener): void;
}

interface BrowserLike {
  runtime?: {
    id?: string;
    sendMessage?(message: unknown): Promise<unknown>;
    getURL?(path: string): string;
    getManifest?(): { version?: string };
  };
  storage?: { local?: PromiseStorageArea; onChanged?: ChangeEvent };
  tabs?: { create?(options: { url: string }): Promise<unknown> };
}

interface ChromeLike {
  runtime?: {
    id?: string;
    lastError?: { message?: string };
    sendMessage?(message: unknown, callback: (response: unknown) => void): void;
    getURL?(path: string): string;
    getManifest?(): { version?: string };
  };
  storage?: { local?: CallbackStorageArea; onChanged?: ChangeEvent };
  tabs?: { create?(options: { url: string }, callback?: () => void): void };
}

interface StorageFallback {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface ExtensionScope {
  browser?: unknown;
  chrome?: unknown;
  localStorage?: StorageFallback;
}

export interface WebExtensionApi {
  storageGet<T>(key: string): Promise<T | undefined>;
  storageSet<T>(key: string, value: T): Promise<void>;
  storageRemove(key: string): Promise<void>;
  storageSubscribe(listener: StorageChangeListener): () => void;
  runtimeSendMessage<T>(message: unknown): Promise<T | undefined>;
  openExtensionPage(path: string): Promise<void>;
  getManifestVersion(): string | undefined;
  isExtensionContext(): boolean;
}

function currentScope(): ExtensionScope {
  const globals = globalThis as typeof globalThis & {
    browser?: unknown;
    chrome?: unknown;
    localStorage?: StorageFallback;
  };
  return {
    browser: globals.browser,
    chrome: globals.chrome,
    localStorage: globals.localStorage,
  };
}

export function createWebExtensionApi(scope: ExtensionScope = currentScope()): WebExtensionApi {
  const browser = scope.browser as BrowserLike | undefined;
  const chromeApi = scope.chrome as ChromeLike | undefined;
  const useBrowser = Boolean(browser?.runtime?.id && browser.storage?.local);
  const useChrome = !useBrowser && Boolean(chromeApi?.runtime?.id && chromeApi.storage?.local);

  return {
    async storageGet<T>(key: string) {
      if (useBrowser) {
        try {
          const result = await browser!.storage!.local!.get(key);
          return result[key] as T | undefined;
        } catch {
          return undefined;
        }
      }
      if (useChrome) {
        return new Promise<T | undefined>((resolve) => {
          try {
            chromeApi!.storage!.local!.get(key, (result) => {
              resolve(chromeApi!.runtime?.lastError ? undefined : result[key] as T | undefined);
            });
          } catch {
            resolve(undefined);
          }
        });
      }
      try {
        const raw = scope.localStorage?.getItem(key);
        return raw ? JSON.parse(raw) as T : undefined;
      } catch {
        return undefined;
      }
    },

    async storageSet<T>(key: string, value: T) {
      if (useBrowser) {
        await browser!.storage!.local!.set({ [key]: value });
        return;
      }
      if (useChrome) {
        await new Promise<void>((resolve) => {
          try {
            chromeApi!.storage!.local!.set({ [key]: value }, resolve);
          } catch {
            resolve();
          }
        });
        return;
      }
      scope.localStorage?.setItem(key, JSON.stringify(value));
    },

    async storageRemove(key: string) {
      if (useBrowser) {
        await browser!.storage!.local!.remove(key);
        return;
      }
      if (useChrome) {
        await new Promise<void>((resolve) => {
          try {
            chromeApi!.storage!.local!.remove(key, resolve);
          } catch {
            resolve();
          }
        });
        return;
      }
      scope.localStorage?.removeItem(key);
    },

    storageSubscribe(listener) {
      const event = useBrowser ? browser?.storage?.onChanged : chromeApi?.storage?.onChanged;
      event?.addListener(listener);
      return () => event?.removeListener(listener);
    },

    async runtimeSendMessage<T>(message: unknown) {
      if (useBrowser && browser?.runtime?.sendMessage) {
        try {
          return await browser.runtime.sendMessage(message) as T;
        } catch {
          return undefined;
        }
      }
      if (useChrome && chromeApi?.runtime?.sendMessage) {
        return new Promise<T | undefined>((resolve) => {
          try {
            chromeApi.runtime!.sendMessage!(message, (response) => {
              resolve(chromeApi.runtime?.lastError ? undefined : response as T);
            });
          } catch {
            resolve(undefined);
          }
        });
      }
      return undefined;
    },

    async openExtensionPage(path: string) {
      const runtime = useBrowser ? browser?.runtime : chromeApi?.runtime;
      const url = runtime?.getURL?.(path) ?? path;
      if (useBrowser && browser?.tabs?.create) {
        await browser.tabs.create({ url });
      } else if (useChrome && chromeApi?.tabs?.create) {
        chromeApi.tabs.create({ url });
      } else if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener");
      }
    },

    getManifestVersion() {
      const runtime = useBrowser ? browser?.runtime : chromeApi?.runtime;
      return runtime?.getManifest?.().version;
    },

    isExtensionContext() {
      return Boolean(useBrowser ? browser?.runtime?.id : chromeApi?.runtime?.id);
    },
  };
}

export const webExtension = createWebExtensionApi();
