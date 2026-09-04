# Security and Privacy

## Data boundary

Unfold processes rendered AI response text locally in the active tab. It does not send conversation content, prompts, saved text, browsing history, or identifiers to a server.

Saved insights are created only after an explicit user action and remain in extension-owned IndexedDB. Users can export or permanently delete individual records or the full local library.

## Permissions

- `storage` stores settings and reading state.
- Host permissions are limited to the supported AI origins required for content-script injection.
- No remote-code, cookies, history, identity, clipboard-read, or broad browsing permission is used.

## Implementation rules

- Runtime messages and JSON imports are validated before mutation.
- Source content is inserted with `textContent`, never executable HTML.
- Summaries use Chrome's local built-in model when available or a deterministic local extractive fallback.
- No secret or API key is required. `.env.local` remains ignored if introduced for development tooling.
- Release archives are assembled from explicit production allowlists.

## Retention

Settings and saved insights remain until the user deletes them or removes the extension. Uninstall behavior is browser-controlled. Unfold has no remote backup and cannot recover deleted local records.

## Vulnerability reporting

Report reproducible security issues through the support contact listed in the browser store. Do not include real private conversation text; use a minimal synthetic reproduction.
