# Async Document Generation Implementation Notes

## Current Status: PARTIAL SUCCESS ✅❌

### What We Fixed
- **Document generation responses**: Reduced from 60+ seconds to 15-30 seconds
- **Two-stage tool calling**: AI makes quick decision, then generates in background
- **Background generation**: Documents generate while user continues conversation
- **Logging**: Full visibility into background generation process

### What Still Needs Fixing
- **UI Stepper**: Not progressing because session state isn't updated immediately
- **Question flow**: Still showing wrong document type questions because stepper stuck
- **Response times**: All responses (regular + docgen) still 15-30s, not ~3s target

## Current Flow Analysis

### Implemented Flow (Partially Working)
1. **User asks question**
2. **AI makes decision** (15-30s) - decides document type + next question
3. **Tool handler**: Queues background generation + returns user question
4. **Background**: Document generates (~60s, parallel to user conversation)
5. **UI Issue**: Stepper doesn't progress → questions stay on same document type

### Missing Piece: Session State Management
**Problem**: Session progress is only updated when document saves to database (background)
**Solution**: Update session progress immediately when decision is made (step 3)

## Technical Implementation Needed

### Session State Updates Required
1. **Immediate progress update** in tool handlers (`decide_next_document`)
2. **Mark document as "generating"** in session state
3. **UI stepper reads progress** from session, not completed documents

### Expected Result After Fix
- ✅ **UI stepper progresses immediately** (15-30s after decision)
- ✅ **Question flow moves to next document** (correct document type questions)
- ✅ **Background generation continues** (invisible to user)
- ✅ **Documents available when complete** (existing polling works)

## Performance Notes

### Current Response Times (Post-Implementation)
- **Regular responses**: 15-30 seconds (unchanged)
- **Document generation responses**: 15-30 seconds (improved from 60s+)
- **Target**: ~3 seconds for all responses

### Next Performance Investigation Needed
The 15-30 second response times across all requests suggest the bottleneck is:
1. **AI API call latency** (most likely)
2. **Model choice** (GPT-5 vs GPT-4-turbo)
3. **Prompt complexity/size**
4. **Context window size** (too much conversation history)

This should be investigated separately after fixing the UI stepper issue.

## Implementation Priority
1. **HIGH**: Fix session state updates (stepper progression)
2. **MEDIUM**: Investigate 15-30s response times (separate research task)
3. **LOW**: Additional optimizations

---
*Implementation working but needs session state fix for full UI flow*