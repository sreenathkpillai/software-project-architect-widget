# Parent App Integration: Session Discard Functionality

## Overview
The session discard API allows parent applications to manage saved sessions by providing soft-delete capabilities for non-completed sessions.

## API Endpoints

### 1. Discard Single Session
**Endpoint:** `DELETE /api/sessions/{sessionId}/discard?externalId={externalId}`

**Purpose:** Soft-delete a single session (marks as discarded without removing from database)

**Response:**
```json
{
  "success": true,
  "message": "Session discarded successfully",
  "sessionId": "session_123",
  "discardedAt": "2024-01-15T10:30:00Z"
}
```

### 2. Bulk Discard Sessions
**Endpoint:** `POST /api/sessions/{sessionId}/discard?externalId={externalId}`

**Body:**
```json
{
  "action": "bulk_discard",
  "sessionIds": ["session_1", "session_2", "session_3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 sessions discarded successfully",
  "discardedCount": 3,
  "remainingSessions": [...]
}
```

## Parent App Implementation Example

### HTML Structure
```html
<div class="session-list">
  <h2>Your Sessions</h2>
  <div id="sessions-container"></div>
</div>
```

### JavaScript Implementation
```javascript
// Function to fetch and display sessions
async function loadSessions(externalId) {
  const response = await fetch(`/api/sessions?externalId=${externalId}`);
  const data = await response.json();
  
  const container = document.getElementById('sessions-container');
  container.innerHTML = '';
  
  data.sessions.forEach(session => {
    const sessionElement = createSessionElement(session);
    container.appendChild(sessionElement);
  });
}

// Function to create session element with discard button
function createSessionElement(session) {
  const div = document.createElement('div');
  div.className = 'session-item';
  div.innerHTML = `
    <div class="session-info">
      <h3>${session.sessionName}</h3>
      <span class="session-date">${new Date(session.createdAt).toLocaleDateString()}</span>
      <span class="session-status ${session.isComplete ? 'complete' : 'incomplete'}">
        ${session.isComplete ? 'Complete' : 'In Progress'}
      </span>
    </div>
    <div class="session-actions">
      <button onclick="loadSession('${session.userSession}')" class="btn-load">
        Load
      </button>
      ${!session.isComplete ? `
        <button onclick="discardSession('${session.userSession}')" class="btn-discard">
          Discard
        </button>
      ` : ''}
    </div>
  `;
  return div;
}

// Function to discard a session
async function discardSession(sessionId) {
  const confirmed = confirm('Are you sure you want to discard this session? This action cannot be undone.');
  
  if (!confirmed) return;
  
  try {
    const externalId = getUserExternalId(); // Get from your auth system
    const response = await fetch(
      `/api/sessions/${sessionId}/discard?externalId=${externalId}`,
      { method: 'DELETE' }
    );
    
    if (response.ok) {
      // Reload the session list
      await loadSessions(externalId);
      showNotification('Session discarded successfully');
    } else {
      const error = await response.json();
      showNotification(`Error: ${error.error}`, 'error');
    }
  } catch (error) {
    console.error('Failed to discard session:', error);
    showNotification('Failed to discard session', 'error');
  }
}

// Function to bulk discard sessions
async function bulkDiscardSessions(sessionIds) {
  const confirmed = confirm(`Are you sure you want to discard ${sessionIds.length} sessions?`);
  
  if (!confirmed) return;
  
  try {
    const externalId = getUserExternalId();
    const response = await fetch(
      `/api/sessions/bulk/discard?externalId=${externalId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_discard',
          sessionIds: sessionIds
        })
      }
    );
    
    if (response.ok) {
      const result = await response.json();
      await loadSessions(externalId);
      showNotification(`${result.discardedCount} sessions discarded`);
    } else {
      const error = await response.json();
      showNotification(`Error: ${error.error}`, 'error');
    }
  } catch (error) {
    console.error('Failed to bulk discard sessions:', error);
    showNotification('Failed to discard sessions', 'error');
  }
}
```

### CSS Styling Example
```css
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.session-item:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.session-status.complete {
  color: #10b981;
  background: #d1fae5;
  padding: 2px 8px;
  border-radius: 4px;
}

.session-status.incomplete {
  color: #f59e0b;
  background: #fed7aa;
  padding: 2px 8px;
  border-radius: 4px;
}

.btn-discard {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 8px;
}

.btn-discard:hover {
  background: #dc2626;
}
```

## Important Notes

1. **Soft Delete:** Sessions are soft-deleted (marked with `isDiscarded: true`) rather than being permanently removed from the database.

2. **Completed Sessions:** Only non-completed sessions can be discarded. Completed sessions should be preserved for reference.

3. **Authorization:** The API requires the `externalId` parameter to verify session ownership before allowing discard operations.

4. **Auto-discard:** The widget automatically discards auto-saved sessions (named "Draft...") when the user clicks "Start Over". User-named sessions require confirmation.

5. **Session Lists:** All session list endpoints automatically exclude discarded sessions from results.

## Testing
Use the provided test script to verify the discard functionality:
```bash
node test-session-discard.js
```

This will test:
- Creating and discarding sessions
- Verifying discarded sessions are excluded from lists
- Authorization checks
- Double-discard prevention
- Non-existent session handling