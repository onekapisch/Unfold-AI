import type { SummaryResult } from "../types";
import { safeText } from "../dom";

/** Builds the bottom-line strip injected above a long assistant message. */
export function buildHeader(summary: SummaryResult, readingTimeLabel: string): HTMLElement {
  const header = document.createElement("div");
  header.className = "lar-header";
  header.setAttribute("role", "region");
  header.setAttribute("aria-label", "Layered AI Reader summary");

  const top = document.createElement("div");
  top.className = "lar-header-top";

  const label = document.createElement("span");
  label.className = "lar-label";
  label.textContent = "Bottom line";
  top.appendChild(label);

  const readTime = document.createElement("span");
  readTime.className = "lar-readtime";
  readTime.textContent = readingTimeLabel;
  top.appendChild(readTime);

  header.appendChild(top);

  const bottomLine = document.createElement("p");
  bottomLine.className = "lar-bottom-line";
  bottomLine.textContent = safeText(summary.bottomLine || "(no summary available)", 280);
  header.appendChild(bottomLine);

  if (summary.keyPoints.length > 0) {
    const keys = document.createElement("ul");
    keys.className = "lar-keypoints";
    for (const kp of summary.keyPoints) {
      const li = document.createElement("li");
      li.textContent = safeText(kp, 160);
      keys.appendChild(li);
    }
    header.appendChild(keys);
  }

  const badges = document.createElement("div");
  badges.className = "lar-badges";
  const add = (label: string, n: number) => {
    if (n <= 0) return;
    const b = document.createElement("span");
    b.className = "lar-badge";
    b.textContent = `${label} \u00B7 ${n}`;
    badges.appendChild(b);
  };
  add("code", summary.badges.code);
  add("table", summary.badges.table);
  add("list", summary.badges.list);
  if (badges.childElementCount > 0) header.appendChild(badges);

  // Collapse toggle lives in the top row, right side.
  // Populated by enhancer after building the header.
  return header;
}

export function readTimeLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s read`;
  const m = Math.round(seconds / 60);
  return `${m} min read`;
}
