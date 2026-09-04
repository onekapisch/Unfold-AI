# Unfold AI 2.0 Product and Technical Design

**Status:** Approved direction, prepared for founder review  
**Date:** 2026-09-04  
**Product title:** Unfold AI — Summarize & Navigate AI Answers

## 1. Product decision

Unfold 2.0 is a focused AI answer reader. It does not become a general-purpose chat organizer or a second chat application. Its primary job is to turn a long, completed AI answer into a trustworthy summary, a navigable semantic map, and progressive reading layers while keeping the original answer intact.

The release must provide at least twice the practical value of 1.0 through five connected capabilities:

1. A genuine local summary with transparent engine labeling.
2. A clickable Answer Map for headings and meaningful sections.
3. Deterministic views for actions, sources, and code.
4. Local Saved insights with search, copy, deletion, and export.
5. Reliable cross-provider behavior on Chrome first and Firefox second.

The permanent product advantages are privacy, immediacy, low friction, and respect for the host AI interface.

## 2. Scope and release boundary

### Included in 2.0

- Chrome Manifest V3 production build.
- Firefox production build using the shared product core and the Firefox-compatible background lifecycle.
- ChatGPT, Claude, Gemini, Grok, Perplexity, DeepSeek, and Manus adapters.
- Automatic transformation only after a long response finishes generating.
- Untouched short responses.
- On-device Chrome Summarizer API integration when supported and ready.
- Deterministic extractive summary fallback for unsupported Chrome devices and Firefox.
- Answer Map with Outline, Actions, Sources, and Code views.
- Search within the enhanced answer.
- Progressive reveal, show-next, step-back, show-full, and collapse controls.
- Per-answer and per-section save and copy actions.
- Local Saved insights library with full-text search and Markdown/JSON export.
- Live settings propagation without reloading the AI page.
- First-run onboarding and a provider/status view in the popup.
- Store listing copy and five new 1280x800 screenshots captured from the verified product.
- Chrome and Firefox packages with release-content validation.

### Excluded from 2.0

- Accounts, cloud synchronization, remote databases, or telemetry SDKs.
- Cloud summarization or user-supplied API keys.
- Full conversation folder management, bulk deletion, or prompt libraries.
- Notion, Slack, Google Drive, or other third-party exports.
- Paid plans or payment processing.
- Automatic publishing to Chrome Web Store or Firefox AMO.
- Fabricated summaries, actions, citations, or unsupported-site claims.

## 3. User experience

### 3.1 Activation

Unfold watches supported AI pages through provider adapters. A response is eligible only when:

- the provider is enabled;
- Unfold is enabled for the site;
- streaming has completed;
- the response exceeds the configured word threshold; and
- a renderable content root can be identified with high confidence.

Eligible answers transform automatically. The original DOM content remains the source of truth and can always be restored with **Show full answer**. If any eligibility check fails, Unfold leaves the response untouched.

### 3.2 Inline summary layer

The summary appears above the original answer in a restrained, host-compatible surface. It contains:

- a one-sentence bottom line;
- up to five key points when the source supports them;
- an engine label: **On-device AI summary** or **Local extractive summary**;
- estimated reading time; and
- counts for sections, actions, sources, and code when non-zero.

The interface never describes an extractive lead sentence as an AI-generated summary. While Chrome downloads or initializes its on-device model, Unfold immediately shows the deterministic fallback and offers a non-blocking upgrade state for future answers.

### 3.3 Answer Map

The approved interface is a compact navigation rail beside the current answer, paired with inline reading layers.

- **Outline** lists semantic headings and derived section labels in document order.
- **Actions** lists imperative checklist items and explicit next steps extracted from source sentences.
- **Sources** lists real anchors and citation-like links already present in the answer.
- **Code** lists code blocks using their language and first meaningful line.

Selecting an item reveals its section if necessary, scrolls it into view, and briefly marks it. Search filters the map and highlights literal matches in the original answer. Unfold does not use generative classification for Actions, Sources, or Code in 2.0.

The rail collapses to a narrow edge control. It must not cover the host message composer. Below the minimum safe viewport width, the rail becomes a compact overlay opened only by user action.

### 3.4 Progressive reading

Semantic blocks are grouped without splitting code, tables, lists, media, or heading relationships. The initial visible amount follows the selected preset:

- **Focus:** summary plus the first semantic section.
- **Balanced:** summary plus the first two semantic sections.
- **Full context:** summary plus the complete original answer.

