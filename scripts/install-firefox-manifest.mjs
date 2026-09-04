import { copyFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
copyFileSync(join(root, "public", "manifest-firefox.json"), join(root, "dist-firefox", "manifest.json"));
