import "dotenv/config";
import { execSync } from "node:child_process";

// Prepares the TEST database for the E2E run: migrations, then wipe + development
// seed (in a tsx subprocess, because the generated Prisma client is ESM-only and
// Playwright loads this file as CommonJS).
export default function globalSetup(): void {
  const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx e2e/reset-test-db.ts", { stdio: "inherit", env });
}
