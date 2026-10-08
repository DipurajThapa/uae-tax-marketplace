import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const DB = process.env.E2E_DATABASE_URL ?? "postgresql://app:app@localhost:5432/marketplace_e2e";
// Use the preinstalled Chromium when present (sandboxed environments); CI installs its own.
const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;

const env = {
  DATABASE_URL: DB,
  APP_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef",
  SITE_URL: `http://localhost:${PORT}`,
  ALLOW_INDEXING: "false",
  ALLOW_SYNTHETIC_DATA: "false",
  MAIL_TRANSPORT: "outbox-file",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure", launchOptions: { executablePath } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } }, grep: /@mobile/ },
  ],
  webServer: {
    // Fixtures load first, so the server never sees a half-built database.
    command: `npx tsx e2e/fixtures.ts && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env,
  },
});

export { env as e2eEnv };
