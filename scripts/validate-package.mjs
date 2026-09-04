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
const requiredIcons = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };

function readPngDimensions(buffer, label) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${label} is not a valid PNG`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

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

  const action = manifest.action ?? manifest.browser_action;
  for (const [size, path] of Object.entries(requiredIcons)) {
    if (manifest.icons?.[size] !== path || action?.default_icon?.[size] !== path || !files.includes(path)) {
      throw new Error(`${archive.browser} does not consistently reference ${size}px icon ${path}`);
    }
    const iconResult = spawnSync("unzip", ["-p", archive.path, path]);
    if (iconResult.status !== 0) throw new Error(`${archive.browser} archive cannot read ${path}`);
    const dimensions = readPngDimensions(iconResult.stdout, `${archive.browser} ${path}`);
    if (dimensions.width !== Number(size) || dimensions.height !== Number(size)) {
      throw new Error(`${archive.browser} ${path} is ${dimensions.width}x${dimensions.height}, expected ${size}x${size}`);
    }
  }
  console.log(`${archive.browser}: ${files.length} allowlisted files, ${(statSync(archive.path).size / 1024).toFixed(1)} KB`);
}
