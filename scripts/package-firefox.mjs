/**
 * scripts/package-firefox.mjs
 * Builds and packages the Firefox (MV2) extension.
 *
 * Steps:
 *   1. tsc type-check
 *   2. vite build (background + popup) → dist-firefox/
 *   3. vite build content IIFE → dist-firefox/content.js
 *   4. Overwrite dist-firefox/manifest.json with manifest-firefox.json
 *   5. Zip dist-firefox/ → unfold-ai-firefox-v{version}.zip
 *
 * Run via: npm run package:firefox
 */
import { execSync }        from "child_process";
import { readFileSync, copyFileSync, writeFileSync } from "fs";
import { resolve, join, relative } from "path";

const ROOT      = resolve(import.meta.dirname, "..");
const DIST      = join(ROOT, "dist-firefox");
const PKG       = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const VERSION   = PKG.version;
const ZIP_NAME  = `unfold-ai-firefox-v${VERSION}.zip`;
const ZIP_PATH  = join(ROOT, ZIP_NAME);

const run = (cmd) => execSync(cmd, { stdio: "inherit", cwd: ROOT });

console.log("\n📦  Building Firefox extension…\n");

// 1. Type-check
console.log("→ Type-checking…");
run("npx tsc --noEmit");

// 2. Build background + popup into dist-firefox/
console.log("→ Building background + popup…");
run("npx vite build --config vite.firefox.config.ts");

// 3. Build content script IIFE into dist-firefox/
console.log("→ Building content script…");
run("npx vite build --config vite.firefox.content.config.ts");

// 4. Replace the Chrome manifest.json Vite copied from public/ with the MV2 one
console.log("→ Installing MV2 manifest…");
const mv2Manifest = readFileSync(join(ROOT, "public", "manifest-firefox.json"), "utf8");
writeFileSync(join(DIST, "manifest.json"), mv2Manifest, "utf8");

// 5. Zip
console.log("→ Zipping…");
const excludeFlags = "--exclude='*.map' --exclude='*.DS_Store'";
run(`cd "${DIST}" && zip -r "${ZIP_PATH}" . ${excludeFlags}`);

console.log(`\n✅  Firefox package ready: ${relative(ROOT, ZIP_PATH)}`);
console.log(`\nLoad in Firefox: about:debugging → This Firefox → Load Temporary Add-on → select ${ZIP_PATH}\n`);
console.log(`Submit to AMO:   https://addons.mozilla.org/developers/addon/submit/\n`);
