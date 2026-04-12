import type { Chunk, SemanticBlock, SummaryResult } from "../types";
import { normalizeText, safeText } from "../dom";

// Words-per-minute used for read-time estimates (spec §14.3).
const WPM = 230;

// Filler / hedging phrases AI responses commonly lead with. Stripped
// from the bottom-line because they bury the lede.
const FILLER_PREFIXES = [
  /^(great|good|excellent|interesting)\s+question[!.,]?\s*/i,
  /^(sure|certainly|of course|absolutely)[!.,]?\s*/i,
  /^(happy|glad)\s+to\s+help[!.,]?\s*/i,
  /^let['\u2019]?s\s+(take a look|dive in|explore|break .* down)[!.,]?\s*/i,
  /^here['\u2019]?s\s+(a\s+)?(brief|quick|short|detailed|comprehensive)?\s*(overview|summary|explanation|answer|breakdown)[:.]?\s*/i,
  /^to\s+(answer|address)\s+your\s+question[,:]?\s*/i,
  /^i['\u2019]?ll\s+(explain|walk you through|break this down)[!.,:]?\s*/i,
];

function stripFiller(sentence: string): string {
  let s = sentence;
  for (let i = 0; i < 3; i++) {
    let changed = false;
    for (const rx of FILLER_PREFIXES) {
      const next = s.replace(rx, "");
      if (next !== s) {
        s = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s.trim();
}

/** Split a paragraph into sentences without pulling in an NLP library. */
function splitSentences(text: string): string[] {
  const normalized = normalizeText(text);
  // Split on sentence terminators followed by whitespace + capital letter / digit.
  const parts = normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9"'\u201C\u2018])/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Pick the first block whose text is substantive enough to summarize from. */
function pickLeadBlock(blocks: SemanticBlock[]): SemanticBlock | null {
  for (const b of blocks) {
    if (b.kind === "heading") continue; // headings become context, not bottom line
    if (b.kind === "code" || b.kind === "table" || b.kind === "media") continue;
    if (b.words >= 6) return b;
  }
  return blocks.find((b) => b.words > 0) ?? null;
}

/** Derive up to N key points from early bullets or sentences. */
function extractKeyPoints(blocks: SemanticBlock[], max = 3): string[] {
  // Prefer the first list block.
  const firstList = blocks.find((b) => b.kind === "list");
  if (firstList) {
    const items = Array.from(firstList.el.querySelectorAll(":scope > li"))
      .map((li) => safeText(li.textContent ?? "", 140))
      .filter(Boolean)
      .slice(0, max);
    if (items.length > 0) return items;
  }
  // Otherwise take the first sentences of the first 2-3 paragraphs.
  const points: string[] = [];
  for (const b of blocks) {
    if (points.length >= max) break;
    if (b.kind !== "paragraph") continue;
    const first = splitSentences(b.text)[0];
    if (first) points.push(safeText(first, 140));
  }
  return points;
}

export interface SummaryInput {
  blocks: SemanticBlock[];
  chunks: Chunk[];
}

export function generateHeuristicSummary({ blocks }: SummaryInput): SummaryResult {
  const lead = pickLeadBlock(blocks);
  let bottomLine = "";
  if (lead) {
    const sentences = splitSentences(lead.text);
    // Try the first non-filler sentence; fall back to the second one if the
    // first was pure preamble and got fully stripped.
    for (const s of sentences) {
      const cleaned = stripFiller(s);
      if (cleaned.length >= 12) {
        bottomLine = cleaned;
        break;
      }
    }
    if (!bottomLine && sentences[0]) bottomLine = sentences[0];
  }
  bottomLine = safeText(bottomLine, 220);

  const keyPoints = extractKeyPoints(blocks, 3);

  const totalWords = blocks.reduce((a, b) => a + b.words, 0);
  const readTimeSec = Math.max(5, Math.round((totalWords / WPM) * 60));

  const badges = {
    code: blocks.filter((b) => b.kind === "code").length,
    table: blocks.filter((b) => b.kind === "table").length,
    list: blocks.filter((b) => b.kind === "list").length,
  };

  return { bottomLine, keyPoints, readTimeSec, badges };
}
