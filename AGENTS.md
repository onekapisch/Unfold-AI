# Unfold AI Engineering Guide

## Product

Unfold AI is a local-first Chrome and Firefox extension that summarizes and maps long AI answers. The original response is always the source of truth and must always be recoverable.

## Stack

- TypeScript strict mode
- Vite multi-entry builds
- Vitest with JSDOM
- Chrome Manifest V3 and Firefox Manifest V2
- Native WebExtension APIs and IndexedDB
- No runtime frameworks, remote code, analytics SDKs, or cloud AI

## Architecture

- `src/providers/` owns provider-specific DOM and streaming detection.
- `src/core/` owns provider-neutral document, summary, navigation, settings, and persistence models.
- `src/content/` owns lifecycle and isolated Shadow DOM presentation.
- `src/background/` owns extension-only persistence and message routing.
- `src/popup/`, `src/onboarding/`, and `src/saved/` are extension pages.
- `preview/` is deterministic marketing capture source and is never packaged.

## Design system

- Ink `#111A2B`
- Paper `#F7F9FC`
- Surface `#FFFFFF`
- Signal blue `#557FE4`
- Reading blue `#EEF4FF`
- Mint `#4BC8A0`
- DM Sans for interface copy, DM Serif Display for limited editorial moments, JetBrains Mono for code and counts
- Inline reading UI is restrained; glass surfaces are limited to popup and overlays.
- Preserve visible focus, reduced motion, forced colors, 200% zoom, and 375px behavior.

## Code rules

- Write a failing test before new behavior.
- No `any`, remote scripts, source-content `innerHTML`, or production `console.log`.
- Keep provider selectors out of shared core modules.
- Validate every runtime message and imported record.
- Leave a page untouched when provider confidence is insufficient.
- Do not add dependencies for behavior available in the platform.

## Commands

```bash
npm test
npm run lint
npm run type-check
npm run build
npm run build:firefox
npm run verify
```

## Release boundary

Chrome is implemented and verified first. Firefox parity follows against the same acceptance matrix. Packaging must use an explicit allowlist, and publishing requires separate founder authorization.
