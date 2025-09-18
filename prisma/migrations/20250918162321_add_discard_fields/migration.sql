-- AlterTable
ALTER TABLE "saved_sessions" ADD COLUMN "is_discarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "saved_sessions" ADD COLUMN "discarded_at" TIMESTAMP(3);

-- CreateIndex
DROP INDEX IF EXISTS "SavedSession_externalId_isComplete_idx";
CREATE INDEX "SavedSession_externalId_isComplete_isDiscarded_idx" ON "saved_sessions"("external_id", "is_complete", "is_discarded");