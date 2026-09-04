import { toSemanticBlock } from "../chunking/blockClassifier";
import { directElementChildren, normalizeText, safeText } from "../dom";
import { fnv1a } from "../hashing";
import type { SemanticBlock, SemanticDocument, SemanticSection } from "../types";

const SENTENCE_END = /[.!?](?:\s|$)/;

function sourceLabel(blocks: SemanticBlock[]): string {
  const heading = blocks.find((block) => block.kind === "heading" && block.text.length > 0);
  if (heading) return safeText(heading.text, 72);

  const source = blocks.find((block) => block.text.length > 0)?.text ?? "Answer section";
  const match = SENTENCE_END.exec(source);
  const firstSentence = match ? source.slice(0, match.index + 1) : source;
  return safeText(firstSentence.replace(/[.!?]+$/, ""), 72);
}

function createSection(
  answerId: string,
  index: number,
  blocks: SemanticBlock[],
): SemanticSection {
  const signature = blocks
    .map((block) => `${block.kind}:${block.text.slice(0, 96)}`)
    .join("|");

  return {
    id: `unfold-section-${fnv1a(`${answerId}:${index}:${signature}`)}`,
    index,
    title: sourceLabel(blocks),
    blocks,
    words: blocks.reduce((sum, block) => sum + block.words, 0),
  };
}

export function sectionText(section: SemanticSection): string {
  return section.blocks
    .map((block) => normalizeText(block.text))
    .filter(Boolean)
    .join("\n");
}

export function buildSemanticDocument(
  root: HTMLElement,
  answerId: string,
): SemanticDocument {
  const blocks = Array.from(directElementChildren(root))
    .map(toSemanticBlock)
    .filter((block) => block.text.length > 0 || block.kind === "media");

  const grouped: SemanticBlock[][] = [];
  let current: SemanticBlock[] = [];

  for (const block of blocks) {
    if (block.kind === "heading" && current.length > 0) {
      grouped.push(current);
      current = [];
    }
    current.push(block);
  }
  if (current.length > 0) grouped.push(current);

  const sections = grouped.map((sectionBlocks, index) =>
    createSection(answerId, index, sectionBlocks),
  );
  const plainText = blocks.map((block) => block.text).filter(Boolean).join("\n");
  const wordCount = blocks.reduce((sum, block) => sum + block.words, 0);

  return {
    answerId,
    sections,
    blocks,
    plainText,
    wordCount,
    contentHash: fnv1a(
      blocks.map((block) => `${block.kind}:${block.words}:${block.text}`).join("|"),
    ),
  };
}
