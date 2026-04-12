import { loadSettings, saveSettings } from "@core/state/storage";
import { SHORTCUT_LABELS } from "../content/shortcuts";
import type { GlobalSettings, PresetId } from "@core/types";

const PROVIDERS: Array<{ id: string; label: string }> = [
  { id: "chatgpt",    label: "ChatGPT"    },
  { id: "claude",     label: "Claude"     },
  { id: "gemini",     label: "Gemini"     },
  { id: "grok",       label: "Grok"       },
  { id: "perplexity", label: "Perplexity" },
  { id: "deepseek",   label: "DeepSeek"   },
  { id: "manus",      label: "Manus"      },
];

const isMac = ((navigator as any).userAgentData?.platform ?? navigator.platform ?? "").includes("Mac");

async function init() {
  const settings = await loadSettings();

  bindMasterToggle(settings);
  renderProviders(settings);
  bindPreset(settings);
  bindRevealWords(settings);
  renderShortcuts();
  bindKbToggle(settings);
  bindThreshold(settings);
  renderVersion();
  applyEnabledState(settings.enabled);
}

// ── Master on/off toggle ─────────────────────────────────────────────
function bindMasterToggle(settings: GlobalSettings) {
  const toggle  = document.getElementById("master-toggle")  as HTMLInputElement;
  const statusEl = document.getElementById("master-status")!;

  toggle.checked = settings.enabled;
  updateMasterUI(settings.enabled, statusEl);

  toggle.addEventListener("change", async () => {
    settings.enabled = toggle.checked;
    await saveSettings(settings);
    updateMasterUI(settings.enabled, statusEl);
    applyEnabledState(settings.enabled);
  });
}

function updateMasterUI(enabled: boolean, statusEl: HTMLElement) {
  statusEl.textContent = enabled ? "Active" : "Paused";
  statusEl.className   = enabled ? "master-status active" : "master-status paused";

  const dot = document.getElementById("status-dot");
  if (dot) dot.className = enabled ? "status-dot on" : "status-dot off";
}

/** Dim the settings body when the extension is globally disabled. */
function applyEnabledState(enabled: boolean) {
  const body = document.getElementById("settings-body");
  if (body) body.style.opacity = enabled ? "" : "0.4";
}

// ── Version ──────────────────────────────────────────────────────────
function renderVersion() {
  const el = document.getElementById("version");
  if (!el) return;
  try {
    // Prefer browser.* (Firefox native); fall back to chrome.* (Chrome/Arc/Dia).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (globalThis as any).browser ?? (typeof chrome !== "undefined" ? chrome : undefined);
    const v = api?.runtime?.getManifest?.()?.version;
    if (v) el.textContent = `v${v}`;
  } catch {
    // Not in extension context (dev preview)
  }
}

// ── Providers ────────────────────────────────────────────────────────
function renderProviders(settings: GlobalSettings) {
  const host = document.getElementById("providers")!;
  for (const p of PROVIDERS) {
    const label = document.createElement("label");
    const cb    = document.createElement("input");
    cb.type    = "checkbox";
    cb.checked = settings.enabledProviders[p.id] ?? true;
    cb.addEventListener("change", async () => {
      settings.enabledProviders[p.id] = cb.checked;
      await saveSettings(settings);
    });
    const span = document.createElement("span");
    span.textContent = p.label;
    label.append(cb, span);
    host.appendChild(label);
  }
}

// ── Reading preset ───────────────────────────────────────────────────
function bindPreset(settings: GlobalSettings) {
  const sel = document.getElementById("preset") as HTMLSelectElement;
  sel.value = settings.defaultPreset;
  sel.addEventListener("change", async () => {
    settings.defaultPreset = sel.value as PresetId;
    await saveSettings(settings);
  });
}

// ── Words per reveal slider ──────────────────────────────────────────
function bindRevealWords(settings: GlobalSettings) {
  const slider   = document.getElementById("reveal-words") as HTMLInputElement;
  const valLabel = document.getElementById("reveal-words-val")!;
  slider.value = String(settings.revealWords);
  valLabel.textContent = `${settings.revealWords} words`;

  slider.addEventListener("input", () => {
    valLabel.textContent = `${slider.value} words`;
  });
  slider.addEventListener("change", async () => {
    settings.revealWords = parseInt(slider.value, 10);
    await saveSettings(settings);
  });
}

// ── Keyboard shortcuts display ───────────────────────────────────────
function renderShortcuts() {
  const host = document.getElementById("shortcuts")!;
  for (const s of SHORTCUT_LABELS) {
    const row = document.createElement("div");
    row.className = "shortcut-row";

    const lbl = document.createElement("span");
    lbl.textContent = s.action;

    const keys = document.createElement("div");
    keys.className = "kbd-group";
    const combo = isMac ? s.mac : s.win;
    for (const key of combo.split(" ")) {
      const kbd = document.createElement("kbd");
      kbd.textContent = key;
      keys.appendChild(kbd);
    }

    row.append(lbl, keys);
    host.appendChild(row);
  }
}

function bindKbToggle(settings: GlobalSettings) {
  const toggle = document.getElementById("kb-toggle") as HTMLInputElement;
  toggle.checked = settings.keyboardShortcuts;
  toggle.addEventListener("change", async () => {
    settings.keyboardShortcuts = toggle.checked;
    await saveSettings(settings);
  });
}

// ── Activation threshold ─────────────────────────────────────────────
function bindThreshold(settings: GlobalSettings) {
  const input = document.getElementById("threshold") as HTMLInputElement;
  input.value = String(settings.lengthThreshold);
  input.addEventListener("change", async () => {
    const v = parseInt(input.value, 10);
    if (!Number.isFinite(v)) return;
    settings.lengthThreshold = Math.max(60, Math.min(1200, v));
    input.value = String(settings.lengthThreshold);
    await saveSettings(settings);
  });
}

void init();
