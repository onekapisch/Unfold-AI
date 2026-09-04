import { loadSettings, saveSettings } from "../core/state/storage";
import type { GlobalSettings, PresetId } from "../core/types";
import { webExtension } from "../platform/webExtension";

const PROVIDERS: Array<[string, string]> = [
  ["chatgpt", "ChatGPT"], ["claude", "Claude"], ["gemini", "Gemini"],
  ["grok", "Grok"], ["perplexity", "Perplexity"], ["deepseek", "DeepSeek"], ["manus", "Manus"],
];

function required<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing popup element: ${id}`);
  return node as T;
}

function persist(settings: GlobalSettings): void {
  void saveSettings(settings);
}

function setEnabledPresentation(enabled: boolean): void {
  required<HTMLElement>("status-title").textContent = enabled ? "Ready for long answers" : "Paused on every site";
  document.body.classList.toggle("is-paused", !enabled);
}

function renderProviders(settings: GlobalSettings): void {
  const host = required<HTMLElement>("providers");
  host.replaceChildren(...PROVIDERS.map(([id, name]) => {
    const label = document.createElement("label");
    const text = document.createElement("span");
    text.textContent = name;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settings.enabledProviders[id] ?? true;
    input.addEventListener("change", () => {
      settings.enabledProviders[id] = input.checked;
      persist(settings);
    });
    label.append(text, input);
    return label;
  }));
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  const enabled = required<HTMLInputElement>("enabled");
  enabled.checked = settings.enabled;
  setEnabledPresentation(settings.enabled);
  enabled.addEventListener("change", () => {
    settings.enabled = enabled.checked;
    setEnabledPresentation(settings.enabled);
    persist(settings);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((control) => {
    const preset = control.dataset.preset as PresetId;
    control.setAttribute("aria-pressed", String(settings.defaultPreset === preset));
    control.addEventListener("click", () => {
      settings.defaultPreset = preset;
      document.querySelectorAll<HTMLElement>("[data-preset]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === control));
      });
      persist(settings);
    });
  });

  const bindings: Array<[string, keyof Pick<GlobalSettings, "autoUnfold" | "preferBuiltInSummary" | "keyboardShortcuts">]> = [
    ["auto-unfold", "autoUnfold"], ["built-in", "preferBuiltInSummary"], ["keyboard", "keyboardShortcuts"],
  ];
  for (const [id, key] of bindings) {
    const input = required<HTMLInputElement>(id);
    input.checked = settings[key];
    input.addEventListener("change", () => { settings[key] = input.checked; persist(settings); });
  }

  const threshold = required<HTMLInputElement>("threshold");
  threshold.value = String(settings.lengthThreshold);
  threshold.addEventListener("change", () => {
    const candidate = Number.parseInt(threshold.value, 10);
    settings.lengthThreshold = Number.isFinite(candidate) ? Math.max(60, Math.min(1200, candidate)) : 220;
    threshold.value = String(settings.lengthThreshold);
    persist(settings);
  });
  renderProviders(settings);

  required<HTMLElement>("version").textContent = `v${webExtension.getManifestVersion() ?? "2.0.0"}`;
  required<HTMLButtonElement>("open-saved").addEventListener("click", () => { void webExtension.openExtensionPage("src/saved/saved.html"); });
  required<HTMLButtonElement>("open-guide").addEventListener("click", () => { void webExtension.openExtensionPage("src/onboarding/onboarding.html"); });
}

void init();
