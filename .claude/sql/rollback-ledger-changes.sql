-- ================================================================
-- HYBRID LEDGER ROLLBACK SQL
-- ================================================================
-- Purpose: Complete rollback of all hybrid ledger schema changes
-- Run this script to revert database to pre-ledger state
-- After running this, you can safely checkout old git branch and restart
-- ================================================================

-- ROLLBACK STEP 1: Remove ledgerData column from saved_sessions table
-- This removes the only schema change required for hybrid ledger approach
ALTER TABLE saved_sessions DROP COLUMN IF EXISTS ledger_data;

-- ================================================================
-- VERIFICATION QUERIES (optional - run to confirm rollback)
-- ================================================================

-- Verify ledger_data column is removed
-- This should return 0 rows if rollback was successful
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'saved_sessions'
AND column_name = 'ledger_data';

-- Verify table structure is back to original state
-- Should show all original columns except ledger_data
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'saved_sessions'
ORDER BY ordinal_position;

-- ================================================================
-- ROLLBACK COMPLETION STEPS
-- ================================================================
-- After running this SQL file:
-- 1. git checkout [previous-branch]  # Switch to pre-ledger branch
-- 2. npx prisma generate            # Regenerate Prisma client
-- 3. npm install                    # Reinstall dependencies
-- 4. npm run build                  # Rebuild application
-- 5. pm2 restart all               # Restart PM2 processes
-- ================================================================

-- ================================================================
-- IMPORTANT NOTES
-- ================================================================
--
-- Data Safety:
-- - This rollback only removes the ledger_data column
-- - All existing chat messages and session data remain intact
-- - Chat history is preserved for potential future ledger rebuilding
--
-- Application Behavior After Rollback:
-- - App reverts to original transcript-based document generation
-- - No ledger accumulation or localStorage usage
-- - Full conversation context used for document generation
-- - All existing functionality preserved
--
-- Re-deployment Safety:
-- - This rollback is completely safe and reversible
-- - Can re-deploy ledger changes at any time by adding column back
-- - No data loss or corruption risk
-- - Instant rollback capability
-- ================================================================