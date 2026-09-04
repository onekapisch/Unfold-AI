# Unfold AI 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a verified Chrome and Firefox 2.0 extension that locally summarizes long AI answers, adds a navigable Answer Map, saves searchable insights, and includes store-ready visual assets.

**Architecture:** Provider adapters produce a shared semantic document model after streaming ends. Pluggable local summary engines and deterministic extractors feed an isolated Shadow DOM interface, while a typed platform layer and background-owned IndexedDB repository provide cross-browser settings and Saved insights.

**Tech Stack:** TypeScript strict mode, Vite, Vitest/JSDOM, native WebExtension APIs, IndexedDB, Chrome built-in Summarizer API with deterministic fallback, Playwright CLI for browser verification and screenshots.

---

## File map

### Product core

- `src/core/types.ts` — shared settings, semantic document, summary, map, and saved-record contracts.
- `src/core/document/semanticDocument.ts` — builds stable sections and exact source references from rendered blocks.
- `src/core/document/semanticDocument.test.ts` — section construction and fidelity tests.
- `src/core/summary/extractiveSummary.ts` — deterministic source-derived ranking fallback.
- `src/core/summary/extractiveSummary.test.ts` — ranking, deduplication, and fidelity tests.
- `src/core/summary/summaryEngine.ts` — engine interface and Chrome built-in/fallback orchestration.
- `src/core/summary/summaryEngine.test.ts` — availability, failure, timeout, and fallback tests.
- `src/core/answer-map/buildAnswerMap.ts` — outline, action, source, and code navigation entries.
- `src/core/answer-map/buildAnswerMap.test.ts` — deterministic extraction tests.

### Platform and persistence

- `src/platform/webExtension.ts` — Promise-based Chrome/Firefox storage, messaging, tabs, and URL helpers.
- `src/platform/webExtension.test.ts` — API selection and error normalization tests.
- `src/core/state/storage.ts` — validated settings migration and live change subscription.
- `src/core/state/storage.test.ts` — v1 migration and bounds tests.
- `src/core/saved/types.ts` — saved-record and message contracts.
- `src/core/saved/validation.ts` — runtime size/schema validation.
- `src/core/saved/export.ts` — safe Markdown/JSON import/export.
- `src/core/saved/savedRepository.ts` — IndexedDB CRUD/search implementation.
- `src/core/saved/savedRepository.test.ts` — CRUD, search, import, and quota behavior.
- `src/background/messageRouter.ts` — validated Saved insights and provider-health message handling.
- `src/background/service-worker.ts` — Chrome MV3 startup plus router.
- `src/background/background-mv2.ts` — Firefox background startup plus router.

### Content experience

- `src/content/index.ts` — controller bootstrap, live settings, scan scheduler, and teardown.
- `src/content/enhancer.ts` — response lifecycle, summary orchestration, visibility state, and save actions.
- `src/content/shortcuts.ts` — modifier/focus-scoped commands.
- `src/content/ui/shadowRoot.ts` — isolated host creation and shared style injection.
- `src/content/ui/summaryCard.ts` — engine-labeled bottom-line UI.
- `src/content/ui/answerMap.ts` — searchable tabs, navigation, and collapsed edge control.
- `src/content/ui/revealBar.ts` — progressive reading actions and progress.
- `src/content/ui/contentStyles.ts` — bundled Shadow DOM tokens and responsive styles.
- `src/content/enhancer.test.ts` — completed-stream, reveal, restore, search, save, and teardown integration tests.

### Extension pages

- `src/popup/popup.html`, `src/popup/popup.ts`, `src/popup/popup.css` — concise status and controls.
- `src/onboarding/onboarding.html`, `src/onboarding/onboarding.ts`, `src/onboarding/onboarding.css` — first-run explanation and on-device model opt-in.
- `src/saved/saved.html`, `src/saved/saved.ts`, `src/saved/saved.css` — Saved insights search/manage/export/import page.
- `src/shared/extension-page.css` — local fonts, palette, focus, and surface primitives.

### Build, fixtures, and release

