# Parent Application Integration Guide

## Overview

The Software Project Architect widget now includes comprehensive session and document management capabilities. This guide outlines what was implemented in the widget and provides a complete plan for parent application integration.

## What Was Implemented in the Widget

### 1. Database Schema Enhancements
- **SavedSession model** already included all necessary fields:
  - `isComplete` (boolean) - Tracks session completion status
  - `completedAt` (DateTime) - Timestamp when session was completed
  - `completionMessage` (String) - Final completion message
  - Proper indexing on `externalId` + `isComplete` for efficient queries

### 2. New API Endpoints

#### Session Management APIs
- **`GET /api/sessions/incomplete?externalId={userId}`**
  - Returns incomplete sessions for a specific user
  - Includes document count progress (e.g., "7 of 13 documents")
  
- **`GET /api/sessions/completed?externalId={userId}`**
  - Returns completed sessions for a specific user
  - Verifies all 13 documents are present

- **`GET /api/sessions/{sessionId}/documents?externalId={userId}`**
  - Returns all documents for a completed session
  - Includes document content, titles, and proper ordering
  - Enforces session ownership verification

- **`POST /api/sessions/{sessionId}/complete`**
  - Internal API to mark sessions as complete
  - Called automatically when all 13 documents are generated

### 3. DocumentViewer Component
New full-screen document viewing interface with:
- **Split-panel layout**: 20% sidebar, 80% content viewer
- **Document sidebar**: Lists all 13 document types with completion status
- **Content viewer**: Displays one document at a time with markdown formatting
- **Export functionality**: Individual document download + bulk ZIP export
- **PRD default selection**: Opens with Product Requirements Document by default

### 4. Export Capabilities
- **Individual downloads**: Each document as `.md` file
- **Bulk ZIP download**: All 13 documents + usage instructions README
- **Proper file naming**: `{sessionName}-{documentType}.md`
- **Usage instructions**: Included README with AI coding assistant guidance

### 5. Session Completion Flow
- **Automatic detection**: When all 13 documents are generated
- **Completion button**: "View Generated Documents" appears in chat
- **Mode transition**: Seamless switch from chat to document viewer
- **Database update**: Session marked complete with timestamp

### 6. URL Parameter Routing
- **Resume incomplete**: `?sessionId={id}` loads chat mode
- **View completed**: `?mode=documents&sessionId={id}` loads document viewer
- **Proper authentication**: All modes verify `externalId` ownership

## Parent Application Implementation Requirements

### Phase 1: Session List UI

#### 1.1 Create Session Lists Page/Component
```javascript
// Component structure needed:
- SessionDashboard
  - IncompleteSessionsList
  - CompletedSessionsList
  - SessionListItem
```

**Requirements:**
- Two distinct sections: "In Progress" and "Completed" 
- Display session name, last activity, and document count
- Click handlers for resuming/viewing sessions
- Loading states and error handling
- Responsive design for mobile/desktop

#### 1.2 API Integration Functions
```javascript
// Functions to implement:
async function fetchIncompleteSessions(userId)
async function fetchCompletedSessions(userId) 
async function refreshSessionLists()
```

**API Endpoints to Call:**
- `GET /api/sessions/incomplete?externalId={userId}`
- `GET /api/sessions/completed?externalId={userId}`

**Response Format:**
```json
{
  "sessions": [
    {
      "sessionId": "session_123",
      "sessionName": "My E-commerce App",
      "lastActivity": "2024-01-15T10:30:00Z",
      "documentsGenerated": 7,
      "totalDocuments": 13
    }
  ]
}
```

### Phase 2: Widget Integration

#### 2.1 Widget URL Construction
```javascript
// URL builders to implement:
function buildResumeSessionUrl(sessionId, userId) {
  return `${WIDGET_BASE_URL}?sessionId=${sessionId}&externalId=${userId}`;
}

function buildViewDocumentsUrl(sessionId, userId) {
  return `${WIDGET_BASE_URL}?mode=documents&sessionId=${sessionId}&externalId=${userId}`;
}
```

#### 2.2 Widget Embedding Strategy
Choose one approach:

**Option A: Modal/Overlay**
```javascript
function openWidgetModal(url) {
  // Create full-screen modal with iframe
  // Handle close/escape behaviors
  // Manage z-index and backdrop
}
```

**Option B: Navigation**
```javascript
function navigateToWidget(url) {
  // Navigate to widget page
  // Handle back navigation
  // Maintain parent app context
}
```

**Option C: Embedded Panel**
```javascript
function loadWidgetInPanel(url) {
  // Load widget in dedicated panel/section
  // Handle responsive sizing
  // Manage panel state
}
```

### Phase 3: User Experience Enhancements

#### 3.1 Session Management Actions
- **New Project Button**: Creates fresh architect session
- **Session Rename**: Allow users to rename saved sessions
- **Session Delete**: Remove unwanted sessions (optional)
- **Export from List**: Quick export without opening widget

