import type { BlockKind, SemanticBlock } from "../types";
import { countWords, normalizeText } from "../dom";

/** Classify a single top-level child of a rendered assistant message. */
export function classifyBlock(el: HTMLElement): BlockKind {
  const tag = el.tagName.toLowerCase();

  // Code: <pre>, or a wrapper containing <pre> (providers often wrap code with toolbars).
  if (tag === "pre" || el.querySelector(":scope > pre") || el.querySelector("pre > code")) {
    return "code";
  }
  if (tag === "table" || el.querySelector(":scope > table")) return "table";
  if (tag === "blockquote") return "blockquote";
  if (tag === "ul" || tag === "ol") return "list";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "p") return "paragraph";
  if (tag === "img" || tag === "figure" || tag === "video") return "media";

  // Wrapper div: look one level deeper before giving up.
  if (tag === "div") {
    const only = el.children.length === 1 ? (el.firstElementChild as HTMLElement | null) : null;
    if (only) return classifyBlock(only);
    if (el.querySelector(":scope > p")) return "paragraph";
    if (el.querySelector(":scope > ul, :scope > ol")) return "list";
  }
  return "other";
}

export function toSemanticBlock(el: HTMLElement): SemanticBlock {
  const kind = classifyBlock(el);
  const text = normalizeText(el.textContent ?? "");
  return {
    kind,
    el,
    text,
    words: countWords(text),
    atomic: kind === "code" || kind === "table" || kind === "media",
  };
}
