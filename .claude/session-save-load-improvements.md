# Session Save & Load Improvements Plan

## Current Issues
1. Sessions save with timestamp only - no user input for naming
2. Loading a session doesn't restore chat history
3. Need proper modal UI for session naming

## Implementation Plan

### Phase 1: Add Chat History Storage to Database

#### 1.1 Update Prisma Schema
Add new model for storing chat messages:
```prisma
model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String   @map("session_id")
  role        String   // 'user' or 'assistant'
  content     String
  timestamp   DateTime @default(now())
  order       Int      // Message order in conversation
  
  session     SavedSession @relation(fields: [sessionId], references: [userSession])
  
  @@index([sessionId, order])
  @@map("chat_messages")
}

// Update SavedSession model to include relation
model SavedSession {
  // ... existing fields ...
  messages    ChatMessage[]
}
```

#### 1.2 Create Migration
- Run migration to add chat_messages table
- Update SavedSession with relation

### Phase 2: Create Session Name Modal Component

#### 2.1 Modal Component Structure
Create `components/SaveSessionModal.tsx`:
- Modal overlay with dark background
- Input field for session name
- Suggested name as placeholder (current timestamp)
- Save & Cancel buttons
- Validation (required, min length)
- Escape key to close
- Click outside to close

#### 2.2 Modal Styling
- Use existing widget theme variables
- Smooth fade-in animation
- Centered positioning
- Responsive design

### Phase 3: Update Save Session Flow

#### 3.1 Modify chat.tsx
- Add state: `showSaveModal: boolean`
- Add state: `sessionNameInput: string`
- Replace prompt() with modal trigger
- On save button click: show modal
- On modal confirm: save with custom name + chat history

#### 3.2 Save Chat History
When saving session:
1. Get current messages array from state
2. Format messages with order index
3. Save to database along with session info
4. POST to updated `/api/sessions` endpoint

### Phase 4: Update Load Session Flow

#### 4.1 API Endpoint Enhancement
Update `/api/sessions/[sessionId]/load` route:
- Fetch saved session details
- Fetch all chat messages ordered by `order`
- Return both session info and messages

#### 4.2 Load Chat History in UI
When loading session:
1. Fetch session with messages
2. Set messages state with loaded history
3. Set other session states (completedDocs, etc.)
4. Scroll to bottom of chat
5. Show success toast/notification

### Phase 5: API Updates

#### 5.1 POST /api/sessions (Save)
Update to:
- Accept messages array in request body
- Create ChatMessage records for each message
- Link to session via sessionId
- Only save for incomplete sessions

#### 5.2 GET /api/sessions/[sessionId]/load
Create new endpoint to:
- Return session details
- Include all chat messages ordered
- Include completed documents list
- Include any other session state

#### 5.3 Cleanup
- When session completes: optionally delete chat history
- Add flag for whether to keep history after completion

### Phase 6: UI/UX Enhancements

#### 6.1 Session List Display
- Show session name in dropdown
- Show last activity time
- Show message count
- Show completion percentage

#### 6.2 Loading State
- Show loading spinner while fetching
- Smooth transition when messages load
- Maintain scroll position

## Technical Considerations

### Database
- Index on sessionId for fast message retrieval
- Consider message size limits
- Implement cleanup for old abandoned sessions

### Performance
- Paginate messages if history is very long
- Lazy load older messages if needed
- Compress message content if very large

### Security
- Verify session ownership before loading
- Sanitize message content
- Validate message structure

## Implementation Order

1. **Database Schema** (30 min)
   - Add ChatMessage model
   - Run migration
   - Update Prisma client

2. **Modal Component** (45 min)
   - Create SaveSessionModal
   - Add to chat.tsx
   - Style with theme

3. **Save Flow** (45 min)
   - Update save function
   - Save chat history
   - Update API endpoint

4. **Load Flow** (45 min)
   - Create load endpoint
   - Fetch and restore messages
   - Update UI state

5. **Testing & Polish** (30 min)
   - Test save/load cycle
   - Handle edge cases
   - Add error handling

**Total: ~3 hours**

## Success Criteria
- ✅ Users can name sessions when saving
- ✅ Modal UI for session naming
- ✅ Chat history saves with session
- ✅ Loading session restores full conversation
- ✅ Only incomplete sessions store history
- ✅ Smooth UX with proper loading states

## Files to Modify
- `prisma/schema.prisma` - Add ChatMessage model
- `components/SaveSessionModal.tsx` - New modal component  
- `components/chat.tsx` - Integrate modal, update save/load
- `app/api/sessions/route.ts` - Update save endpoint
- `app/api/sessions/[sessionId]/load/route.ts` - New load endpoint
- `lib/db.ts` - Ensure proper exports