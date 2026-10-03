// Wipes and seeds the database in DATABASE_URL (the E2E global setup points it at
// TEST_DATABASE_URL). Run with tsx: the generated Prisma client is ESM-only.
import "dotenv/config";
import { unscopedDb as db } from "@/lib/db";
import { seed } from "../prisma/seed-data";

async function main() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
  await seed(db);
}

main()
  .then(() => console.log("E2E database reset and seeded."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
