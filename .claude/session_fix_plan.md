# Session Management Fix - Implementation Plan

## Problem Summary
1. Chat history is not saved incrementally (only on manual save)
2. Documents are created but not properly associated with sessions
3. Session state is lost on errors
4. "View Documents" fails because session doesn't exist in database

## Root Cause Analysis
The core issue is that `userSession` is just a string ID that exists in the client, but there's no corresponding `SavedSession` record in the database until the user manually saves. This causes:
- Documents to be orphaned (they have userSession string but no SavedSession relation)
- Chat history to be lost on errors
- Session state to be non-persistent

## Solution Architecture

### Phase 1: Auto-Create Session on First Message (PRIORITY)

#### 1.1 Modify Chat Component
```typescript
// components/chat.tsx
// On first message, auto-create session in database
const sendMessage = async () => {
  // Before sending first message, ensure session exists in DB
  if (messages.length === 0) {
    await ensureSessionExists();
  }
  // ... rest of send logic
}

const ensureSessionExists = async () => {
  const response = await fetch(getApiUrl('sessions/ensure'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userSession,
      externalId,
      sessionType,
      introBrief
    })
  });
}
```

#### 1.2 Create Session Ensure Endpoint
```typescript
// app/api/sessions/ensure/route.ts
export async function POST(request: NextRequest) {
  const { userSession, externalId, sessionType, introBrief } = await request.json();
  
  // Create session if it doesn't exist
  const session = await prisma.savedSession.upsert({
    where: { userSession },
    update: { lastActivity: new Date() },
    create: {
      userSession,
      externalId,
      sessionName: `Session ${new Date().toLocaleDateString()}`,
      sessionType,
      isComplete: false
    }
  });
  
  return NextResponse.json({ success: true, sessionId: session.id });
}
```

### Phase 2: Incremental Chat History Saving

#### 2.1 Save Each Message Pair
```typescript
// components/chat.tsx
const sendMessage = async () => {
  // ... send message logic
  
  // After receiving assistant response, save both messages
  await saveMessagePair(userMessage, assistantMessage);
}

const saveMessagePair = async (userMsg, assistantMsg) => {
  await fetch(getApiUrl('sessions/messages'), {
    method: 'POST',
    body: JSON.stringify({
      userSession,
      messages: [userMsg, assistantMsg]
    })
  });
}
```

#### 2.2 Create Message Save Endpoint
```typescript
// app/api/sessions/messages/route.ts
export async function POST(request: NextRequest) {
  const { userSession, messages } = await request.json();
  
  // Get current max order
  const maxOrder = await prisma.chatMessage.findFirst({
    where: { sessionId: userSession },
    orderBy: { order: 'desc' },
    select: { order: true }
  });
  
  const startOrder = (maxOrder?.order ?? -1) + 1;
  
  // Add new messages
  await prisma.chatMessage.createMany({
    data: messages.map((msg, idx) => ({
      sessionId: userSession,
      role: msg.role,
      content: msg.content,
      order: startOrder + idx,
      timestamp: new Date()
    }))
  });
  
  // Update session last activity
  await prisma.savedSession.update({
    where: { userSession },
    data: { lastActivity: new Date() }
  });
}
```

### Phase 3: Error Recovery & Session Persistence

#### 3.1 Add Session Recovery on Mount
```typescript
// components/chat.tsx
useEffect(() => {
  // ... existing initialization
  
  // Check if session exists in DB and load it
  if (userSession) {
    loadSessionState(userSession);
  }
}, [userSession]);

const loadSessionState = async (sessionId: string) => {
  const response = await fetch(getApiUrl(`sessions?userSession=${sessionId}&externalId=${externalId}`));
  if (response.ok) {
    const data = await response.json();
    if (data.messages) {
      setMessages(data.messages);
      setCompletedDocs(data.completedDocs);
    }
  }
}
```

#### 3.2 Add Error Recovery
```typescript
// components/chat.tsx
const sendMessage = async () => {
  try {
    // ... existing logic
  } catch (error) {
    console.error('Message send failed:', error);
    // Save current state to session
    await saveSessionState();
    // Retry logic or show error
  }
}
```

### Phase 4: Fix Document Association

#### 4.1 Ensure Session Exists Before Document Creation
```typescript
// app/api/chat/route.ts
async function saveSpecificationDocument(...args) {
  // Ensure session exists before saving document
  await prisma.savedSession.upsert({
    where: { userSession },
    update: { lastActivity: new Date() },
    create: {
      userSession,
      externalId,
      sessionName: `Session ${new Date().toLocaleDateString()}`,
      sessionType: 'architect',
      isComplete: false
    }
  });
  
  // Now save document (existing logic)
  const spec = await prisma.specification.create({
    // ... existing logic
  });
}
```

### Phase 5: Update View Documents

#### 5.1 Fix Document Viewer Query
```typescript
// components/DocumentViewer/DocumentViewer.tsx
// Update to handle sessions that might not be "saved" but exist
const fetchDocuments = async () => {
  // Query documents directly by userSession
  const response = await fetch(
    `${getApiUrl(`specifications/${sessionId}`)}?externalId=${externalId}`
  );
}
```

