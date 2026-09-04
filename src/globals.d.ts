declare module "*.css?inline" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const url: string;
  export default url;
}

interface WindowOrWorkerGlobalScope {
  Summarizer?: import("./core/summary/summaryEngine").BuiltInSummarizerFactory;
}

declare const Summarizer:
  | import("./core/summary/summaryEngine").BuiltInSummarizerFactory
  | undefined;

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface ServiceWorkerGlobalScope {
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
}

declare const browser: {
  runtime: {
    getURL(path: string): string;
    onMessage: {
      addListener(listener: (message: unknown) => Promise<unknown>): void;
    };
    onInstalled: {
      addListener(listener: (details: { reason: string }) => void): void;
    };
  };
  tabs: { create(options: { url: string }): Promise<unknown> };
};
