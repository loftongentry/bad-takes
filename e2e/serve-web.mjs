// Builds the app for the web, pointed at the test backend, and serves it (with single-page-app
// fallback to index.html). Playwright starts this before the tests; see playwright.config.ts.
// Set SKIP_WEB_BUILD=1 to serve the previous build again without rebuilding.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, ".web-build");
const port = Number(process.env.WEB_PORT);
const graphqlUrl = process.env.EXPO_PUBLIC_GRAPHQL_URL;

if (!process.env.SKIP_WEB_BUILD) {
  fs.rmSync(out, { recursive: true, force: true });
  // One command string through the shell, so `npx` resolves on Windows too
  const build = spawnSync(`npx expo export --platform web --output-dir "${out}"`, {
    cwd: path.join(here, "../frontend"),
    // EXPO_PUBLIC_GRAPHQL_URL from the environment wins over frontend/.env
    env: { ...process.env, CI: "1", EXPO_PUBLIC_GRAPHQL_URL: graphqlUrl },
    stdio: "inherit",
    shell: true,
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".css": "text/css",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = path.join(out, urlPath);
    if (!file.startsWith(out) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(out, "index.html");
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Serving the web build on http://localhost:${port}`));
