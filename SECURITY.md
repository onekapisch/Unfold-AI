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
- No secret or API key is required. Environment files, local package-manager configuration, credential exports, and private-key formats are explicitly ignored.
- Release archives are assembled from explicit production allowlists.
- Production has no npm runtime dependencies. The complete npm tree reports zero known vulnerabilities as of 2026-09-04.
- GitHub secret scanning and push protection are enabled for the public repository.

## Repository hygiene

- Synthetic provider fixtures must never contain real conversations, account details, or customer data.
- Internal analytics, adoption targets, competitive notes, and agent execution plans do not belong in the public tree.
- Store media belongs in `assets/store/`; generated builds, archives, browser profiles, coverage, and local output remain ignored.
- Dependency updates are checked weekly and every push runs the same lint, type, test, build, and package-validation gate used locally.

## Retention

Settings and saved insights remain until the user deletes them or removes the extension. Uninstall behavior is browser-controlled. Unfold has no remote backup and cannot recover deleted local records.

## Vulnerability reporting

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/onekapisch/Unfold-AI/security/advisories/new). Do not include real private conversation text; use a minimal synthetic reproduction.
