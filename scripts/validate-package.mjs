import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const archives = [
  { browser: "Chrome", path: join(root, "release", `unfold-ai-chrome-v${packageJson.version}.zip`), manifestVersion: 3 },
  { browser: "Firefox", path: join(root, "release", `unfold-ai-firefox-v${packageJson.version}.zip`), manifestVersion: 2 },
];
const forbidden = [/(^|\/)\.env/, /\.map$/, /manifest-firefox\.json$/, /(^|\/)preview/, /(^|\/)fixtures/, /(^|\/)docs/, /(^|\/)node_modules/];

for (const archive of archives) {
  if (statSync(archive.path).size > 5 * 1024 * 1024) throw new Error(`${archive.browser} archive unexpectedly exceeds 5 MB`);
  const listing = spawnSync("unzip", ["-Z1", archive.path], { encoding: "utf8" });
  if (listing.status !== 0) throw new Error(`${archive.browser} archive cannot be read`);
  const files = listing.stdout.trim().split("\n").filter(Boolean);
  const required = ["manifest.json", "background.js", "content.js", "privacy.html"];
  required.forEach((file) => { if (!files.includes(file)) throw new Error(`${archive.browser} archive is missing ${file}`); });
  const violation = files.find((file) => forbidden.some((pattern) => pattern.test(file)));
  if (violation) throw new Error(`${archive.browser} archive contains forbidden file: ${violation}`);

  const manifestResult = spawnSync("unzip", ["-p", archive.path, "manifest.json"], { encoding: "utf8" });
  const manifest = JSON.parse(manifestResult.stdout);
  if (manifest.version !== packageJson.version || manifest.manifest_version !== archive.manifestVersion) {
    throw new Error(`${archive.browser} manifest/version mismatch`);
  }
  console.log(`${archive.browser}: ${files.length} allowlisted files, ${(statSync(archive.path).size / 1024).toFixed(1)} KB`);
}