Controls use explicit labels: **Show next section**, **Previous section**, **Show full answer**, and **Collapse answer**. Keyboard shortcuts require an explicit modifier or Answer Map focus; Unfold never consumes ordinary arrow keys globally.

### 3.5 Saved insights

Users can save a complete answer or one semantic section. A saved record contains:

- a generated local identifier;
- provider name;
- conversation URL;
- page/conversation title when available;
- section title;
- exact saved text;
- source timestamp;
- optional user-authored note; and
- schema version.

Saved content is stored in extension-owned IndexedDB. The library is available from the popup and a dedicated extension page. It supports local full-text search, provider filtering, copy, note editing, single-item deletion, delete-all with confirmation, Markdown export, and JSON backup/restore. Nothing is synchronized or transmitted.

## 4. Visual system

The memorable element is the Answer Map: a precise dark ink rail that feels like a reading instrument rather than a generic floating card.

### Palette

- **Ink:** `#111A2B` — map and high-emphasis controls.
- **Paper:** `#F7F9FC` — extension-page background.
- **Surface:** `#FFFFFF` — primary light surface.
- **Signal blue:** `#557FE4` — current position and primary action.
- **Reading blue:** `#EEF4FF` — summary context.
- **Mint:** `#4BC8A0` — success and local/private status only.

Dark mode uses the same ink family with accessible light text and avoids decorative gradients behind reading content. Glass treatment is reserved for popup and overlay surfaces; inline answer content stays visually quiet and legible.

### Typography

- DM Sans for interface and body text.
- DM Serif Display only for onboarding and Saved insights empty-state headlines.
- JetBrains Mono for shortcut labels, code metadata, and counts.

Fonts are bundled with the extension and loaded locally. No remote font request is permitted.

### Interaction and motion

- One orchestrated reveal when a completed answer first transforms.
- Motion communicates expansion, collapse, selection, or saved state.
- No continuous decorative animation.
- `prefers-reduced-motion` removes nonessential transitions.
- All controls expose visible hover, active, disabled, and keyboard-focus states.

## 5. Technical architecture

### 5.1 Shared core

The shared TypeScript core is divided into focused units:

- provider detection and DOM adaptation;
- semantic document construction;
- summary strategies and selection;
- Answer Map model construction;
- progressive-visibility state;
- Saved insights messaging and persistence;
- platform API abstraction; and
- UI rendering in isolated Shadow DOM roots.

The existing provider registry remains the integration boundary. Provider-specific selectors and streaming rules stay outside the core semantic and UI modules.

### 5.2 Summary strategy

A `SummaryEngine` interface returns content, engine type, readiness state, and errors.

Chrome selection order:

1. Use the built-in Summarizer API when feature detection succeeds and availability is ready.
2. When the model is downloadable, request creation only after user activation, show download progress in settings, and continue using the fallback until ready.
3. Use the local extractive engine when the API is unavailable, fails, times out, rejects the language, or the answer exceeds a safe processing bound.

Firefox uses the extractive engine in 2.0. The fallback ranks source sentences using heading proximity, early-position weight, repeated significant terms, list membership, sentence completeness, and redundancy removal. It must only return source-derived text.

### 5.3 DOM isolation and lifecycle

Unfold UI is rendered in Shadow DOM attached to extension-owned host elements. Original response nodes receive only namespaced state attributes and visibility classes. Teardown removes all extension hosts, attributes, highlights, observers, and hidden-state changes.

Each enhanced response owns an abortable lifecycle. Re-rendered or detached provider nodes cancel summary work and observers. A bounded mutation scheduler prevents repeated full-document scans.

### 5.4 Persistence and messages

Extension background code owns the Saved insights IndexedDB database. Content scripts use validated message payloads for create, query, update, delete, export, and import operations. Runtime validation rejects malformed or oversized data before persistence.

Settings remain in extension local storage and are propagated through storage-change events. Saved insight text is size-limited per record and globally guarded against uncontrolled growth; export and deletion remain available when the soft limit is reached.

Chrome and Firefox use a typed platform wrapper rather than direct API calls throughout feature modules.

## 6. Failure behavior

- Unsupported or changed provider DOM: leave content untouched and report a local adapter-health message in the popup.
- Streaming status uncertainty: wait; never collapse partially generated output.
- Built-in model unavailable: use extractive summary and label it accurately.
- Model download pending: show progress only in an explicit user-initiated surface.
- Summary timeout or error: show the extractive summary without an alarming interruption.
- Empty semantic map: keep summary and original answer; do not render an empty rail.
- Detached response during processing: abort and remove temporary UI.
- Storage soft limit reached: preserve existing records, block only the new save, and offer export/manage actions.
- Invalid JSON import: reject before database mutation and explain the required schema.
- Export failure: retain data and offer retry; never delete after export automatically.

