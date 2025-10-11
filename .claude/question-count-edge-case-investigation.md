# Question Count Edge Case Investigation

## Reported Issue
- User started new chat session
- PRD generated after only 1 question instead of required 5 questions
- Refresh + restart resolved the issue
- Appears to be an intermittent edge case

## Hypothesis: Session State Persistence Bug

### Possible Root Causes

#### 1. Session Not Properly Reset
**Scenario**: Previous session data persists between "new" sessions
**Check**:
- `currentQuestionCount` calculation in contextual prompt
- Database query: `await getQuestionCount(userSession, updatedNextDocType)`
- Session creation/reset logic in new chats

#### 2. Question Count Database Persistence
**Scenario**: QuestionCount table retains data from previous sessions
**Check**:
- Whether QuestionCount records are properly scoped to userSession
- If userSession generation creates truly unique IDs
- Database cleanup between sessions

#### 3. Cache/Memory State Issues
**Scenario**: Server-side state not clearing between sessions
**Check**:
- Any module-level variables that persist
- Message history truncation working correctly
- Context prompt generation using stale data

#### 4. Race Condition in New Session Setup
**Scenario**: Multiple requests during session initialization
**Check**:
- Session creation timing vs question count queries
- Concurrent requests to same userSession
- Database transaction isolation

## Investigation Plan (When Bug Reproduces)

### 1. Immediate Debugging
```typescript
// Add to contextual prompt generation:
console.log('🔍 DEBUG SESSION STATE:', {
  userSession,
  updatedNextDocType,
  currentQuestionCount,
  messagesLength: messages.length,
  updatedCompletedTypes
});
```

### 2. Database State Check
```sql
-- Check if question counts exist for new session
SELECT * FROM question_counts WHERE user_session = '[SESSION_ID]';
SELECT * FROM saved_sessions WHERE user_session = '[SESSION_ID]';
```

### 3. Logs to Monitor
- Session creation logs
- Question count increment logs
- Document type determination logs
- AI context prompts with question counts

## Potential Fixes (If Issue Persists)

### Fix 1: Explicit Session Reset
- Clear QuestionCount records on new session start
- Force currentStep = 0 for new sessions

### Fix 2: Session ID Validation
- Ensure userSession IDs are truly unique
- Add timestamp/random suffix to prevent collisions

### Fix 3: Question Count Validation
- Add bounds checking (never allow generation with < required questions)
- Fallback logic if count seems wrong

## Status
- **Current**: Intermittent issue, resolved by refresh
- **Priority**: Low (appears to be edge case)
- **Action**: Monitor for recurrence, implement debugging if reproduces consistently