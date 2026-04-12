// DOM utilities shared by core logic. Provider-agnostic.

export function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Walk direct children of a content root, yielding elements only. */
export function* directElementChildren(root: HTMLElement): Generator<HTMLElement> {
  for (const child of Array.from(root.children)) {
    if (child instanceof HTMLElement) yield child;
  }
}

/** Cheap sanitizer for any string we inject into the UI as textContent.
 *  We NEVER use innerHTML with provider content. */
export function safeText(s: string, max = 500): string {
  const t = normalizeText(s);
  return t.length > max ? t.slice(0, max - 1) + "\u2026" : t;
}