#### 3.2 Progress Indicators
- **Visual progress bars**: Show document completion (7/13)
- **Status badges**: "In Progress", "Complete", "New" 
- **Last activity timestamps**: "2 hours ago", "Yesterday"
- **Document count summaries**: Clear progress indicators

#### 3.3 Search and Filtering
```javascript
// Features to implement:
- Search sessions by name
- Filter by status (incomplete/complete)
- Sort by date (newest/oldest)
- Pagination for large session lists
```

### Phase 4: Advanced Features

#### 4.1 Bulk Operations
- **Multi-select sessions**: Checkbox selection
- **Bulk export**: Download multiple completed sessions
- **Bulk delete**: Remove multiple sessions
- **Archive functionality**: Hide old sessions

#### 4.2 Session Analytics
- **Time tracking**: How long sessions take to complete  
- **Document insights**: Which documents are generated most
- **Usage patterns**: Peak usage times, session success rates
- **Export statistics**: Most downloaded document types

#### 4.3 Collaboration Features
- **Session sharing**: Share completed architectures with team
- **Comment system**: Add notes to sessions
- **Team workspaces**: Organization-level session management
- **Permission management**: Who can view/edit sessions

## Implementation Checklist

### Essential Features (MVP)
- [ ] Fetch and display incomplete sessions list
- [ ] Fetch and display completed sessions list  
- [ ] Resume incomplete session in widget (chat mode)
- [ ] View completed session documents (document mode)
- [ ] Handle widget authentication with `externalId`
- [ ] Basic error handling and loading states

### Enhanced Features
- [ ] Session search and filtering
- [ ] Progress indicators and status badges
- [ ] Session rename functionality
- [ ] Bulk export capabilities
- [ ] Responsive design for mobile
- [ ] Session management (delete, archive)

### Advanced Features  
- [ ] Session analytics and insights
- [ ] Bulk operations (multi-select)
- [ ] Collaboration features
- [ ] Export statistics tracking
- [ ] Team/organization features

## Technical Considerations

### 1. Authentication Flow
```javascript
// Ensure consistent user identification:
const userId = getUserId(); // Your app's user identification
const widgetUrl = buildWidgetUrl(sessionId, userId);

// Widget will verify this externalId matches the session owner
```

### 2. Error Handling
```javascript
// Handle common error scenarios:
- Network failures when fetching sessions
- Widget authentication failures  
- Session ownership mismatches
- Missing or corrupt session data
- Widget loading failures
```

### 3. Performance Optimization
```javascript
// Recommended patterns:
- Cache session lists with refresh mechanism
- Lazy load widget iframes
- Debounce search inputs
- Paginate large session lists
- Preload critical session data
```

### 4. Mobile Responsiveness
- **Session lists**: Card-based layout for mobile
- **Widget integration**: Full-screen modal on mobile
- **Touch interactions**: Proper touch targets and gestures
- **Responsive text**: Readable on small screens

## API Integration Examples

### Fetching Sessions
```javascript
async function loadUserSessions(userId) {
  try {
    const [incomplete, completed] = await Promise.all([
      fetch(`/api/sessions/incomplete?externalId=${userId}`),
      fetch(`/api/sessions/completed?externalId=${userId}`)
    ]);
    
    return {
      incomplete: await incomplete.json(),
      completed: await completed.json()
    };
  } catch (error) {
    console.error('Failed to load sessions:', error);
    throw error;
  }
}
```

### Widget Integration
```javascript
function openSession(session, mode = 'chat') {
  const userId = getCurrentUserId();
  let url;
  
  if (mode === 'documents') {
    url = `${WIDGET_URL}?mode=documents&sessionId=${session.sessionId}&externalId=${userId}`;
  } else {
    url = `${WIDGET_URL}?sessionId=${session.sessionId}&externalId=${userId}`;
  }
  
  // Open in modal, navigate, or embed
  openWidgetModal(url);
}
```

## Security Considerations

1. **Session Ownership**: Widget APIs verify `externalId` matches session owner
2. **Authentication**: Maintain existing JWT/auth patterns
3. **Data Privacy**: Sessions are isolated per user
4. **API Security**: All endpoints require valid user context
5. **Export Security**: Documents only downloadable by session owner

## Testing Strategy (can be manual testing for now)

### Unit Tests
- Session list rendering with mock data
- URL building functions
- Error handling scenarios
- Search and filter functionality

### Integration Tests  
- API calls to widget endpoints
- Widget authentication flow
- Session resume functionality
- Document viewing workflow

### E2E Tests
- Complete user journey: create → save → resume → complete → view
- Cross-browser widget integration
- Mobile responsive behavior
- Error recovery scenarios

The widget is fully ready for integration - all session management, document viewing, and export functionality is implemented and tested!