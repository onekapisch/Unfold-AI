# Unfold AI

Unfold AI turns long AI answers into a local summary, a clickable Answer Map, and readable sections. It supports Chrome and Firefox without accounts, cloud processing, or conversation telemetry.

## Supported sites

- ChatGPT
- Claude
- Gemini
- Grok
- Perplexity
- DeepSeek
- Manus

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test
npm run build
```

Load `dist/` as an unpacked Chrome extension. Build Firefox with `npm run build:firefox` and load `dist-firefox/manifest.json` from `about:debugging`.

## Verification

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run build:firefox
npm run verify
```

## Environment variables

None. The extension has no server component or API keys.

## Packaging

```bash
npm run package
npm run package:firefox
npm run validate:package
```

Release archives are written to `release/`. Store publication is manual and requires founder approval.

## Privacy

Conversation content is processed in the active tab. A section enters extension-owned IndexedDB only when the user explicitly saves it. See [SECURITY.md](SECURITY.md) and `public/privacy.html`.
