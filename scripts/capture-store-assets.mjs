import { execFile } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const previewRoot = join(root, "preview-dist");
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const screenshots = join(root, "assets", "store", "screenshots");
const promos = join(root, "assets", "store", "promos");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

if (!existsSync(join(previewRoot, "preview", "store-preview.html"))) throw new Error("Run npm run build:preview first");
if (!existsSync(chromePath)) throw new Error("Set CHROME_PATH to a Chromium executable");
mkdirSync(screenshots, { recursive: true }); mkdirSync(promos, { recursive: true });

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const path = normalize(join(previewRoot, pathname));
  if (!path.startsWith(previewRoot) || !existsSync(path) || !statSync(path).isFile()) { response.writeHead(404); response.end(); return; }
  response.setHeader("content-type", types[extname(path)] ?? "application/octet-stream");
  createReadStream(path).pipe(response);
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Preview server failed to start");
const base = `http://127.0.0.1:${address.port}`;

async function capture(url, output, width, height) {
  await run(chromePath, [
    "--headless=new", "--no-first-run", "--hide-scrollbars", "--force-prefers-reduced-motion",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1500", `--window-size=${width},${height}`,
    `--screenshot=${output}`, url,
  ]);
}

try {
  const names = ["01-understand-in-seconds", "02-jump-to-any-section", "03-find-actions-sources-code", "04-saved-insights", "05-private-by-design"];
  for (let index = 0; index < names.length; index += 1) {
    await capture(`${base}/preview/store-preview.html?shot=${index + 1}`, join(screenshots, `${names[index]}.png`), 1280, 800);
  }
  await capture(`${base}/preview/promo.html`, join(promos, "small-440x280.png"), 440, 280);
  await capture(`${base}/preview/promo.html`, join(promos, "marquee-1400x560.png"), 1400, 560);
  console.log("Captured five screenshots and two promotional images");
} finally {
  server.close();
}