- `fixtures/providers/*.html` — deterministic long/short/streaming provider fixtures.
- `preview/store-preview.html`, `preview/store-preview.ts`, `preview/store-preview.css` — verified product-state capture canvas using production UI modules.
- `vite.preview.config.ts` — preview-only build excluded from extension packages.
- `scripts/validate-package.mjs` — allowlist, manifest/version, privacy, and forbidden-file checks.
- `scripts/capture-store-assets.mjs` — 1280x800 screenshots and promo assets from the preview build.
- `public/manifest.json`, `public/manifest-firefox.json` — 2.0 metadata and extension pages.
- `vite.config.ts`, `vite.firefox.config.ts` — popup, onboarding, Saved insights, and background entry points.
- `scripts/package.mjs`, `scripts/package-firefox.mjs` — clean allowlisted archives outside build folders.
- `assets/store/screenshots/*.png` — five new Chrome Web Store screenshots.
- `assets/store/promos/*.png` — small and marquee promotional images.
- `STORE_LISTING.md` — accurate 2.0 Chrome and Firefox listing copy.
- `AGENTS.md`, `README.md`, `CHANGELOG.md`, `TODO.md`, `SECURITY.md` — maintained project operating documentation.

---

### Task 1: Establish the 2.0 contracts and quality commands

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `public/manifest.json`
- Modify: `public/manifest-firefox.json`
- Modify: `src/core/types.ts`
- Create: `eslint.config.js`
- Create: `.gitignore`
- Create: `AGENTS.md`
- Create: `README.md`
- Create: `CHANGELOG.md`
- Create: `TODO.md`
- Create: `SECURITY.md`

- [ ] **Step 1: Add explicit quality and browser scripts**

Set version `2.0.0` in `package.json` and add these commands:

```json
{
  "scripts": {
    "lint": "eslint src scripts vite*.ts --max-warnings=0",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc --noEmit && vite build && vite build --config vite.content.config.ts",
    "build:firefox": "tsc --noEmit && vite build --config vite.firefox.config.ts && vite build --config vite.firefox.content.config.ts",
    "build:preview": "vite build --config vite.preview.config.ts",
    "validate:package": "node scripts/validate-package.mjs",
    "capture:store": "node scripts/capture-store-assets.mjs",
    "verify": "npm run lint && npm run type-check && npm test && npm run build && npm run build:firefox && npm run validate:package"
  }
}
```

- [ ] **Step 2: Define v2 settings and product contracts**

Replace the preset contract with:

```ts
export type PresetId = "focus" | "balanced" | "full";
export type SummaryEngineKind = "built-in" | "extractive";
export type MapEntryKind = "outline" | "action" | "source" | "code";

export interface GlobalSettings {
  enabled: boolean;
  enabledProviders: Record<string, boolean>;
  defaultPreset: PresetId;
  autoUnfold: boolean;
  lengthThreshold: number;
  keyboardShortcuts: boolean;
  preferBuiltInSummary: boolean;
  schemaVersion: 2;
}
```

Add `SemanticSection`, `SemanticDocument`, `SummaryOutput`, and `AnswerMapEntry` interfaces using stable string identifiers and exact source elements.

- [ ] **Step 3: Configure strict linting**

Use ESLint flat config with TypeScript parser rules for no explicit `any`, no unused values, no floating promises, and no production `console.log`.

- [ ] **Step 4: Create operating documentation**

Document the actual Vite/WebExtension stack, local-only data model, exact commands, Chrome-first/Firefox-second release flow, environment-variable absence, and release archive boundaries. Add `.superpowers/`, `dist/`, `dist-firefox/`, `preview-dist/`, package archives, and Playwright output to `.gitignore` without ignoring `assets/store/`.

- [ ] **Step 5: Install only the lint dependencies and run the baseline gates**

Run:

```bash
npm install --save-dev eslint @eslint/js typescript-eslint
npm run type-check
npm test
```

