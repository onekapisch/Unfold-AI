import { filterAnswerMap } from "../../core/answer-map/buildAnswerMap";
import type {
  AnswerMapEntry,
  MapEntryKind,
  SemanticDocument,
  SemanticSection,
  SummaryOutput,
} from "../../core/types";
import styles from "./contentStyles.css?inline";

export interface AnswerExperienceCallbacks {
  onShowNext(): void;
  onPrevious(): void;
  onShowFull(): void;
  onCollapse(): void;
  onNavigate(entry: AnswerMapEntry): void;
  onSave(section?: SemanticSection): void;
}

interface MountOptions {
  host: HTMLElement;
  documentModel: SemanticDocument;
  summary: SummaryOutput;
  mapEntries: AnswerMapEntry[];
  callbacks: AnswerExperienceCallbacks;
}

export interface AnswerExperience {
  updateSummary(summary: SummaryOutput): void;
  updateProgress(current: number, total: number): void;
  announce(message: string): void;
  destroy(): void;
}

const TAB_LABELS: Array<[MapEntryKind, string]> = [
  ["outline", "Outline"],
  ["action", "Actions"],
  ["source", "Sources"],
  ["code", "Code"],
];

function element<K extends keyof HTMLElementTagNameMap>(
  name: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, action: string, callback: () => void): HTMLButtonElement {
  const node = element("button", "button", label);
  node.type = "button";
  node.dataset.action = action;
  node.addEventListener("click", callback);
  return node;
}

function engineLabel(engine: SummaryOutput["engine"]): string {
  return engine === "built-in" ? "On-device AI summary" : "Local extractive summary";
}

function countLabel(summary: SummaryOutput): string {
  const labels = [
    `${summary.counts.sections} section${summary.counts.sections === 1 ? "" : "s"}`,
  ];
  if (summary.counts.actions) labels.push(`${summary.counts.actions} actions`);
  if (summary.counts.sources) labels.push(`${summary.counts.sources} sources`);
  if (summary.counts.code) labels.push(`${summary.counts.code} code`);
  return labels.join(" · ");
}

export function mountAnswerExperience(options: MountOptions): AnswerExperience {
  const { host, documentModel, mapEntries, callbacks } = options;
  const shadow = host.attachShadow({ mode: "open" });
  const style = element("style");
  style.textContent = styles;
  shadow.append(style);

  const shell = element("section", "shell");
  shell.setAttribute("aria-label", "Unfold AI answer tools");
  const summary = element("div", "summary");
  const eyebrow = element("div", "eyebrow");
  const mark = element("span", "mark", "U");
  const engine = element("span", "engine", engineLabel(options.summary.engine));
  const privacy = element("span", "privacy", "Private · on device");
  eyebrow.append(mark, engine, privacy);
  const bottomLine = element("p", "bottom-line", options.summary.bottomLine);
  const keyPoints = element("ul", "key-points");
  const meta = element("p", "meta");
  const setSummary = (next: SummaryOutput) => {
    engine.textContent = engineLabel(next.engine);
    bottomLine.textContent = next.bottomLine;
    keyPoints.replaceChildren(...next.keyPoints.map((point) => element("li", "", point)));
    meta.textContent = `${Math.max(1, Math.round(next.readTimeSec / 60))} min full read · ${countLabel(next)}`;
  };
  setSummary(options.summary);
  const summaryActions = element("div", "summary-actions");
  const saveAnswer = button("Save answer", "save", () => callbacks.onSave());
  saveAnswer.classList.add("button-secondary");
  summaryActions.append(saveAnswer);
  summary.append(eyebrow, bottomLine, keyPoints, meta, summaryActions);

  const map = element("nav", "map");
  map.setAttribute("aria-label", "Answer Map");
  const mapHeader = element("div", "map-header");
  const mapTitle = element("div", "map-title", "Answer Map");
  const collapse = button("Collapse", "collapse-map", () => {
    map.classList.toggle("map-collapsed");
    collapse.textContent = map.classList.contains("map-collapsed") ? "Open map" : "Collapse";
    collapse.setAttribute("aria-expanded", String(!map.classList.contains("map-collapsed")));
  });
  collapse.classList.add("button-quiet");
  collapse.setAttribute("aria-expanded", "true");
  mapHeader.append(mapTitle, collapse);

  const tabs = element("div", "tabs");
  tabs.setAttribute("role", "tablist");
  const search = element("input", "search") as HTMLInputElement;
  search.type = "search";
  search.placeholder = "Find in this answer";
  search.setAttribute("aria-label", "Find in this answer");
  const list = element("div", "map-list");
  list.dataset.mapList = "";
  const status = element("p", "status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  let activeKind: MapEntryKind = "outline";

  const renderEntries = () => {
    const matches = filterAnswerMap(mapEntries, activeKind, search.value);
    list.replaceChildren(...matches.map((entry) => {
      const item = element("button", "map-entry");
      item.type = "button";
      item.dataset.mapEntry = entry.id;
      item.append(element("span", "map-dot"), element("span", "map-label", entry.label));
      item.addEventListener("click", () => callbacks.onNavigate(entry));
      return item;
    }));
    status.textContent = matches.length ? "" : "No matching items";
  };

  for (const [kind, label] of TAB_LABELS) {
    const tab = element("button", "tab", label);
    tab.type = "button";
    tab.dataset.tab = kind;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(kind === activeKind));
    tab.addEventListener("click", () => {
      activeKind = kind;
      tabs.querySelectorAll<HTMLElement>("[role='tab']").forEach((item) => {
        item.setAttribute("aria-selected", String(item.dataset.tab === kind));
      });
      renderEntries();
    });
    tabs.append(tab);
  }
  search.addEventListener("input", renderEntries);
  renderEntries();
  map.append(mapHeader, tabs, search, list, status);

  const reader = element("div", "reader");
  const previous = button("Previous section", "previous", callbacks.onPrevious);
  const next = button("Show next section", "next", callbacks.onShowNext);
  next.classList.add("button-primary");
  const full = button("Show full answer", "full", callbacks.onShowFull);
  const collapseAnswer = button("Collapse answer", "collapse", callbacks.onCollapse);
  const progress = element("span", "progress", `1 of ${documentModel.sections.length}`);
  reader.append(previous, next, full, collapseAnswer, progress);

  shell.append(summary, map, reader);
  shadow.append(shell);

  return {
    updateSummary: setSummary,
    updateProgress(current, total) {
      progress.textContent = `${current} of ${total}`;
      previous.disabled = current <= 1;
      next.disabled = current >= total;
    },
    announce(message) {
      status.textContent = message;
    },
    destroy() {
      shadow.replaceChildren();
    },
  };
}
