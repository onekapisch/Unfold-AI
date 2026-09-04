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

declare var Summarizer:
  | import("./core/summary/summaryEngine").BuiltInSummarizerFactory
  | undefined;