## 7. Accessibility and compatibility

- Semantic buttons, navigation landmarks, headings, tabs, status messages, and dialogs.
- Full keyboard operation with no unmodified global shortcuts.
- Focus restoration after rail collapse, dialogs, and saved-item actions.
- Screen-reader names that describe the affected answer or section.
- Minimum WCAG AA contrast for text and interactive states.
- Usable at 200% browser zoom and down to a 375px-wide viewport.
- Reduced-motion support.
- Chrome, Edge, Brave, Opera, and other Chromium browsers inherit the Chrome build where compatible.
- Firefox receives explicit package and runtime verification rather than assumed parity.

## 8. Security and privacy

- No remote code, analytics SDK, external API, authentication, or data sale.
- No conversation text in logs, exceptions, URLs, or store analytics.
- Host permissions remain limited to explicitly supported AI origins.
- The broad `x.com` permission is retained only if the Grok adapter is verified there; otherwise it is removed before release.
- Imported backups are parsed as data and rendered as text, never HTML.
- Exported Markdown escapes metadata and does not execute page content.
- Content Security Policy remains extension-safe and disallows remote scripts.
- Release packaging uses an explicit allowlist so mockups, private briefs, raw screenshots, source maps, and development files cannot enter store archives.

## 9. Verification strategy

### Unit tests

- semantic block classification;
- chunk boundaries and presets;
- extractive-summary ranking, deduplication, and fidelity;
- outline labels and stable identifiers;
- action/source/code extraction;
- settings migrations and validation;
- saved-record validation, search, import, and export;
- Chrome/Firefox platform wrapper behavior.

### DOM integration tests

- completed versus streaming responses;
- live settings enable/disable and provider toggles;
- Answer Map navigation and search;
- progressive visibility and full restoration;
- React-style node replacement and teardown;
- keyboard focus and shortcut scoping;
- Shadow DOM style isolation.

### Browser verification

- load the unpacked Chrome build and run all core flows against deterministic local provider fixtures;
- inspect the popup, onboarding, Saved insights page, narrow overlay, dark mode, reduced motion, and 200% zoom;
- repeat the same product flows using the Firefox package;
- verify no console errors, remote requests, or leaked answer text;
- perform targeted live-site smoke checks where authentication and site access permit.

### Release gates

- TypeScript passes with zero errors.
- Lint passes with zero warnings.
- All unit and integration tests pass.
- Chrome and Firefox builds complete.
- Package allowlist validation passes.
- Both archives contain only intended production files.
- Version and store copy agree on capabilities.
- Five screenshots come from the verified Chrome 2.0 build at 1280x800.
- Screenshots show real product states and do not imply unsupported behavior.
- Firefox visual parity screenshots are retained as internal evidence.

## 10. Store presentation

### Title

**Unfold AI — Summarize & Navigate AI Answers**

### Core promise

Turn long ChatGPT, Claude, and Gemini answers into a private summary and clickable Answer Map—without sending conversations anywhere.

### Screenshot narrative

1. **Understand the answer in seconds** — summary plus original response.
2. **Jump to any section** — expanded Answer Map with current-section highlight.
3. **Find actions, sources, and code** — deterministic filter views.
4. **Save the insight, not the whole chat** — Saved insights library and search.
5. **Private by design** — local engine status, provider controls, and no-account message.

Store screenshots use real extension UI and a deterministic local demo conversation so personal chats, account details, browser profiles, and third-party trademarks are not exposed unnecessarily.

## 11. Success criteria

The build is complete only when:

- a first-time user can understand the primary action from the first screenshot and onboarding screen;
- a long fixture answer transforms after streaming completion and can be fully restored;
- summaries are accurate about their engine and derived content;
- every Answer Map item navigates to real source content;
- saved items survive restart and can be searched, exported, restored, and deleted;
- disabling Unfold immediately restores affected pages;
- Chrome and Firefox pass the same functional acceptance matrix;
- release archives contain no private or development artifacts; and
- the store listing makes no claim that the shipped build cannot demonstrate.

Market success is evaluated after release using aggregate page views, installs, uninstalls, and installed-user metrics. No user-content telemetry is added to obtain those measurements.
