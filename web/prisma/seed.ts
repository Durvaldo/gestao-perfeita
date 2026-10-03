// Entry point for `prisma db seed` (configured in prisma7.config.ts).
import "dotenv/config";
import { unscopedDb as db } from "@/lib/db";
import { seed } from "./seed-data";

seed(db)
  .then(() => console.log("Seed completed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
