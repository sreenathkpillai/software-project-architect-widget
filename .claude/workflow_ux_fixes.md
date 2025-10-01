# Workflow UX Fixes Plan

## Issues to Fix Before Release

### 1. Pre-populate Repository URL in Connect Modal
**Problem**: User enters git URL during project creation, but when Connect Repository modal opens, the URL field is empty, forcing re-entry.

**Solution**:
- Pass the `repositoryUrl` from project data to the `RepositoryConnector` component
- Pre-populate the repository URL input field if `project.repositoryUrl` exists
- Files to modify:
  - `components/workflow/ProjectDashboard.tsx` - Pass project data to RepositoryConnector
  - `components/workflow/RepositoryConnector.tsx` - Accept and use initial repository URL

### 2. GitHub Auth State Detection & Display
**Problem**: When user is already authenticated with GitHub, the modal still shows "Connect GitHub" flow, but clicking does nothing since they're already authenticated.

**Root Cause**:
- GitHub auth state is stored in component state but resets on modal open
- No persistence/checking of existing GitHub authentication

**Solution**:
- Check for existing GitHub auth on component mount
- Store GitHub auth state in localStorage or sessionStorage
- Show authenticated state immediately if user has valid token
- Implementation approach:
  ```typescript
  useEffect(() => {
    // Check for existing GitHub auth
    const storedAuth = localStorage.getItem('github_auth');
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      setGithubAuth({
        isAuthenticated: true,
        username: authData.username,
        token: authData.token
      });
    }
  }, []);
  ```

### 3. Smooth Auth Flow Transition
**Problem**: After GitHub auth, the UI doesn't update to show authenticated state clearly.

**Solution**:
- Add clear visual feedback when authenticated
- Show GitHub username and "Connected" status
- Auto-focus on repository URL field after successful auth
- Consider auto-closing modal after successful connection

## Implementation Steps

### Phase 1: Pre-populate Repository URL
1. Update `ProjectDashboard.tsx`:
   - Pass `project` prop to `RepositoryConnector`
2. Update `RepositoryConnector.tsx`:
   - Accept `project` prop
   - Initialize `repositoryUrl` state with `project?.repositoryUrl || ''`

### Phase 2: Fix GitHub Auth State
1. Update `RepositoryConnector.tsx`:
   - Add `useEffect` to check localStorage for existing GitHub auth
   - Update auth state immediately if found
   - Show appropriate UI based on auth state

2. Update GitHub callback handling:
   - Store auth data in localStorage after successful auth
   - Clear localStorage on logout/disconnect

### Phase 3: Improve Auth UI Feedback
1. Enhanced authenticated state display:
   - Show green checkmark with "GitHub Connected"
   - Display GitHub username
   - Hide "Connect to GitHub" button when authenticated

2. Auto-progression:
   - After GitHub auth, auto-focus repository URL field
   - After successful repository connection, auto-close modal

## Files to Modify

1. **`components/workflow/RepositoryConnector.tsx`**
   - Add props interface for initial repository URL
   - Implement localStorage auth checking
   - Improve authenticated state UI
   - Pre-populate repository URL

2. **`components/workflow/ProjectDashboard.tsx`**
   - Pass project data to RepositoryConnector
   - Ensure modal receives necessary props

3. **`app/api/auth/github/callback/route.ts`** (if needed)
   - Ensure auth data is properly stored for persistence

## Testing Checklist

- [ ] Create project with repository URL → Connect modal shows pre-filled URL
- [ ] Authenticate with GitHub → Close modal → Reopen → Still shows authenticated
- [ ] Already authenticated → Open modal → Shows authenticated state immediately
- [ ] Connect repository with pre-filled URL → Works without re-typing
- [ ] Refresh page → GitHub auth persists
- [ ] Different users (externalIds) → Separate auth states

## Expected User Flow After Fix

1. User creates project with optional git URL
2. Connect Repository modal opens with URL pre-filled
3. If not authenticated:
   - User clicks "Connect to GitHub"
   - OAuth flow completes
   - Modal shows "Connected" with username
4. If already authenticated:
   - Modal immediately shows "Connected" with username
   - Repository URL field is focused and pre-filled
5. User clicks "Connect Repository"
6. Success → Modal closes → Analysis begins

## Security Considerations

- Store GitHub token securely (consider encryption)
- Include externalId in storage key to prevent cross-user token access
- Clear tokens on logout
- Validate tokens before use