#### 5.2 Create Direct Document Query Endpoint
```typescript
// app/api/specifications/[sessionId]/route.ts
export async function GET(request: NextRequest, { params }) {
  const { sessionId } = params;
  const externalId = request.nextUrl.searchParams.get('externalId');
  
  // Verify ownership via specifications table directly
  const documents = await prisma.specification.findMany({
    where: {
      userSession: sessionId,
      externalId
    },
    orderBy: { order: 'asc' }
  });
  
  return NextResponse.json({ documents });
}
```

### Phase 6: Fix Session Naming (No Duplicates)

#### Problem
Currently when a session is auto-created, it gets a generic name like "Session 1/15/2024". When the user saves it with a custom name, the system updates the session name but this creates confusion since we now save after every message.

#### 6.1 Update Auto-Created Session Names
```typescript
// components/chat.tsx
const ensureSessionExists = async () => {
  const response = await fetch(getApiUrl('sessions/ensure'), {
    method: 'POST',
    body: JSON.stringify({
      userSession,
      externalId,
      sessionType,
      sessionName: `Draft ${new Date().toLocaleDateString()}`, // Mark as draft
      introBrief
    })
  });
}

// When user saves with custom name, just update the existing session
const saveSession = async (sessionName: string) => {
  // Remove the old logic that creates a "duplicate"
  // Just update the existing session name
  const response = await fetch(getApiUrl('sessions'), {
    method: 'PUT', // Use PUT for update
    body: JSON.stringify({
      userSession,
      sessionName, // This will replace "Draft" name
      action: 'rename'
    })
  });
}
```

#### 6.2 Update Sessions API for Rename
```typescript
// app/api/sessions/route.ts
export async function PUT(request: NextRequest) {
  const { userSession, sessionName, action } = await request.json();
  
  if (action === 'rename') {
    await prisma.savedSession.update({
      where: { userSession },
      data: { 
        sessionName,
        lastActivity: new Date()
      }
    });
    
    return NextResponse.json({ success: true });
  }
}
```

### Phase 7: Fix Dropdown Auto-Selection

#### Problem
When a session is loaded via URL parameter (e.g., from parent app), the dropdown doesn't auto-select the currently loaded session. Users have to manually select it again from the dropdown.

#### 7.1 Add Current Session Tracking
```typescript
// components/chat.tsx
const [currentSessionId, setCurrentSessionId] = useState<string>('');

// Update dropdown to show current selection
<select
  value={currentSessionId} // Show current session
  onChange={(e) => {
    if (e.target.value && e.target.value !== currentSessionId) {
      loadSession(e.target.value);
    }
  }}
  className="widget-input w-full p-2 text-sm"
>
  <option value="">Load a different session...</option>
  {savedSessions.map((session) => (
    <option key={session.userSession} value={session.userSession}>
      {session.sessionName}
      {session.userSession === currentSessionId ? ' (current)' : ''}
    </option>
  ))}
</select>
```

#### 7.2 Auto-Load Session from Props
```typescript
// components/chat.tsx
useEffect(() => {
  // ... existing initialization
  
  // If propUserSession provided, auto-load that session
  if (propUserSession && propUserSession !== sessionId) {
    setCurrentSessionId(propUserSession);
    loadSessionData(propUserSession);
  }
}, [propUserSession]);

const loadSessionData = async (sessionId: string) => {
  // Load session data without changing dropdown selection
  const response = await fetch(
    `${getApiUrl('sessions')}?userSession=${sessionId}&externalId=${externalId}`
  );
  
  if (response.ok) {
    const data = await response.json();
    setMessages(data.messages || []);
    setCompletedDocs(data.completedDocs || []);
    setCurrentSessionId(sessionId);
  }
}
```

## Implementation Priority

1. **IMMEDIATE (Fix Production Issue)**
   - Phase 1: Auto-create session on first message
   - Phase 4.1: Ensure session exists before document creation
   
2. **HIGH PRIORITY**
   - Phase 2: Incremental chat history saving
   - Phase 5: Fix document viewing
   - Phase 7: Fix dropdown auto-selection (UX critical)
   
3. **MEDIUM PRIORITY**
   - Phase 3: Error recovery and session persistence
   - Phase 6: Fix session naming (cosmetic improvement)

## Testing Plan

1. **Test Session Creation**
   - Start new chat
   - Send first message
   - Verify SavedSession record created in DB
   
2. **Test Incremental Save**
   - Send multiple messages
   - Check ChatMessage records after each
   - Verify order is preserved
   
3. **Test Error Recovery**
   - Simulate API error
   - Refresh page
   - Verify session state restored
   
4. **Test Document Association**
   - Complete full architect flow
   - Verify all 13 documents associated
   - Test "View Documents" button

## Database Migration Needed

None - existing schema supports all changes

## Rollback Plan

All changes are backward compatible. If issues arise:
1. Revert code changes
2. Existing sessions remain functional
3. No data loss

## Success Metrics

- Zero orphaned documents
- Chat history persisted after every message
- Session state survives browser refresh
- "View Documents" works 100% of the time
- Error recovery maintains session context