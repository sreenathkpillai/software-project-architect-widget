# Universal Document Status System Plan

## Problem
With faster responses, users might reach questionnaire end before all docs finish generating. Documents 6-13 (API through README) might still be generating when user finishes.

## Analysis
**Current State:**
- README has polling + disabled state until ready
- Documents 1-5 (PRD through Database) should always be ready by questionnaire end
- Documents 6-13 (API through README) might still be generating

**Risk Documents:** API, DevOps, Testing, Code Docs, Performance, User Flow, Libraries, README

## Plan: Universal Document Status System

### Phase 1: Extend Status API (15 mins)
**File:** `/app/api/documents/status/route.ts`

```typescript
// Current: Only README status
// Add: Status for all documents with generation state

{
  documents: [
    { type: 'prd', status: 'ready' },
    { type: 'frontend', status: 'ready' },
    // ...
    { type: 'api', status: 'generating' | 'ready' | 'timeout' },
    { type: 'readme', status: 'generating' | 'ready' | 'timeout' }
  ],
  allReady: boolean,
  totalReady: number,
  totalDocs: 13
}
```

### Phase 2: Update DocViewer UI (20 mins)
**File:** `/components/workflow/DocumentViewer.tsx`

- Apply README's loading pattern to all at-risk documents (6-13)
- Show loading spinner for `status: 'generating'`
- Disable download/view until `status: 'ready'`
- Display "Finalizing..." message for generating docs

### Phase 3: Smart Polling Logic (10 mins)
- Poll every 3 seconds if any document is `generating`
- Stop polling when `allReady: true`
- 3-minute timeout per document (like README)

### Phase 4: UX Improvements (10 mins)
- Progress indicator: "9/13 documents ready"
- Show which specific docs are still generating
- Success message when all complete

## Expected Behavior:
- User finishes questionnaire → can immediately view DocViewer
- Documents 1-5: Always ready (as before)
- Documents 6-13: Show loading state if still generating
- Polling automatically enables completed documents as they finish
- No blocking - user can view ready documents immediately

**Total Time:** ~1 hour
**Risk:** Low - extends existing README pattern