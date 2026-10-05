-- SPEC-0006 RF-2b (TASK-0042): secret of each professional's calendar feed.
-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "calendar_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "professionals_calendar_token_key" ON "professionals"("calendar_token");

