-- AlterTable
ALTER TABLE "specifications" ADD COLUMN     "external_id" TEXT NOT NULL DEFAULT 'sreeveTest123',
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "question_counts" (
    "id" TEXT NOT NULL,
    "user_session" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "questions_asked" INTEGER NOT NULL DEFAULT 0,
    "external_id" TEXT NOT NULL DEFAULT 'sreeveTest123',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_sessions" (
    "id" TEXT NOT NULL,
    "user_session" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "session_name" TEXT NOT NULL,
    "session_type" TEXT NOT NULL DEFAULT 'architect',
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completion_message" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intro_briefs" (
    "id" TEXT NOT NULL,
    "user_session" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "what_theyre_doing" TEXT,
    "project_type" TEXT,
    "audience" TEXT,
    "problem" TEXT,
    "timeline" TEXT,
    "team_size" TEXT,
    "current_question" INTEGER NOT NULL DEFAULT 0,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "project_brief" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intro_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_usage" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "usage_type" TEXT NOT NULL,
    "user_session" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,

    CONSTRAINT "tool_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_counts_user_session_document_type_key" ON "question_counts"("user_session", "document_type");

-- CreateIndex
CREATE UNIQUE INDEX "saved_sessions_user_session_key" ON "saved_sessions"("user_session");

-- CreateIndex
CREATE INDEX "saved_sessions_external_id_is_complete_idx" ON "saved_sessions"("external_id", "is_complete");

-- CreateIndex
CREATE UNIQUE INDEX "intro_briefs_user_session_key" ON "intro_briefs"("user_session");

-- CreateIndex
CREATE INDEX "tool_usage_external_id_month_idx" ON "tool_usage"("external_id", "month");

-- CreateIndex
CREATE INDEX "specifications_user_session_document_type_idx" ON "specifications"("user_session", "document_type");
