-- CreateEnum
CREATE TYPE "specification_type" AS ENUM ('prd', 'frontend', 'backend', 'state_management', 'database_schema', 'api', 'devops', 'testing_plan', 'code_documentation', 'performance_optimization', 'user_flow', 'third_party_libraries', 'readme');

-- CreateTable
CREATE TABLE "specifications" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "document_type" "specification_type" NOT NULL,
    "description" TEXT NOT NULL,
    "next_steps" TEXT,
    "skip_technical_summary" BOOLEAN NOT NULL DEFAULT false,
    "user_session" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specifications_pkey" PRIMARY KEY ("id")
);
