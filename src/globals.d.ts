declare module "*.css?inline" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
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
    onMessage: {
      addListener(listener: (message: unknown) => Promise<unknown>): void;
    };
  };
};
