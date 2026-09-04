import { buildAnswerMap } from "../core/answer-map/buildAnswerMap";
import { buildSemanticDocument, sectionText } from "../core/document/semanticDocument";
import { saveMessageState } from "../core/state/storage";
import { summarizeExtractively } from "../core/summary/extractiveSummary";
import { createSummaryEngine } from "../core/summary/summaryEngine";
import type {
  AnswerMapEntry,
  GlobalSettings,
  MessageState,
  ProviderAdapter,
  SemanticDocument,
  SemanticSection,
} from "../core/types";
import { webExtension } from "../platform/webExtension";
import { mountAnswerExperience, type AnswerExperience } from "./ui/answerExperience";

const ENHANCED_ATTR = "data-unfold-enhanced";
const HIDDEN_ATTR = "data-unfold-hidden";
const HIGHLIGHT_ATTR = "data-unfold-highlight";

interface RuntimeResponse { ok: boolean; error?: string }

export interface ActiveCallbacks {
  onShowNext(): void;
  onExpandAll(): void;
  onCollapse(): void;
  onStepBack(): void;
}

export interface EnhancementContext {
  adapter: ProviderAdapter;
  settings: GlobalSettings;
  messageEl: HTMLElement;
  messageId: string;
  conversationId: string | null;
  sendMessage?: (message: unknown) => Promise<RuntimeResponse | undefined>;
}

interface EnhancementRecord {
  root: HTMLElement;
  host: HTMLElement;
  view: AnswerExperience;
  documentModel: SemanticDocument;
  callbacks: ActiveCallbacks;
  destroySummary(): void;
}

const records = new WeakMap<HTMLElement, EnhancementRecord>();

function wordCount(root: HTMLElement): number {
  const text = root.textContent?.trim() ?? "";
  return text ? text.split(/\s+/).length : 0;
}

function initialSectionCount(settings: GlobalSettings, total: number): number {
  if (settings.defaultPreset === "full") return total;
  if (settings.defaultPreset === "focus") return Math.min(1, total);
  if (settings.defaultPreset === "balanced") return Math.min(2, total);
  return total;
}

function applyVisibility(documentModel: SemanticDocument, visibleSections: number): void {
  documentModel.sections.forEach((section, index) => {
    for (const block of section.blocks) {
      if (index < visibleSections) {
        block.el.removeAttribute(HIDDEN_ATTR);
        block.el.style.removeProperty("display");
      } else {
        block.el.setAttribute(HIDDEN_ATTR, "true");
        block.el.style.setProperty("display", "none", "important");
      }
    }
  });
}

function currentPageTitle(): string {
  return document.title.trim().slice(0, 300) || "AI conversation";
}

export function getCallbacks(messageEl: HTMLElement): ActiveCallbacks | undefined {
  return records.get(messageEl)?.callbacks;
}

