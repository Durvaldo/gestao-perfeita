import "dotenv/config";
import { defineConfig } from "@playwright/test";

// End-to-end smoke tests (TASK-0019). They run against a separate production
// build on port 3002 using the TEST database (wiped and seeded by global-setup),
// so the dev server (3001) and the dev database are never touched. The installed
// Chrome is used (channel "chrome"), so no browser download is needed.
const PORT = 3002;

if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be set and differ from DATABASE_URL");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    headless: true,
    locale: "pt-BR",
    // Deliberately not the barbershop's zone: the UI must show the barbershop's
    // local time regardless of the browser's time zone (ADR-0009).
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
    },
  },
});
