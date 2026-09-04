import { exportJson, exportMarkdown, importJson } from "../core/saved/export";
import type { SavedInsight } from "../core/saved/types";
import { validateSavedInsight } from "../core/saved/validation";
import { webExtension } from "../platform/webExtension";

interface RuntimeResponse { ok: boolean; data?: unknown; error?: string }

const library = document.getElementById("library");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const status = document.getElementById("status");
const search = document.getElementById("search") as HTMLInputElement | null;
const provider = document.getElementById("provider") as HTMLSelectElement | null;
let insights: SavedInsight[] = [];

function announce(message: string): void {
  if (status) status.textContent = message;
}

async function request(message: unknown): Promise<RuntimeResponse> {
  return await webExtension.runtimeSendMessage<RuntimeResponse>(message) ?? { ok: false, error: "Extension storage is unavailable" };
}

function button(label: string, className: string, callback: () => void): HTMLButtonElement {
  const node = document.createElement("button"); node.type = "button"; node.textContent = label; node.className = className; node.addEventListener("click", callback); return node;
}

function filteredInsights(): SavedInsight[] {
  const query = search?.value.trim().toLocaleLowerCase() ?? "";
  const providerId = provider?.value ?? "";
  return insights.filter((insight) => {
    if (providerId && insight.providerId !== providerId) return false;
    if (!query) return true;
    return [insight.pageTitle, insight.sectionTitle, insight.text, insight.note, insight.providerId]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
}

function insightCard(insight: SavedInsight): HTMLElement {
  const article = document.createElement("article");
  const top = document.createElement("div"); top.className = "card-top";
  const providerName = document.createElement("span"); providerName.className = "provider"; providerName.textContent = insight.providerId;
  const date = document.createElement("time"); date.dateTime = new Date(insight.createdAt).toISOString(); date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(insight.createdAt);
  top.append(providerName, date);
  const title = document.createElement("h2"); title.textContent = insight.sectionTitle;
  const page = document.createElement("a"); page.href = insight.conversationUrl; page.target = "_blank"; page.rel = "noopener"; page.textContent = insight.pageTitle;
  const text = document.createElement("blockquote"); text.textContent = insight.text;
  const note = document.createElement("textarea"); note.placeholder = "Add a private note…"; note.value = insight.note; note.maxLength = 4_000; note.setAttribute("aria-label", `Note for ${insight.sectionTitle}`);
  note.addEventListener("change", () => {
    void request({ type: "saved:update-note", id: insight.id, note: note.value }).then((response) => {
      if (response.ok) { insight.note = note.value; announce("Note saved locally"); }
      else announce(response.error ?? "Could not save note");
    });
  });
  const actions = document.createElement("div"); actions.className = "card-actions";
  actions.append(
    button("Copy", "", () => { void navigator.clipboard.writeText(insight.text).then(() => announce("Copied saved text")); }),
    button("Delete", "danger", () => {
      void request({ type: "saved:delete", id: insight.id }).then((response) => {
        if (!response.ok) { announce(response.error ?? "Could not delete insight"); return; }
        insights = insights.filter((item) => item.id !== insight.id); render(); announce("Insight deleted");
      });
    }),
  );
  article.append(top, title, page, text, note, actions);
  return article;
}

function renderProviderOptions(): void {
  if (!provider) return;
  const selected = provider.value;
  const ids = [...new Set(insights.map((insight) => insight.providerId))].sort();
  provider.replaceChildren(new Option("All providers", ""), ...ids.map((id) => new Option(id, id)));
  provider.value = selected;
}

function render(): void {
  const visible = filteredInsights();
  library?.replaceChildren(...visible.map(insightCard));
  if (empty) empty.hidden = insights.length > 0;
  if (library) library.hidden = insights.length === 0;
  if (count) count.textContent = `${visible.length} saved insight${visible.length === 1 ? "" : "s"}`;
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function load(): Promise<void> {
  const response = await request({ type: "saved:list" });
  if (!response.ok || !Array.isArray(response.data)) { announce(response.error ?? "Could not load Saved insights"); return; }
  try { insights = response.data.map(validateSavedInsight); renderProviderOptions(); render(); }
  catch { announce("Stored insights could not be validated"); }
}

search?.addEventListener("input", render);
provider?.addEventListener("change", render);
document.getElementById("export-md")?.addEventListener("click", () => download("unfold-ai-insights.md", exportMarkdown(insights), "text/markdown"));
document.getElementById("backup")?.addEventListener("click", () => download("unfold-ai-backup.json", exportJson(insights), "application/json"));
const restoreFile = document.getElementById("restore-file") as HTMLInputElement | null;
document.getElementById("restore")?.addEventListener("click", () => restoreFile?.click());
restoreFile?.addEventListener("change", () => {
  const file = restoreFile.files?.[0]; if (!file) return;
  void file.text().then(importJson).then(async (records) => {
    const response = await request({ type: "saved:replace", insights: records });
    if (!response.ok) throw new Error(response.error ?? "Restore failed");
    insights = records; renderProviderOptions(); render(); announce("Backup restored locally");
  }).catch((error: unknown) => announce(error instanceof Error ? error.message : "Restore failed"));
});
document.getElementById("delete-all")?.addEventListener("click", () => {
  if (!insights.length || !window.confirm("Delete every Saved insight from this browser?")) return;
  void request({ type: "saved:clear" }).then((response) => { if (response.ok) { insights = []; renderProviderOptions(); render(); announce("All Saved insights deleted"); } });
});

void load();
