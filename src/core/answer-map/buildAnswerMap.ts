import { normalizeText, safeText } from "../dom";
import { fnv1a } from "../hashing";
import type {
  AnswerMapEntry,
  MapEntryKind,
  SemanticDocument,
  SemanticSection,
} from "../types";

const ACTION_VERBS = new Set([
  "add", "apply", "build", "calculate", "check", "choose", "compare", "confirm",
  "create", "define", "document", "enable", "export", "install", "measure", "open",
  "record", "remove", "review", "run", "save", "set", "test", "update", "use", "verify",
]);

function entry(
  document: SemanticDocument,
  section: SemanticSection,
  kind: MapEntryKind,
  label: string,
  sourceEl: HTMLElement,
  index: number,
  href?: string,
): AnswerMapEntry {
  const searchText = normalizeText(`${section.title} ${label} ${sourceEl.textContent ?? ""}`);
  return {
    id: `unfold-map-${fnv1a(`${document.answerId}:${kind}:${index}:${label}:${href ?? ""}`)}`,
    kind,
    sectionId: section.id,
    label,
    searchText,
    sourceEl,
    ...(href ? { href } : {}),
  };
}

function firstWord(text: string): string {
  return text.toLowerCase().match(/[a-z]+/)?.[0] ?? "";
}

function actionItems(section: SemanticSection): HTMLElement[] {
  return section.blocks.flatMap((block) => {
    if (block.kind !== "list") return [];
    return Array.from(block.el.querySelectorAll<HTMLElement>(":scope > li")).filter((item) =>
      ACTION_VERBS.has(firstWord(normalizeText(item.textContent ?? ""))),
    );
  });
}

function safeWebUrl(anchor: HTMLAnchorElement): string | undefined {
  try {
    const url = new URL(anchor.href, document.baseURI);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function codeLabel(block: HTMLElement): string {
  const code = block.matches("code") ? block : block.querySelector<HTMLElement>("code");
  const rawText = code?.textContent ?? block.textContent ?? "";
  const firstLine = safeText(
    rawText.split(/\r?\n/).map(normalizeText).find(Boolean) ?? "Code block",
    54,
  );
  const language =
    block.dataset.language ??
    code?.dataset.language ??
    code?.className.match(/(?:^|\s)language-([\w-]+)/)?.[1] ??
    "Code";
  return `${language} · ${firstLine}`;
}

export function buildAnswerMap(documentModel: SemanticDocument): AnswerMapEntry[] {
  const entries: AnswerMapEntry[] = [];
  let index = 0;

  for (const section of documentModel.sections) {
    const heading = section.blocks.find((block) => block.kind === "heading")?.el;
    const firstSource = heading ?? section.blocks[0]?.el;
    if (!firstSource) continue;
    entries.push(
      entry(documentModel, section, "outline", section.title, firstSource, index++),
    );

    for (const item of actionItems(section)) {
      entries.push(
        entry(
          documentModel,
          section,
          "action",
          safeText(normalizeText(item.textContent ?? ""), 100),
          item,
          index++,
        ),
      );
    }

    for (const block of section.blocks) {
      for (const anchor of Array.from(block.el.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
        const href = safeWebUrl(anchor);
        if (!href) continue;
        const label = safeText(normalizeText(anchor.textContent ?? "") || new URL(href).hostname, 100);
        entries.push(entry(documentModel, section, "source", label, anchor, index++, href));
      }
      if (block.kind === "code") {
        entries.push(
          entry(documentModel, section, "code", codeLabel(block.el), block.el, index++),
        );
      }
    }
  }

  return entries;
}

export function filterAnswerMap(
  entries: AnswerMapEntry[],
  kind: MapEntryKind,
  query: string,
): AnswerMapEntry[] {
  const normalizedQuery = normalizeText(query).toLowerCase();
  return entries.filter(
    (item) =>
      item.kind === kind &&
      (!normalizedQuery || item.searchText.toLowerCase().includes(normalizedQuery)),
  );
}
