# Session Discard System - Database Migration Guide

## Overview
This guide explains how to implement the session discard system that adds soft delete functionality to manage auto-saved sessions that may be abandoned.

## Database Schema Changes

### New Fields Added to SavedSession Model
Two new fields have been added to the `SavedSession` model in `prisma/schema.prisma`:

```prisma
model SavedSession {
  // ... existing fields ...
  isDiscarded       Boolean   @default(false) @map("is_discarded")
  discardedAt       DateTime? @map("discarded_at")
  // ... existing fields ...
  
  @@index([externalId, isComplete, isDiscarded])
  @@map("saved_sessions")
}
```

### Database Migration Steps

#### 1. Generate Migration
```bash
npx prisma migrate dev --name add_session_discard_fields
```

This will create a migration file that adds:
- `is_discarded` BOOLEAN NOT NULL DEFAULT false
- `discarded_at` TIMESTAMP(3) NULL
- Updated index to include `is_discarded` field

#### 2. Apply Migration to Production
```bash
npx prisma migrate deploy
```

#### 3. Generate Updated Prisma Client
```bash
npx prisma generate
```

## API Changes Summary

### New Endpoint: Session Discard
- **DELETE** `/api/sessions/[sessionId]/discard?externalId=<externalId>`
- **POST** `/api/sessions/[sessionId]/discard?externalId=<externalId>` (for bulk operations)

### Updated Existing Endpoints
All session-related endpoints now exclude discarded sessions by default:

1. **GET** `/api/sessions` - Added `isDiscarded: false` filter
2. **GET** `/api/sessions/completed` - Added `isDiscarded: false` filter  
3. **GET** `/api/sessions/incomplete` - Added `isDiscarded: false` filter
4. **GET** `/api/sessions/[sessionId]/load` - Added `isDiscarded: false` filter
5. **PUT** `/api/sessions` (rename) - Added check to prevent renaming discarded sessions
6. **POST** `/api/sessions/[sessionId]/complete` - Added `isDiscarded: false` filter

## Frontend Changes

### Smart "Start Over" Button Logic
The chat component now implements intelligent session management:

- **Auto-saved sessions** (names starting with "Draft") are automatically discarded
- **User-saved sessions** (custom names) show confirmation dialog and are preserved
- **Empty sessions** (no messages) reset without discarding

### Session Detection Logic
```javascript
const isAutoSavedSession = (sessionName) => {
  return sessionName.startsWith('Draft ');
};
```

## Usage Analytics

### New Tool Usage Types
- `session_discarded` - Single session discard
- `session_discarded_bulk` - Bulk session discard

## Testing

### Automated Tests
Run the test suite to verify implementation:

```bash
node test-session-discard.js
```

### Manual Testing Scenarios

1. **Create auto-saved session** → Click "Start Over" → Verify session is discarded
2. **Create user-saved session** → Click "Start Over" → Verify confirmation dialog
3. **Try to discard completed session** → Verify error is returned
4. **Try to discard with wrong externalId** → Verify 403 Unauthorized
5. **Try to discard non-existent session** → Verify 404 Not Found
6. **Try to double-discard session** → Verify 400 Bad Request

## Data Integrity Considerations

### Soft Delete Benefits
- **Audit Trail**: Discarded sessions remain in database for analytics
- **Data Recovery**: Sessions can be "undeleted" if needed
- **Referential Integrity**: Related data (messages, documents) remains linked

### Query Performance
- New composite index `[externalId, isComplete, isDiscarded]` optimizes common queries
- All session queries include `isDiscarded: false` filter

## Rollback Plan

If issues arise, you can temporarily disable the discard system:

1. **Remove discard filters** from existing APIs
2. **Disable discard button** in frontend
3. **Keep schema changes** for future re-enablement

## Monitoring and Maintenance

### Key Metrics to Monitor
- Number of sessions discarded per day
- Ratio of auto-saved vs user-saved sessions discarded
- Performance impact of additional WHERE clauses

### Cleanup Strategy
Consider implementing a cleanup job to permanently delete discarded sessions older than X months:

```sql
DELETE FROM saved_sessions 
WHERE is_discarded = true 
AND discarded_at < NOW() - INTERVAL '6 months';
```

## Security Considerations

### Access Control
- Only session owners can discard their sessions
- ExternalId verification prevents unauthorized access
- Completed sessions cannot be discarded (business rule)

### Validation
- Session existence verified before discard
- Ownership verified via externalId match
- Already-discarded sessions return appropriate error

## Parent App Integration

### Bulk Discard Support
The API supports bulk operations for parent app integration:

```javascript
// Bulk discard multiple sessions
const response = await fetch(`/api/sessions/any/discard?externalId=${externalId}`, {
  method: 'POST',
  body: JSON.stringify({
    action: 'bulk_discard',
    sessionIds: ['session1', 'session2', 'session3']
  })
});
```

### Session List Updates
After discard operations, the API returns updated session lists to maintain UI consistency.

## Conclusion

The session discard system provides intelligent session management while maintaining data integrity and user experience. The soft delete approach ensures audit trails and potential data recovery while cleaning up the active session workspace.