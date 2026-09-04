import { normalizeText, safeText } from "../dom";
import type { SemanticDocument, SummaryOutput } from "../types";
import { summarizeExtractively } from "./extractiveSummary";

export type BuiltInAvailability = "available" | "downloadable" | "unavailable";
export type ModelDownloadResult = "ready" | "unavailable" | "requires-user-activation";

export interface BuiltInSummarizerSession {
  summarize(input: string, options?: { context?: string }): Promise<string>;
  destroy?(): void;
}

export interface BuiltInSummarizerFactory {
  availability(): Promise<BuiltInAvailability>;
  create(options?: {
    type?: "tldr" | "key-points" | "teaser" | "headline";
    format?: "plain-text" | "markdown";
    length?: "short" | "medium" | "long";
    monitor?: (monitor: EventTarget) => void;
  }): Promise<BuiltInSummarizerSession>;
}

export interface SummaryEngine {
  summarize(document: SemanticDocument, signal?: AbortSignal): Promise<SummaryOutput>;
  getAvailability(): Promise<BuiltInAvailability>;
  requestModelDownload(userActivated: boolean): Promise<ModelDownloadResult>;
  destroy(): void;
}

interface SummaryEngineOptions {
  builtIn?: BuiltInSummarizerFactory;
  preferBuiltIn?: boolean;
  timeoutMs?: number;
}

function globalBuiltInFactory(): BuiltInSummarizerFactory | undefined {
  const candidate = globalThis.Summarizer;
  return candidate && typeof candidate.availability === "function" ? candidate : undefined;
}

function timeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error("summary-timeout")), timeoutMs);
    const abort = () => reject(new DOMException("Summary cancelled", "AbortError"));

    if (signal?.aborted) {
      globalThis.clearTimeout(timer);
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });

    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        reject(error instanceof Error ? error : new Error("summary-failed"));
      },
    );
  });
}

export function createSummaryEngine(options: SummaryEngineOptions = {}): SummaryEngine {
  const builtIn = options.builtIn ?? globalBuiltInFactory();
  const preferBuiltIn = options.preferBuiltIn ?? true;
  const timeoutMs = options.timeoutMs ?? 12_000;
  let session: BuiltInSummarizerSession | undefined;

  const createSession = async (): Promise<BuiltInSummarizerSession> => {
    session ??= await builtIn!.create({
      type: "tldr",
      format: "plain-text",
      length: "short",
    });
    return session;
  };

  return {
    async getAvailability() {
      if (!preferBuiltIn || !builtIn) return "unavailable";
      try {
        return await builtIn.availability();
      } catch {
        return "unavailable";
      }
    },

    async requestModelDownload(userActivated) {
      if (!preferBuiltIn || !builtIn) return "unavailable";
      const availability = await this.getAvailability();
      if (availability === "unavailable") return "unavailable";
      if (availability === "downloadable" && !userActivated) {
        return "requires-user-activation";
      }
      try {
        await createSession();
        return "ready";
      } catch {
        return "unavailable";
      }
    },

    async summarize(document, signal) {
      const fallback = summarizeExtractively(document);
      if (!preferBuiltIn || !builtIn) return fallback;

      try {
        const availability = await builtIn.availability();
        if (availability !== "available") return fallback;
        const activeSession = await createSession();
        const result = await timeout(
          activeSession.summarize(document.plainText, {
            context: "Summarize this AI assistant answer faithfully and without adding claims.",
          }),
          timeoutMs,
          signal,
        );
        const bottomLine = safeText(normalizeText(result), 500);
        if (!bottomLine) return fallback;
        return { ...fallback, engine: "built-in", bottomLine };
      } catch {
        return fallback;
      }
    },

    destroy() {
      session?.destroy?.();
      session = undefined;
    },
  };
}
