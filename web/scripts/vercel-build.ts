// Build command on Vercel (the "vercel-build" script takes precedence over
// "build"). Applies pending migrations on production deploys, then builds.
// A failed migration fails the deploy, so the previous version stays live.
import { spawnSync } from "node:child_process";
import { shouldMigrateOnBuild } from "./migrate-policy";

function run(command: string): void {
  console.log(`> ${command}`);
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (shouldMigrateOnBuild(process.env)) {
  run("prisma migrate deploy");
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
}
run("next build");
