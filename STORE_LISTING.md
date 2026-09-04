# Unfold AI 2.0 Store Listing

## Product name

Unfold AI — Summarize & Navigate AI Answers

## Chrome short description

Summarize long AI answers locally, jump to any section, and save useful insights without sending conversations anywhere.

## Detailed description

Long AI answers should not feel like walls of text.

Unfold AI adds a private reading layer to supported AI chats. After a long answer finishes, Unfold shows a source-faithful local summary, builds a clickable Answer Map, and lets you reveal the original response at your pace.

UNDERSTAND THE ANSWER

- See one bottom-line sentence and source-derived key points.
- Know whether Chrome’s on-device AI model or the deterministic extractive fallback produced the summary.
- Keep the complete original answer one click away.

NAVIGATE INSTEAD OF SCROLLING

- Jump through a structured Outline.
- Find action items already present in lists.
- Locate real source links and code blocks.
- Search the Answer Map without changing the original answer.

SAVE WHAT MATTERS

- Save exact answer text to a private local library.
- Search saved titles, text, and notes.
- Copy, annotate, delete, export to Markdown, or create and restore a JSON backup.

READ YOUR WAY

- Focus: start with one semantic section.
- Balanced: start with two sections.
- Full context: keep the complete response visible.
- Short answers remain untouched.

SUPPORTED SITES

- ChatGPT
- Claude
- Gemini
- Grok on grok.com
- Perplexity
- DeepSeek
- Manus

PRIVATE BY DESIGN

Unfold AI has no account system, cloud AI service, analytics SDK, advertising, or conversation telemetry. Summaries are processed locally. Saved insights remain in extension-owned browser storage until you export or delete them.

## Category

Productivity

## Single-purpose statement

Unfold AI helps people read long AI assistant answers by creating a local summary, a navigable map of the rendered response, progressive reading controls, and an optional local library for exact saved text.

## Permission justifications

### storage

Stores reading preferences and per-conversation reveal state in browser-local extension storage. Saved insights use extension-owned IndexedDB and are created only after the user selects Save answer.

### Supported-site host permissions

Required to identify completed assistant answers and render the summary, Answer Map, and reading controls on the seven explicitly listed AI origins. Page content is processed locally and is not transmitted.

## Data disclosure

The extension does not collect or transmit user data. It processes rendered page content locally to provide its single purpose. User-selected saved text remains on the device.

## Assets

- Screenshot 1: `assets/store/screenshots/01-understand-in-seconds.png`
- Screenshot 2: `assets/store/screenshots/02-jump-to-any-section.png`
- Screenshot 3: `assets/store/screenshots/03-find-actions-sources-code.png`
- Screenshot 4: `assets/store/screenshots/04-saved-insights.png`
- Screenshot 5: `assets/store/screenshots/05-private-by-design.png`
- Small promo: `assets/store/promos/small-440x280.png`
- Marquee promo: `assets/store/promos/marquee-1400x560.png`

## Release packages

- Chrome: `release/unfold-ai-chrome-v2.0.0.zip`
- Firefox: `release/unfold-ai-firefox-v2.0.0.zip`

Store upload and publication remain manual founder actions. Use a public HTTPS privacy-policy URL in each dashboard; an extension-internal URL is not suitable as the public listing URL.
