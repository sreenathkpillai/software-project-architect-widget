# Session & Document Management Implementation Plan

## Overview
Implement comprehensive session management and document viewing capabilities that allow parent applications to list, reload, and view documents from both incomplete and completed architect sessions.

## Requirements Confirmed

### 1. Session Scoping
- All sessions scoped to `externalId` (parent app user)
- Users only see their own sessions in any API or UI

### 2. Incomplete Session Management
- Saved sessions appear in widget's dropdown list
- Users can reload/continue incomplete sessions
- Once complete (13 docs + completion message), sessions cannot be "saved" anymore

### 3. Completed Session Management
- Completion triggered by specific flow end message (lines 578-586 in route.ts)
- Completed sessions transition to document view mode
- Documents permanently accessible via session ID

### 4. Document View Component
- New component with split view: sidebar + document viewer
- Sidebar lists all 13 documents (similar to stepper UI)
- Click sidebar item to view that document
- PRD displays by default on load
- Single document visible at a time

### 5. Export Capabilities
- Download individual document being viewed
- "Download All" button to zip all 13 documents
- Markdown format for all exports

## Implementation Plan

### Phase 1: Database Schema Updates
1. **Update SavedSession model**
   - Add `isComplete` boolean field (already exists)
   - Add `completedAt` timestamp field
   - Add `completionMessage` text field for final message
   - Ensure proper indexing on externalId + isComplete

2. **Update Specification model**
   - Ensure all document content is stored properly
   - Add `order` field for document sequence if needed

### Phase 2: API Endpoints

#### 2.1 Get Incomplete Sessions
**Endpoint**: `GET /api/sessions/incomplete`
- Query params: `externalId` (from JWT)
- Returns: Array of incomplete sessions with metadata
- Response includes: sessionId, sessionName, lastActivity, documentsCount

#### 2.2 Get Completed Sessions
**Endpoint**: `GET /api/sessions/completed`
- Query params: `externalId` (from JWT)
- Returns: Array of completed sessions with metadata
- Response includes: sessionId, sessionName, completedAt, allDocuments flag

#### 2.3 Get Session Documents
**Endpoint**: `GET /api/sessions/{sessionId}/documents`
- Path param: `sessionId`
- Query param: `externalId` (verify ownership)
- Returns: All 13 documents for the session
- Response includes document type, title, content, order

#### 2.4 Update Session Completion
**Endpoint**: `POST /api/sessions/{sessionId}/complete`
- Path param: `sessionId`
- Body: completion message
- Updates session status to complete
- Sets completedAt timestamp

### Phase 3: Document View Component

#### 3.1 Create DocumentViewer Component
```typescript
interface DocumentViewerProps {
  sessionId: string;
  externalId: string;
}
```

**Features**:
- Split layout: 20% sidebar, 80% content
- Sidebar shows 13 document types with completion indicators
- Active document highlighted in sidebar
- PRD selected by default
- Markdown rendering for document content
- Responsive design matching widget theme

#### 3.2 Export Functionality
- Individual document download as .md file
- Filename format: `{sessionName}-{documentType}.md`
- "Download All" creates zip with all 13 .md files
- Zip filename: `{sessionName}-architecture-docs.zip`
- Use JSZip library for client-side zipping

### Phase 4: Widget Flow Updates

#### 4.1 Session Completion Detection
- Monitor for completion message in chat flow
- When detected, trigger completion API call
- Update UI to show "View Generated Documents" button
- Button transitions to DocumentViewer component

#### 4.2 Session Loading Enhancement
- Extend widget URL params to accept `sessionId`
- On widget load with sessionId:
  - If incomplete: Load chat with session state
  - If complete: Load DocumentViewer directly
- Maintain JWT authentication throughout

#### 4.3 Widget Mode Routing
```typescript
type WidgetMode = 'chat' | 'documents' | 'intro';

// URL params determine initial mode
?mode=chat&sessionId={id} // Continue incomplete session
?mode=documents&sessionId={id} // View completed session docs
```

### Phase 5: Parent App Integration

#### 5.1 Session Lists in Parent App
- Fetch incomplete sessions via API
- Fetch completed sessions via API
- Display in separate sections/tabs
- Click handlers to open widget with appropriate mode

#### 5.2 Widget Communication
- Pass session ID via URL params
- Maintain existing JWT auth
- Handle mode switching based on session status

## Component Structure

```
components/
├── DocumentViewer/
│   ├── DocumentViewer.tsx       # Main component
│   ├── DocumentSidebar.tsx      # Document list sidebar
│   ├── DocumentContent.tsx      # Markdown renderer
│   ├── DocumentExport.tsx       # Export functionality
│   └── types.ts                 # TypeScript interfaces
├── WidgetApp.tsx                 # Update for mode routing
└── chat.tsx                      # Update for completion detection
```

## API Response Formats

### Incomplete Sessions Response
```json
{
  "sessions": [
    {
      "sessionId": "uuid",
      "sessionName": "My Project",
      "externalId": "user-123",
      "lastActivity": "2024-01-01T10:00:00Z",
      "documentsGenerated": 7,
      "totalDocuments": 13
    }
  ]
}
```

### Completed Sessions Response
```json
{
  "sessions": [
    {
      "sessionId": "uuid",
      "sessionName": "My Project",
      "externalId": "user-123",
      "completedAt": "2024-01-01T15:00:00Z",
      "hasAllDocuments": true
    }
  ]
}
```

### Documents Response
```json
{
  "sessionId": "uuid",
  "sessionName": "My Project",
  "documents": [
    {
      "type": "prd",
      "title": "Product Requirements Document",
      "content": "# PRD\n\n## Overview...",
      "order": 1
    }
  ]
}
```

## Libraries Required
- **JSZip**: For client-side zip file generation
- **file-saver**: For triggering file downloads
- **react-markdown**: Already in use for markdown rendering

## Testing Plan
1. Test session completion detection and state update
2. Test document retrieval for completed sessions
3. Test document view component rendering
4. Test individual document download
5. Test bulk zip download
6. Test parent app integration with both session types
7. Test session ownership verification
8. Test mode routing based on session status

## Success Criteria
- [ ] Parent app can list user's incomplete sessions
- [ ] Parent app can list user's completed sessions
- [ ] Clicking incomplete session resumes chat
- [ ] Clicking completed session shows documents
- [ ] Document view displays all 13 documents
- [ ] Individual documents downloadable
- [ ] All documents downloadable as zip
- [ ] Session completion triggers UI transition
- [ ] Session ownership properly enforced
- [ ] Widget routing handles all modes correctly

## Timeline Estimate
- Phase 1: 1 hour (DB schema)
- Phase 2: 2 hours (APIs)
- Phase 3: 3 hours (DocumentViewer)
- Phase 4: 2 hours (Widget flow)
- Phase 5: 1 hour (Parent integration)
- Testing: 2 hours

**Total: ~11 hours**