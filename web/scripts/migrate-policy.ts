// When the Vercel build applies pending migrations (ADR-0016). Only production
// deploys migrate: preview deploys share the homolog database, so a branch
// with an unmerged migration must never change it.
export function shouldMigrateOnBuild(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "production";
}
