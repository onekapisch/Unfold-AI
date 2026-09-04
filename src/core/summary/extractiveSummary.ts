import { normalizeText } from "../dom";
import type { SemanticDocument, SummaryOutput } from "../types";

const WORDS_PER_MINUTE = 230;
const MAX_KEY_POINTS = 5;

const FILLER = [
  /^(great|good|excellent|interesting) question[!.]?$/i,
  /^(sure|certainly|of course|absolutely)[!.]?$/i,
  /^here (is|are|'s) (a )?(brief|quick|short|detailed|comprehensive )?(overview|summary|answer|breakdown)[.:]?$/i,
  /^let['’]?s (take a look|dive in|explore|break .* down)[!.]?$/i,
  /^happy to help[!.]?$/i,
];

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "being", "between",
  "could", "from", "have", "here", "into", "more", "most", "only", "other",
  "should", "than", "that", "their", "there", "these", "they", "this", "through",
  "using", "very", "what", "when", "where", "which", "while", "with", "would",
]);

interface Candidate {
  text: string;
  position: number;
  listItem: boolean;
  recommendationContext: boolean;
  terms: string[];
}

function splitSentences(text: string): string[] {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“‘])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isFiller(text: string): boolean {
  return FILLER.some((pattern) => pattern.test(text.trim()));
}

function significantTerms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{3,}/g) ?? [])
    .filter((word) => !STOP_WORDS.has(word));
}

function collectCandidates(document: SemanticDocument): Candidate[] {
  const candidates: Candidate[] = [];
  let position = 0;

  for (const section of document.sections) {
    const recommendationContext = /recommend|decision|conclusion|bottom line/i.test(section.title);
    for (const block of section.blocks) {
      if (block.kind === "list") {
        const items = Array.from(block.el.querySelectorAll(":scope > li"));
        for (const item of items) {
          const text = normalizeText(item.textContent ?? "");
          if (text.length > 0) {
            candidates.push({
              text,
              position: position++,
              listItem: true,
              recommendationContext,
              terms: significantTerms(text),
            });
          }
        }
        continue;
      }
      if (!["paragraph", "blockquote", "other"].includes(block.kind)) continue;
      for (const text of splitSentences(block.text)) {
        if (text.length < 12 || isFiller(text)) continue;
        candidates.push({
          text,
          position: position++,
          listItem: false,
          recommendationContext,
          terms: significantTerms(text),
        });
      }
    }
  }

  return candidates;
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(left: Candidate, right: Candidate): number {
  const leftTerms = new Set(left.terms);
  const rightTerms = new Set(right.terms);
  if (leftTerms.size === 0 || rightTerms.size === 0) return 0;
  let intersection = 0;
  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) intersection += 1;
  });
  return intersection / Math.min(leftTerms.size, rightTerms.size);
}

function ensureSentencePunctuation(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function uniqueCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const normalized = normalizeForComparison(candidate.text);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function selectKeyPoints(
  candidates: Candidate[],
  bottomLine: Candidate | undefined,
): string[] {
  const listCandidates = uniqueCandidates(candidates.filter((candidate) => candidate.listItem));
  const pool = listCandidates.length > 0 ? listCandidates : uniqueCandidates(candidates);
  const selected: Candidate[] = [];

  for (const candidate of pool) {
    if (bottomLine && normalizeForComparison(candidate.text) === normalizeForComparison(bottomLine.text)) {
      continue;
    }
    if (selected.some((existing) => similarity(existing, candidate) >= 0.75)) continue;
    selected.push(candidate);
    if (selected.length >= MAX_KEY_POINTS) break;
  }

  return selected.map((candidate) => ensureSentencePunctuation(candidate.text));
}

export function summarizeExtractively(document: SemanticDocument): SummaryOutput {
  const candidates = collectCandidates(document);
  const termFrequency = new Map<string, number>();
  candidates.forEach((candidate) => {
    new Set(candidate.terms).forEach((term) => {
      termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);
    });
  });

  const ranked = candidates
    .filter((candidate) => !candidate.listItem)
    .map((candidate) => {
      const wordCount = candidate.text.split(/\s+/).length;
      const domainWeight = candidate.terms.reduce(
        (sum, term) => sum + Math.min(3, termFrequency.get(term) ?? 0),
        0,
      );
      const lengthWeight = wordCount >= 6 && wordCount <= 34 ? 4 : 0;
      const contextWeight = candidate.recommendationContext ? 5 : 0;
      const positionWeight = Math.max(0, 6 - candidate.position * 0.2);
      return { candidate, score: domainWeight + lengthWeight + contextWeight + positionWeight };
    })
    .sort((left, right) => right.score - left.score || left.candidate.position - right.candidate.position);

  const bottomLine = ranked[0]?.candidate ?? candidates[0];
  const links = document.blocks.reduce(
    (count, block) => count + block.el.querySelectorAll("a[href]").length,
    0,
  );

  return {
    engine: "extractive",
    bottomLine: bottomLine ? ensureSentencePunctuation(bottomLine.text) : document.sections[0]?.title ?? "",
    keyPoints: selectKeyPoints(candidates, bottomLine),
    readTimeSec: Math.max(5, Math.round((document.wordCount / WORDS_PER_MINUTE) * 60)),
    counts: {
      sections: document.sections.length,
      actions: 0,
      sources: links,
      code: document.blocks.filter((block) => block.kind === "code").length,
    },
  };
}
