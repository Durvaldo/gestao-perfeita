import { execSync } from "node:child_process";

// Applies pending migrations to the test database before the suite runs.
// DATABASE_URL already points at TEST_DATABASE_URL here (see vitest.config.mts).
// Data is cleaned per test file with truncateAll() (tests/db.ts), not here.
export default function setup(): void {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
