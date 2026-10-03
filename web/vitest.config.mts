import "dotenv/config";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// The suite wipes its database, so never let it run against the app database.
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}
if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL");
}
process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    // e2e/ holds Playwright specs (npm run test:e2e), not Vitest tests.
    exclude: [...configDefaults.exclude, "e2e/**"],
    globalSetup: ["./tests/global-setup.ts"],
    env: { DATABASE_URL: testDatabaseUrl },
    // Test files share one database; run them one at a time.
    fileParallelism: false,
  },
});
