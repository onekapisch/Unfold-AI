// Shared, provider-agnostic types for Layered AI Reader.

export type PresetId = "quick" | "standard" | "deep" | "focus" | "balanced" | "full";

export type BlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "code"
  | "table"
  | "blockquote"
  | "media"
  | "other";

/** A single semantic block extracted from a rendered assistant message. */
export interface SemanticBlock {
  kind: BlockKind;
  /** Original DOM node the block was derived from. */
  el: HTMLElement;
  /** Plain text content, normalized. */
  text: string;
  /** Approximate word count (used for read time + summary weighting). */
  words: number;
  /** True if block must never be split (code, table, media). */
  atomic: boolean;
}

/** A navigable group of source blocks. No generated text is stored here. */
export interface SemanticSection {
  id: string;
  index: number;
  title: string;
  blocks: SemanticBlock[];
  words: number;
}

/** Provider-neutral representation of one rendered assistant answer. */
export interface SemanticDocument {
  answerId: string;
  sections: SemanticSection[];
  blocks: SemanticBlock[];
  plainText: string;
  wordCount: number;
  contentHash: string;
}

/** A chunk is a contiguous run of semantic blocks revealed together. */
export interface Chunk {
  index: number;
  blocks: SemanticBlock[];
  words: number;
}

export interface ChunkPlan {
  chunks: Chunk[];
  /** Blocks that belong to no chunk (e.g. the leading summary source). */
  totalWords: number;
  /** Stable content hash — used to detect re-streamed changes. */
  contentHash: string;
}

export interface SummaryResult {
  /** Short bottom-line sentence. */
  bottomLine: string;
  /** Optional key points (bullets) extracted heuristically. */
  keyPoints: string[];
  /** Estimated read time in seconds for the full message. */
  readTimeSec: number;
  /** Counts of notable block kinds for badges. */
  badges: { code: number; table: number; list: number };
}

export type SummaryEngineKind = "built-in" | "extractive";

export interface SummaryOutput {
  engine: SummaryEngineKind;
  bottomLine: string;
  keyPoints: string[];
  readTimeSec: number;
  counts: {
    sections: number;
    actions: number;
    sources: number;
    code: number;
  };
}

export type MapEntryKind = "outline" | "action" | "source" | "code";

export interface AnswerMapEntry {
  id: string;
  kind: MapEntryKind;
  sectionId: string;
  label: string;
  searchText: string;
  sourceEl: HTMLElement;
  href?: string;
}

export interface GlobalSettings {
  /** Master switch — when false the extension does nothing on any page. */
  enabled: boolean;
  enabledProviders: Record<string, boolean>;
  defaultPreset: PresetId;
  autoCollapse: boolean;
  /** Word count threshold above which a message is considered "long". */
  lengthThreshold: number;
  /** Words revealed per "Show next" click. Overrides preset's chunkWords. */
  revealWords: number;
  revealMode: "chunk" | "full";
  codeBlockMode: "preserve" | "collapse-separately";
  /** Whether keyboard shortcuts are active. */
  keyboardShortcuts: boolean;
  /** Whether completed long answers transform automatically. */
  autoUnfold: boolean;
  /** Prefer Chrome's built-in local model when it is available. */
  preferBuiltInSummary: boolean;
  /** Persisted settings schema used for safe migrations. */
  schemaVersion: 2;
}

export interface MessageState {
  expandedChunks: number;
  isFullyExpanded: boolean;
  isCollapsed: boolean;
}

export interface ConversationState {
  conversationId: string;
  providerId: string;
  messages: Record<string, MessageState>;
}

export interface ProviderAdapter {
  id: string;
  matches(url: URL): boolean;
  getConversationId(): string | null;
  findAssistantMessages(root: Document | HTMLElement): HTMLElement[];
  findUserMessages(root: Document | HTMLElement): HTMLElement[];
  isMessageStreaming(el: HTMLElement): boolean;
  getMessageStableId(el: HTMLElement, index: number): string;
  getRenderableContentRoot(el: HTMLElement): HTMLElement | null;
  observeRoot(root: Document, onPotentialChange: () => void): MutationObserver;
  getTheme(): "light" | "dark" | "unknown";
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  enabled: true,
  enabledProviders: {
    chatgpt: true,
    claude: true,
    gemini: true,
    grok: true,
    manus: true,
    perplexity: true,
    deepseek: true,
  },
  defaultPreset: "balanced",
  autoCollapse: true,
  autoUnfold: true,
  lengthThreshold: 220,
  revealWords: 150,
  revealMode: "chunk",
  codeBlockMode: "preserve",
  keyboardShortcuts: true,
  preferBuiltInSummary: true,
  schemaVersion: 2,
};

export const PRESET_CHUNK_TARGETS: Record<PresetId, { initialChunks: number; chunkWords: number }> = {
  quick: { initialChunks: 1, chunkWords: 90 },
  standard: { initialChunks: 2, chunkWords: 140 },
  deep: { initialChunks: 4, chunkWords: 180 },
  focus: { initialChunks: 1, chunkWords: 110 },
  balanced: { initialChunks: 2, chunkWords: 160 },
  full: { initialChunks: 9999, chunkWords: 220 },
};
