import { defineConfig } from "@playwright/test";

// Ports of their own, so the tests can run alongside `npm run dev` (3500 and 8081)
const BACKEND_PORT = 3598;
const WEB_PORT = 3597;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "tests",
  // Whole games with real timers (countdowns, a 30-second writing clock) take a while
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: CI ? 2 : 3,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 420, height: 900 },
  },
  webServer: [
    {
      // The backend (needs Redis: `npm run redis:up` from the repo root)
      command: "npx tsx src/index.ts",
      cwd: "../backend",
      env: { PORT: String(BACKEND_PORT) },
      url: `http://localhost:${BACKEND_PORT}/health`,
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      // A production web build of the app, pointed at that backend
      command: "node serve-web.mjs",
      env: {
        WEB_PORT: String(WEB_PORT),
        EXPO_PUBLIC_GRAPHQL_URL: `http://localhost:${BACKEND_PORT}/graphql`,
      },
      url: `http://localhost:${WEB_PORT}`,
      timeout: 600_000,
      reuseExistingServer: false,
    },
  ],
});
