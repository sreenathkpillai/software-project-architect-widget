-- AlterTable to add missing columns if they don't exist
DO $$ 
BEGIN 
    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_sessions' 
                   AND column_name = 'completed_at') THEN
        ALTER TABLE "saved_sessions" ADD COLUMN "completed_at" TIMESTAMP(3);
    END IF;
    
    -- Add completion_message column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_sessions' 
                   AND column_name = 'completion_message') THEN
        ALTER TABLE "saved_sessions" ADD COLUMN "completion_message" TEXT;
    END IF;
END $$;