Expected: existing typecheck and tests pass before behavior changes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json eslint.config.js .gitignore public/manifest.json public/manifest-firefox.json src/core/types.ts AGENTS.md README.md CHANGELOG.md TODO.md SECURITY.md
git commit -m "chore(unfold): establish version 2 contracts"
```

### Task 2: Build the semantic document model

**Files:**
- Create: `src/core/document/semanticDocument.ts`
- Create: `src/core/document/semanticDocument.test.ts`
- Modify: `src/core/chunking/blockClassifier.ts`

- [ ] **Step 1: Write failing section-model tests**

```ts
it("keeps headings with their following blocks", () => {
  const root = fixture(`<h2>Choose a model</h2><p>Start with measured needs.</p><pre><code>run()</code></pre>`);
  const document = buildSemanticDocument(root, "answer-1");
  expect(document.sections).toHaveLength(1);
  expect(document.sections[0].title).toBe("Choose a model");
  expect(document.sections[0].blocks.map((block) => block.kind)).toEqual(["heading", "paragraph", "code"]);
});

it("creates source-faithful labels when headings are absent", () => {
  const root = fixture(`<p>Measure latency before choosing a model. Record the result.</p><p>Compare the total operating cost.</p>`);
  const document = buildSemanticDocument(root, "answer-2");
  expect(document.sections[0].title).toBe("Measure latency before choosing a model");
});
```

- [ ] **Step 2: Run the tests and confirm the missing-module failure**

Run: `npm test -- src/core/document/semanticDocument.test.ts`  
Expected: FAIL because `buildSemanticDocument` does not exist.

- [ ] **Step 3: Implement stable section construction**

Export:

```ts
export function buildSemanticDocument(root: HTMLElement, answerId: string): SemanticDocument;
export function sectionText(section: SemanticSection): string;
export function revealSection(section: SemanticSection): void;
```

Start sections at headings, keep atomic blocks intact, derive missing labels from the first complete source sentence, cap labels at 72 characters, and create IDs from `answerId`, section index, and the existing FNV-1a helper.

- [ ] **Step 4: Run document and existing chunk tests**

Run: `npm test -- src/core/document/semanticDocument.test.ts src/core/chunking/chunker.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/document src/core/chunking/blockClassifier.ts
git commit -m "feat(reader): model answers as semantic sections"
```

### Task 3: Replace the heuristic claim with a faithful extractive summary

**Files:**
- Create: `src/core/summary/extractiveSummary.ts`
- Create: `src/core/summary/extractiveSummary.test.ts`
- Delete: `src/core/summary/heuristicSummary.ts`
- Delete: `src/core/summary/heuristicSummary.test.ts`

- [ ] **Step 1: Write failing source-fidelity tests**

```ts
it("returns only sentences present in the source", () => {
  const document = semanticFixture([
    "Model choice should follow a representative evaluation.",
    "Measure latency and total cost before rollout.",
    "Document the threshold used for approval.",
  ]);
  const output = summarizeExtractively(document);
  expect(document.plainText).toContain(output.bottomLine);
  output.keyPoints.forEach((point) => expect(document.plainText).toContain(point));
});

