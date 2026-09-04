import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const release = join(root, "release");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const output = join(release, `unfold-ai-chrome-v${packageJson.version}.zip`);
const allowlist = ["manifest.json", "background.js", "content.js", "privacy.html", "icons", "assets", "chunks", "src"];

mkdirSync(release, { recursive: true });
rmSync(output, { force: true });
const result = spawnSync("zip", ["-q", "-r", output, ...allowlist], { cwd: dist, stdio: "inherit" });
if (result.status !== 0) throw new Error("Chrome archive creation failed");
console.log(`Created ${output}`);
