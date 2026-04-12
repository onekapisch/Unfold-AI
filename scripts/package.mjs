/**
 * scripts/package.mjs
 * Creates a CWS-ready zip at dist/layered-ai-reader-vX.Y.Z.zip
 * Run via: npm run package
 */
import { readFileSync } from "fs";
import { resolve, join, relative } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const pkg  = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const OUT  = join(DIST, `layered-ai-reader-v${pkg.version}.zip`);

// Simple zip using Node's built-ins (no extra deps)
// We use the native `zip` CLI which is available on macOS/Linux.
import { execSync } from "child_process";

// Exclude source maps from the release zip
const EXCLUDE = ["*.map", "manifest-firefox.json"];

const excludeFlags = EXCLUDE.map((p) => `--exclude='${p}'`).join(" ");
const cmd = `cd "${DIST}" && zip -r "${OUT}" . ${excludeFlags}`;

console.log(`\nPackaging v${pkg.version}…`);
execSync(cmd, { stdio: "inherit" });
console.log(`\n✅  Created: ${relative(ROOT, OUT)}\n`);
console.log(`Upload this file at: https://chrome.google.com/webstore/devconsole\n`);