it("removes repeated and introductory filler sentences", () => {
  const output = summarizeExtractively(fillerFixture());
  expect(output.bottomLine).toBe("Measure latency and total cost before rollout.");
  expect(new Set(output.keyPoints).size).toBe(output.keyPoints.length);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/core/summary/extractiveSummary.test.ts`  
Expected: FAIL because the new engine does not exist.

- [ ] **Step 3: Implement deterministic ranking**

Tokenize significant terms, score sentences for heading proximity, position, list membership, repeated domain terms, and completeness, penalize filler and redundancy, then return:

```ts
return {
  engine: "extractive",
  bottomLine: ranked[0]?.text ?? document.sections[0]?.title ?? "",
  keyPoints: selectNonRedundant(ranked.slice(1), 5),
  readTimeSec: Math.max(5, Math.round(document.wordCount / 230 * 60)),
};
```

- [ ] **Step 4: Run summary tests**

Run: `npm test -- src/core/summary/extractiveSummary.test.ts`  
Expected: PASS with no source-fidelity failures.

- [ ] **Step 5: Commit**

```bash
git add src/core/summary
git commit -m "feat(summary): add source-faithful local summaries"
```

### Task 4: Add the Chrome built-in summary strategy with safe fallback

**Files:**
- Create: `src/core/summary/summaryEngine.ts`
- Create: `src/core/summary/summaryEngine.test.ts`
- Modify: `src/globals.d.ts`

- [ ] **Step 1: Write failing orchestration tests**

```ts
it("uses the built-in summary only when it is available", async () => {
  const engine = createSummaryEngine({ summarizer: readySummarizer("Measured summary") });
  await expect(engine.summarize(documentFixture())).resolves.toMatchObject({ engine: "built-in", bottomLine: "Measured summary" });
});

it("falls back after an API error or timeout", async () => {
  const engine = createSummaryEngine({ summarizer: rejectingSummarizer(), timeoutMs: 20 });
  await expect(engine.summarize(documentFixture())).resolves.toMatchObject({ engine: "extractive" });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/core/summary/summaryEngine.test.ts`  
Expected: FAIL because `createSummaryEngine` does not exist.

- [ ] **Step 3: Implement feature detection and timeout**

Expose `summarize(document, signal)`, `getAvailability()`, and `requestModelDownload(userActivated)` methods. Use `Promise.race` with an abort-aware timeout, pass plain text only, request `type: "tldr"`, `format: "plain-text"`, `length: "short"`, and always fall back without throwing into the host page.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- src/core/summary/summaryEngine.test.ts && npm run type-check`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/summary/summaryEngine.ts src/core/summary/summaryEngine.test.ts src/globals.d.ts
git commit -m "feat(summary): use Chrome on-device summaries when available"
```

### Task 5: Build deterministic Answer Map views

**Files:**
- Create: `src/core/answer-map/buildAnswerMap.ts`
- Create: `src/core/answer-map/buildAnswerMap.test.ts`

- [ ] **Step 1: Write failing extraction tests**

```ts
it("maps exact sections, imperative actions, real links, and code", () => {
  const map = buildAnswerMap(answerMapFixture());
  expect(map.filter((item) => item.kind === "outline")).toHaveLength(3);
  expect(map.find((item) => item.kind === "action")?.label).toBe("Measure latency before rollout");
  expect(map.find((item) => item.kind === "source")?.href).toBe("https://example.com/report");
  expect(map.find((item) => item.kind === "code")?.label).toContain("npm run verify");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/core/answer-map/buildAnswerMap.test.ts`  
Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the four views**

Create exact-source entries with `kind`, `id`, `sectionId`, `label`, `searchText`, optional `href`, and optional source element. Action detection accepts explicit checklist/list items and imperative sentences beginning with a controlled verb set; source entries require valid HTTP(S) anchors; code entries use language metadata and the first meaningful line.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/core/answer-map/buildAnswerMap.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/answer-map
git commit -m "feat(navigation): build deterministic answer maps"
```

### Task 6: Add the typed cross-browser platform and live settings

**Files:**
- Create: `src/platform/webExtension.ts`
- Create: `src/platform/webExtension.test.ts`
- Modify: `src/core/state/storage.ts`
- Create: `src/core/state/storage.test.ts`

- [ ] **Step 1: Write failing migration and subscription tests**

```ts
it("migrates v1 standard settings to v2 balanced settings", async () => {
  seedStoredSettings({ defaultPreset: "standard", autoCollapse: true });
  await expect(loadSettings()).resolves.toMatchObject({ defaultPreset: "balanced", autoUnfold: true, schemaVersion: 2 });
});

it("notifies content controllers when settings change", async () => {
  const listener = vi.fn();
  const unsubscribe = subscribeSettings(listener);
  emitStorageChange({ enabled: false });
  expect(listener).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  unsubscribe();
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/platform/webExtension.test.ts src/core/state/storage.test.ts`  
Expected: FAIL for missing wrapper and subscription.

- [ ] **Step 3: Implement API normalization and validation**

The wrapper must expose `storageGet`, `storageSet`, `storageRemove`, `storageSubscribe`, `runtimeSendMessage`, `runtimeOnMessage`, `openExtensionPage`, and `getManifest`. Remove all explicit `any` uses. Clamp threshold to 60–1200 and reject unknown presets/providers during migration.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- src/platform/webExtension.test.ts src/core/state/storage.test.ts && npm run type-check`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/platform src/core/state
git commit -m "refactor(platform): unify Chrome and Firefox APIs"
```

### Task 7: Implement local Saved insights

**Files:**
- Create: `src/core/saved/types.ts`
- Create: `src/core/saved/validation.ts`
- Create: `src/core/saved/export.ts`
- Create: `src/core/saved/savedRepository.ts`
- Create: `src/core/saved/savedRepository.test.ts`
- Create: `src/background/messageRouter.ts`
- Modify: `src/background/service-worker.ts`
- Modify: `src/background/background-mv2.ts`

- [ ] **Step 1: Write failing validation, CRUD, search, and export tests**

```ts
it("rejects oversized saved text before mutation", () => {
  expect(() => validateSavedInsightInput({ ...validInput, text: "x".repeat(100_001) })).toThrow("Saved text exceeds 100000 characters");
});

it("searches title, text, note, and provider case-insensitively", async () => {
  await repository.create({ ...validInput, title: "Model evaluation", note: "Latency gate" });
  await expect(repository.search("latency")).resolves.toHaveLength(1);
});

it("round-trips a versioned JSON backup", async () => {
  const backup = exportJson([savedRecord]);
  expect(importJson(backup)).toEqual([savedRecord]);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/core/saved/savedRepository.test.ts`  
Expected: FAIL because the repository is absent.

- [ ] **Step 3: Implement repository and message router**

Use database `unfold-ai`, store `insights`, key path `id`, and indexes `createdAt` and `providerId`. Validate all messages with tagged unions before CRUD. Enforce 100,000 characters per item and a 5 MB estimated soft limit. Render imported fields only through `textContent`.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/core/saved/savedRepository.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/saved src/background
git commit -m "feat(saved): add private searchable insights"
```

### Task 8: Build the isolated summary, Answer Map, and reveal UI

**Files:**
- Create: `src/content/ui/shadowRoot.ts`
- Create: `src/content/ui/summaryCard.ts`
- Create: `src/content/ui/answerMap.ts`
- Create: `src/content/ui/revealBar.ts`
- Create: `src/content/ui/contentStyles.ts`
- Modify: `src/content/styles.css`
- Delete: `src/core/ui/header.ts`
- Delete: `src/core/ui/controls.ts`

- [ ] **Step 1: Write failing DOM behavior tests in `src/content/enhancer.test.ts`**

```ts
it("renders production controls inside isolated shadow roots", async () => {
  const result = await enhanceFixture(longCompletedAnswer());
  expect(result.summaryHost.shadowRoot?.querySelector("[data-unfold-summary]")).not.toBeNull();
  expect(result.mapHost.shadowRoot?.querySelector("[role=navigation]")).not.toBeNull();
});

it("reveals and navigates to an originally hidden section", async () => {
  const result = await enhanceFixture(longCompletedAnswer());
  clickMapEntry(result, "Cost guardrails");
  expect(result.section("Cost guardrails").hidden).toBe(false);
  expect(result.section("Cost guardrails").dataset.unfoldCurrent).toBe("true");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/content/enhancer.test.ts`  
Expected: FAIL for missing v2 UI.

- [ ] **Step 3: Implement accessible UI factories**

Each factory returns an element plus an update/destroy handle. Use only DOM creation and `textContent`; do not interpolate source content into `innerHTML`. The Answer Map exposes tabs, search, result count, navigation list, collapsed edge trigger, save-answer control, and narrow overlay dialog. The summary card exposes engine label, bottom line, key points, counts, and read time.

- [ ] **Step 4: Implement the approved visual tokens**

Bundle local DM Sans, DM Serif Display, and JetBrains Mono font assets. Use Ink, Paper, Signal blue, Reading blue, and Mint tokens. Include 375px overlay behavior, 200% zoom safeguards, visible focus, forced-colors support, and reduced-motion rules.

- [ ] **Step 5: Run DOM tests and typecheck**

Run: `npm test -- src/content/enhancer.test.ts && npm run type-check`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/ui src/content/styles.css src/content/enhancer.test.ts src/core/ui
git commit -m "feat(reader): add the Unfold answer map interface"
```

### Task 9: Rebuild the response lifecycle and live teardown

**Files:**
- Modify: `src/content/enhancer.ts`
- Modify: `src/content/index.ts`
- Modify: `src/content/shortcuts.ts`
- Modify: `src/content/enhancer.test.ts`

- [ ] **Step 1: Add failing lifecycle tests**

```ts
it("waits for streaming to finish before transforming", async () => {
  const fixture = streamingAnswer();
  controller.scan();
  expect(fixture.message.hasAttribute("data-unfold-enhanced")).toBe(false);
  fixture.finishStreaming();
  await controller.scanAfterStability();
  expect(fixture.message.dataset.unfoldEnhanced).toBe("true");
});

it("restores every source element when disabled live", async () => {
  const fixture = await enhancedAnswer();
  emitSettings({ enabled: false });
  expect(fixture.hiddenSourceElements()).toHaveLength(0);
  expect(fixture.extensionHosts()).toHaveLength(0);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- src/content/enhancer.test.ts`  
Expected: FAIL for streaming and teardown behavior.

- [ ] **Step 3: Implement completed-response enhancement**

Replace the mid-stream enhancement path with a stable-completion gate. Build the semantic document, fallback summary, map, UI, and visibility state synchronously; upgrade the summary asynchronously only while the response remains connected and its content hash is unchanged.

- [ ] **Step 4: Implement live settings and scoped shortcuts**

Content startup subscribes to settings. Disable/provider-off tears down immediately; preset/threshold changes re-evaluate connected messages. Shortcuts require `Alt+Shift` plus Arrow keys or current Answer Map focus and never fire in editable controls.

- [ ] **Step 5: Run the complete content suite**

Run: `npm test -- src/content src/core && npm run type-check`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content
git commit -m "feat(reader): make unfolding stable and live-configurable"
```

### Task 10: Replace the popup and add onboarding and Saved insights pages

**Files:**
- Modify: `src/popup/popup.html`
- Modify: `src/popup/popup.ts`
- Modify: `src/popup/popup.css`
- Create: `src/onboarding/onboarding.html`
- Create: `src/onboarding/onboarding.ts`
- Create: `src/onboarding/onboarding.css`
- Create: `src/saved/saved.html`
- Create: `src/saved/saved.ts`
- Create: `src/saved/saved.css`
- Create: `src/shared/extension-page.css`
- Modify: `vite.config.ts`
- Modify: `vite.firefox.config.ts`

- [ ] **Step 1: Build the popup information hierarchy**

The first viewport contains product status, current-provider status, master toggle, preset selector, **Open Saved insights**, and **How Unfold works**. Secondary settings contain provider toggles, threshold, shortcut toggle, summary-engine preference/status, privacy, and version.

- [ ] **Step 2: Build first-run onboarding**

Use one interactive answer example to demonstrate Summary → Answer Map → Save. The final action saves onboarding completion and, in Chrome, provides the required user activation to request built-in model availability/download.

- [ ] **Step 3: Build the Saved insights page**

Implement search, provider filter, list/detail selection, note editing, copy, delete, delete-all confirmation, Markdown export, JSON backup, and validated JSON restore. Empty, loading, error, and soft-limit states provide explicit next actions and use skeletons rather than spinners.

- [ ] **Step 4: Add Vite entry points**

Add `onboarding` and `saved` HTML inputs to both browser configurations. Ensure generated asset paths remain extension-relative.

- [ ] **Step 5: Run lint, typecheck, and builds**

Run: `npm run lint && npm run type-check && npm run build && npm run build:firefox`  
Expected: all commands exit zero.

- [ ] **Step 6: Commit**

```bash
git add src/popup src/onboarding src/saved src/shared vite.config.ts vite.firefox.config.ts
git commit -m "feat(extension): add onboarding and saved insights library"
```

### Task 11: Verify provider adapters against deterministic fixtures

**Files:**
- Create: `fixtures/providers/chatgpt.html`
- Create: `fixtures/providers/claude.html`
- Create: `fixtures/providers/gemini.html`
- Create: `fixtures/providers/grok.html`
- Create: `fixtures/providers/perplexity.html`
- Create: `fixtures/providers/deepseek.html`
- Create: `fixtures/providers/manus.html`
- Create: `src/providers/providers.test.ts`
- Modify: `src/providers/*.ts`

- [ ] **Step 1: Add sanitized fixture markup for each provider**

Each fixture includes one user message, one short assistant message, one completed long assistant message with headings/list/link/code, and one streaming assistant message.

- [ ] **Step 2: Write the adapter matrix test**

```ts
it.each(providerCases)("detects only completed assistant content for $id", ({ adapter, fixture }) => {
  document.body.innerHTML = fixture;
  const messages = adapter.findAssistantMessages(document);
  expect(messages).toHaveLength(3);
  expect(adapter.getRenderableContentRoot(messages[1])?.querySelector("h2")?.textContent).toBe("Define the workload");
  expect(adapter.isMessageStreaming(messages[2])).toBe(true);
});
```

- [ ] **Step 3: Run and patch only failing adapters**

Run: `npm test -- src/providers/providers.test.ts`  
Expected: PASS for all seven providers.

- [ ] **Step 4: Commit**

```bash
git add fixtures/providers src/providers
git commit -m "test(providers): add cross-site adapter fixtures"
```

### Task 12: Harden manifests, packaging, and privacy claims

**Files:**
- Modify: `public/manifest.json`
- Modify: `public/manifest-firefox.json`
- Modify: `public/privacy.html`
- Create: `scripts/validate-package.mjs`
- Modify: `scripts/package.mjs`
- Modify: `scripts/package-firefox.mjs`
- Modify: `SECURITY.md`

- [ ] **Step 1: Update both manifests to 2.0.0**

Use the approved title and accurate description. Add the onboarding page as Chrome `runtime.onInstalled` behavior through background code. Keep only `storage` plus explicit supported host permissions. Remove `x.com` unless the Grok adapter test and manual smoke check justify it.

- [ ] **Step 2: Write package validation first**

The validator must fail for any archive containing `.md`, raw screenshots outside store assets, `.map`, source files, fixture files, preview files, `.DS_Store`, nested archives, or `manifest-firefox.json`. It must verify version `2.0.0`, required entry points, no remote script URLs, and identical declared supported origins between manifest/content configuration.

- [ ] **Step 3: Replace recursive in-place zipping with staging allowlists**

Build into `dist`/`dist-firefox`, copy only manifest, background, content, popup/onboarding/saved pages, hashed runtime assets, icons, fonts, and privacy page into temporary staging directories, then produce archives under `release/`.

- [ ] **Step 4: Run package validation**

Run: `npm run package && npm run package:firefox && npm run validate:package`  
Expected: two clean 2.0.0 archives and zero forbidden-file findings.

- [ ] **Step 5: Commit**

```bash
git add public scripts SECURITY.md package.json
git commit -m "build(release): harden cross-browser packages"
```

### Task 13: Build the verified preview and capture store assets

**Files:**
- Create: `preview/store-preview.html`
- Create: `preview/store-preview.ts`
- Create: `preview/store-preview.css`
- Create: `vite.preview.config.ts`
- Create: `scripts/capture-store-assets.mjs`
- Create: `assets/store/screenshots/01-understand.png`
- Create: `assets/store/screenshots/02-navigate.png`
- Create: `assets/store/screenshots/03-filter.png`
- Create: `assets/store/screenshots/04-save.png`
- Create: `assets/store/screenshots/05-private.png`
- Create: `assets/store/promos/unfold-small-440x280.png`
- Create: `assets/store/promos/unfold-marquee-1400x560.png`
- Modify: `STORE_LISTING.md`

- [ ] **Step 1: Build a deterministic capture canvas from production modules**

Render the same summary, map, reveal controls, popup, and Saved insights components used by the extension against a fictional model-evaluation answer. Add capture-state query parameters `understand`, `navigate`, `filter`, `save`, and `private`; do not recreate the UI as unrelated marketing HTML.

- [ ] **Step 2: Generate the brand motif asset**

Use the image-generation skill to create a text-free folded-paper/ribbon motif in the Ink, Signal blue, Reading blue, and Mint palette. Use it only in promo composition, not screenshots of product functionality.

- [ ] **Step 3: Capture five 1280x800 screenshots with Playwright**

For each state, open the preview at a fixed 1280x800 viewport, wait for fonts and the `data-capture-ready` marker, assert no console errors, and save the exact filenames above.

- [ ] **Step 4: Compose promotional images**

Use browser-rendered HTML with the real icon, approved title, one clear benefit line, and the generated motif. Capture 440x280 and 1400x560 PNGs.

- [ ] **Step 5: Review all seven assets visually**

Inspect each output for clipping, blur, inaccurate UI, unsafe account data, illegible type, and inconsistent branding. Recapture any failing asset rather than editing pixels manually.

- [ ] **Step 6: Rewrite store copy**

Keep title concise, summary within 132 characters, description accurate to verified providers, and screenshot captions aligned to the five-file sequence. Remove all v1 claims that are not demonstrated by 2.0.

- [ ] **Step 7: Commit**

```bash
git add preview vite.preview.config.ts scripts/capture-store-assets.mjs assets/store STORE_LISTING.md
git commit -m "feat(marketing): add verified version 2 store assets"
```

### Task 14: Complete Chrome and Firefox browser verification

**Files:**
- Create: `docs/verification/chrome-2.0.md`
- Create: `docs/verification/firefox-2.0.md`
- Create: `docs/verification/release-2.0.md`
- Modify: `CHANGELOG.md`
- Modify: `TODO.md`

- [ ] **Step 1: Run the full automated gate**

Run: `npm run verify`  
Expected: lint, typecheck, tests, Chrome build, Firefox build, and package validation all pass.

- [ ] **Step 2: Verify Chrome with Playwright CLI**

Check `command -v npx`, then use the bundled Playwright wrapper. Load deterministic fixtures and verify transform timing, map tabs, search, navigation, reveal/back/full/collapse, save, popup status, Saved insights CRUD/export, 375px layout, dark mode, reduced motion, 200% zoom, and zero console errors.

- [ ] **Step 3: Verify Firefox parity**

Run the equivalent fixture flows in Firefox. Confirm extractive engine labeling, background persistence, popup, Saved insights, settings propagation, and package manifest behavior.

- [ ] **Step 4: Inspect release archives**

List every archive member and record SHA-256 hashes. Confirm the archive versions, names, manifests, icons, fonts, extension pages, and absence of private/development artifacts.

- [ ] **Step 5: Record honest evidence**

Write tested commands, results, browser/runtime limitations, and any live-site checks to the three verification documents. Do not claim store upload, public deployment, or authenticated-site compatibility that was not directly verified.

- [ ] **Step 6: Update project records**

Add the 2.0 feature/release entry to `CHANGELOG.md`; leave only genuine future work in `TODO.md`.

- [ ] **Step 7: Commit**

```bash
git add docs/verification CHANGELOG.md TODO.md
git commit -m "test(release): verify Unfold AI 2 across browsers"
```

### Task 15: Final review and delivery

**Files:**
- Review: all changed files
- Review: `release/unfold-ai-chrome-v2.0.0.zip`
- Review: `release/unfold-ai-firefox-v2.0.0.zip`
- Review: `assets/store/`

- [ ] **Step 1: Inspect scoped Git changes**

Run: `git status --short`, `git diff main...HEAD --stat`, and `git log --oneline main..HEAD`.  
Expected: only Unfold 2.0-owned files and preserved pre-existing untracked user files.

- [ ] **Step 2: Re-run completion gates from a clean build state**

Run: `npm run verify && npm run capture:store && npm run validate:package`  
Expected: all zero exits and reproducible screenshots/packages.

- [ ] **Step 3: Inspect final screenshots and packages**

Open every PNG at original resolution and list every archive entry. Confirm no clipping, stale v1 copy, profile details, private chats, or unintended files.

- [ ] **Step 4: Deliver the exact outputs**

Report the branch and commits, verified commands, remaining limitations, Chrome package, Firefox package, store copy, screenshots, promotional images, and verification records. Do not push or upload without separate explicit authorization.
