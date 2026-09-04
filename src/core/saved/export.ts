import type { SavedInsight, SavedInsightsBackup } from "./types";
import { validateSavedInsight } from "./validation";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function exportJson(insights: SavedInsight[], exportedAt = Date.now()): string {
  const backup: SavedInsightsBackup = { schemaVersion: 1, exportedAt, insights };
  return JSON.stringify(backup, null, 2);
}

export function importJson(raw: string): SavedInsight[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Saved insights backup is not valid JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("schemaVersion" in parsed) ||
    parsed.schemaVersion !== 1 ||
    !("insights" in parsed) ||
    !Array.isArray(parsed.insights)
  ) {
    throw new Error("Unsupported Saved insights backup");
  }
  return parsed.insights.map(validateSavedInsight);
}

export function exportMarkdown(insights: SavedInsight[]): string {
  const sections = insights.map((insight) => {
    const note = insight.note.trim() ? `\n\n**Note:** ${escapeHtml(insight.note)}` : "";
    return [
      `## ${escapeHtml(insight.pageTitle)}`,
      `### ${escapeHtml(insight.sectionTitle)}`,
      `[Open original conversation](${encodeURI(insight.conversationUrl)})${note}`,
      escapeHtml(insight.text),
    ].join("\n\n");
  });
  return ["# Unfold AI Saved Insights", ...sections].join("\n\n---\n\n");
}
