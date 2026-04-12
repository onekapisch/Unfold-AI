import type { Chunk, ChunkPlan, PresetId, SemanticBlock } from "../types";
import { PRESET_CHUNK_TARGETS } from "../types";
import { directElementChildren } from "../dom";
import { toSemanticBlock } from "./blockClassifier";
import { fnv1a } from "../hashing";

/**
 * Semantic chunker.
 *
 * Rules (from spec §21):
 *  - Never split code blocks, tables, or media (atomic blocks).
 *  - Avoid splitting lists mid-list — a list is one unit unless it alone
 *    already exceeds the target word count.
 *  - Target chunk size is word-based, not pixel-based, so chunks are stable
 *    across zoom / font-size changes.
 *  - A new chunk starts on a heading when possible — headings create natural
 *    reading boundaries.
 */
export function planChunks(
  contentRoot: HTMLElement,
  preset: PresetId,
  revealWordsOverride?: number,
): ChunkPlan {
  const blocks: SemanticBlock[] = [];
  for (const child of directElementChildren(contentRoot)) {
    const block = toSemanticBlock(child);
    if (block.text.length === 0 && block.kind !== "media") continue;
    blocks.push(block);
  }

  const chunkWords = revealWordsOverride ?? PRESET_CHUNK_TARGETS[preset].chunkWords;
  const chunks: Chunk[] = [];
  let current: SemanticBlock[] = [];
  let currentWords = 0;
  let index = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({ index: index++, blocks: current, words: currentWords });
    current = [];
    currentWords = 0;
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    // Headings start a new chunk if we already have content.
    if (b.kind === "heading" && current.length > 0) flush();

    current.push(b);
    currentWords += b.words;

    // Atomic blocks (code/table/media) always finish a chunk — they're the
    // centerpiece, and we never want the next paragraph to hide their header.
    const next = blocks[i + 1];
    const hitTarget = currentWords >= chunkWords;
    const nextIsHeading = next && next.kind === "heading";

    if (b.atomic || hitTarget || nextIsHeading) flush();
  }
  flush();

  const totalWords = blocks.reduce((acc, b) => acc + b.words, 0);
  const hashInput = blocks.map((b) => `${b.kind}:${b.words}:${b.text.slice(0, 64)}`).join("|");
  return { chunks, totalWords, contentHash: fnv1a(hashInput) };
}