export function enhanceMessage(ctx: EnhancementContext, restore?: MessageState): boolean {
  const { adapter, settings, messageEl, messageId, conversationId } = ctx;
  const root = adapter.getRenderableContentRoot(messageEl);
  if (!settings.autoUnfold || !root || adapter.isMessageStreaming(messageEl) || wordCount(root) < settings.lengthThreshold) {
    return false;
  }

  const documentModel = buildSemanticDocument(root, messageId);
  const existing = records.get(messageEl);
  if (existing) {
    if (existing.root === root && existing.documentModel.contentHash === documentModel.contentHash) return false;
    teardownMessage(messageEl, existing.root);
  }
  if (documentModel.sections.length === 0) return false;

  const mapEntries = buildAnswerMap(documentModel);
  const initial = initialSectionCount(settings, documentModel.sections.length);
  const state: MessageState = restore ?? {
    expandedChunks: initial,
    isFullyExpanded: initial >= documentModel.sections.length,
    isCollapsed: false,
  };
  let visible = state.isCollapsed ? 0 : Math.min(Math.max(1, state.expandedChunks), documentModel.sections.length);
  applyVisibility(documentModel, visible);

  const host = document.createElement("unfold-ai-root");
  host.setAttribute("data-unfold-ui", "answer-tools");
  root.before(host);

  const persist = (): void => {
    state.expandedChunks = visible;
    state.isFullyExpanded = visible >= documentModel.sections.length;
    state.isCollapsed = visible === 0;
    if (conversationId) void saveMessageState(adapter.id, conversationId, messageId, state);
  };

  const sync = (): void => {
    applyVisibility(documentModel, visible);
    view.updateProgress(visible, documentModel.sections.length);
    persist();
  };
  const navigate = (entry: AnswerMapEntry): void => {
    const sectionIndex = documentModel.sections.findIndex((section) => section.id === entry.sectionId);
    if (sectionIndex >= 0 && visible <= sectionIndex) visible = sectionIndex + 1;
    sync();
    entry.sourceEl.setAttribute(HIGHLIGHT_ATTR, "true");
    try { entry.sourceEl.scrollIntoView({ behavior: "smooth", block: "center" }); }
    catch { entry.sourceEl.scrollIntoView(); }
    window.setTimeout(() => entry.sourceEl.removeAttribute(HIGHLIGHT_ATTR), 1_400);
  };
  const save = (section?: SemanticSection): void => {
    const input = {
      providerId: adapter.id,
      conversationUrl: location.href,
      pageTitle: currentPageTitle(),
      sectionTitle: section?.title ?? "Complete answer",
      text: section ? sectionText(section) : documentModel.plainText,
      note: "",
    };
    const sender = ctx.sendMessage ?? ((message: unknown) => webExtension.runtimeSendMessage<RuntimeResponse>(message));
    void sender({ type: "saved:create", input }).then((response) => {
      view.announce(response?.ok ? "Saved locally" : response?.error ?? "Could not save insight");
    });
  };

  const callbacks: ActiveCallbacks = {
    onShowNext() { visible = Math.min(documentModel.sections.length, Math.max(1, visible + 1)); sync(); },
    onExpandAll() { visible = documentModel.sections.length; sync(); },
    onCollapse() { visible = visible === 0 ? initial : 0; sync(); },
    onStepBack() { visible = Math.max(1, visible - 1); sync(); },
  };

  const extractive = summarizeExtractively(documentModel);
  const view: AnswerExperience = mountAnswerExperience({
    host,
    documentModel,
    summary: extractive,
    mapEntries,
    callbacks: {
      onShowNext: callbacks.onShowNext,
      onPrevious: callbacks.onStepBack,
      onShowFull: callbacks.onExpandAll,
      onCollapse: callbacks.onCollapse,
      onNavigate: navigate,
      onSave: save,
    },
  });
  view.updateProgress(visible, documentModel.sections.length);

  const summaryEngine = createSummaryEngine({ preferBuiltIn: settings.preferBuiltInSummary });
  void summaryEngine.summarize(documentModel).then((summary) => {
    if (host.isConnected) view.updateSummary(summary);
  });

  records.set(messageEl, {
    root,
    host,
    view,
    documentModel,
    callbacks,
    destroySummary: () => summaryEngine.destroy(),
  });
  messageEl.setAttribute(ENHANCED_ATTR, "true");
  persist();
  return true;
}

export function teardownMessage(messageEl: HTMLElement, root?: HTMLElement): void {
  const record = records.get(messageEl);
  record?.destroySummary();
  record?.view.destroy();
  record?.host.remove();
  const sourceRoot = root ?? record?.root;
  sourceRoot?.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}], [${HIGHLIGHT_ATTR}]`).forEach((node) => {
    node.removeAttribute(HIDDEN_ATTR);
    node.removeAttribute(HIGHLIGHT_ATTR);
    node.style.removeProperty("display");
  });
  messageEl.removeAttribute(ENHANCED_ATTR);
  records.delete(messageEl);
}

export function teardownAll(): void {
  document.querySelectorAll<HTMLElement>(`[${ENHANCED_ATTR}]`).forEach((messageEl) => teardownMessage(messageEl));
}
