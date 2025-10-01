# Workflow Fix Plan - Critical Issues Resolution

## Current State Analysis

### 🚨 Critical Issues Identified:
1. **All API calls failing with 404 errors** - Missing `/widget` prefix in some calls
2. **No repository connection flow** - Projects created without git integration
3. **Analyze Codebase button doesn't work** - Not hooked up to analysis service
4. **Story creation fails** - Missing proper API endpoint structure
5. **No Generate Prompt Pack functionality** - Button missing from story cards
6. **Missing API endpoints** - Several endpoints from plan not implemented

### 🔍 Root Cause Analysis:
- **API Prefix Issues**: Some components still missing `/widget` prefix
- **Missing Endpoints**: `/api/workflow/projects/[id]/stories` route missing
- **Broken Workflow**: No connection between project creation → repo connection → analysis → stories → prompt packs
- **UI Components**: Missing repository connection modal and prompt pack buttons

## 🛠️ Implementation Plan

### Phase 1: Fix API Endpoint Structure
1. **Create missing `/api/workflow/projects/[id]/stories/route.ts`**
2. **Fix remaining API calls missing `/widget` prefix**
3. **Add repository connection endpoint `/api/workflow/projects/[id]/connect`**
4. **Verify all endpoints work with proper authentication**

### Phase 2: Repository Connection Flow
1. **Add RepositoryConnector modal component**
2. **Wire project creation → repository connection flow**
3. **Enable repository URL input or Git clone functionality**
4. **Update project with repository information**

### Phase 3: Codebase Analysis Integration
1. **Wire up "Analyze Codebase" button to `/api/workflow/projects/[id]/analyze`**
2. **Implement actual analysis service integration**
3. **Show analysis progress and results**
4. **Enable analysis editing functionality**

### Phase 4: Story Management Enhancement
1. **Fix story creation with proper project relationship**
2. **Add "Generate Prompt Pack" button to StoryCard component**
3. **Wire prompt pack generation to analysis data**
4. **Add story import functionality**

### Phase 5: Complete Workflow Integration
1. **Test end-to-end flow: Project → Repository → Analysis → Stories → Prompt Packs**
2. **Add error handling and loading states**
3. **Ensure all functionality works properly**

## 📋 Detailed Implementation Tasks

### API Endpoints to Fix/Add:

#### ✅ Already Exist (but may have prefix issues):
- `GET /api/workflow/projects` ✅
- `POST /api/workflow/projects` ✅
- `GET /api/workflow/projects/[id]` ✅
- `GET /api/workflow/projects/[id]/analysis` ✅
- `POST /api/workflow/projects/[id]/analyze` ✅
- `PATCH /api/workflow/projects/[id]/analysis` ✅

#### 🆕 Need to Create:
- `POST /api/workflow/projects/[id]/connect` - Connect repository
- `GET /api/workflow/projects/[id]/stories` - List project stories
- `POST /api/workflow/projects/[id]/stories` - Create story for project

#### 🔧 Need to Fix:
- Move `/api/workflow/stories/route.ts` logic to project-specific endpoint
- Ensure all components use correct `/widget/api/workflow/*` paths

### UI Components to Fix/Add:

#### 🔧 Fix Existing:
- **ProjectDashboard**: Wire up analysis button
- **StoryCard**: Add "Generate Prompt Pack" button
- **CreateProjectModal**: Add repository connection step
- **CodebaseAnalyzer**: Connect to actual analysis service

#### 🆕 Add New:
- **RepositoryConnector**: Modal for Git repository connection
- **AnalysisProgress**: Show analysis status and progress
- **PromptPackButton**: Component for generating prompt packs

### Service Integration:

#### 🔧 Fix Services:
- **WorkflowAnalysisService**: Implement actual codebase analysis
- **WorkflowGitService**: Add repository cloning/connection
- **WorkflowPromptPackService**: Wire to analysis data

## 🎯 Success Criteria

### End-to-End Workflow Must Work:
1. ✅ **Create Project** → Success response, project appears in list
2. ✅ **Connect Repository** → Git URL or path input, repository connected
3. ✅ **Analyze Codebase** → Analysis runs, results displayed and editable
4. ✅ **Create Stories** → Stories can be created and appear in list
5. ✅ **Generate Prompt Packs** → Button appears, prompt packs generate successfully

### Technical Requirements:
- ✅ All API calls return 200/201 (no 404/500 errors)
- ✅ Database operations work correctly
- ✅ UI components render and function properly
- ✅ Loading states and error handling implemented
- ✅ Theme consistency maintained

## 🚀 Implementation Order

### 1. **Critical API Fixes** (15 minutes)
- Fix missing `/widget` prefixes
- Create missing stories endpoint
- Add repository connection endpoint

### 2. **Repository Connection** (20 minutes)
- Add repository connection modal
- Wire to project creation flow
- Update project with repository data

### 3. **Analysis Integration** (15 minutes)
- Connect analyze button to API
- Show analysis results
- Enable editing functionality

### 4. **Story & Prompt Pack Flow** (20 minutes)
- Fix story creation
- Add prompt pack generation
- Complete end-to-end workflow

### 5. **Testing & Polish** (10 minutes)
- Test complete workflow
- Fix any remaining issues
- Verify all functionality works

**Total Estimated Time: 80 minutes**

## 🔧 Technical Notes

### API Path Structure:
```
/widget/api/workflow/projects              - List/create projects
/widget/api/workflow/projects/[id]         - Project details/update/delete
/widget/api/workflow/projects/[id]/connect - Connect repository
/widget/api/workflow/projects/[id]/analyze - Trigger analysis
/widget/api/workflow/projects/[id]/analysis - Get/update analysis
/widget/api/workflow/projects/[id]/stories - List/create project stories
/widget/api/workflow/stories/[id]          - Story details/update/delete
/widget/api/workflow/stories/[id]/prompt-packs - Generate prompt pack
/widget/api/workflow/prompt-packs/[id]     - Get prompt pack details
```

### Database Schema (Already Applied):
- ✅ WorkflowProject
- ✅ WorkflowCodebaseAnalysis
- ✅ WorkflowStory
- ✅ WorkflowPromptPack

## 📝 Implementation Checklist

- [ ] Phase 1: Fix API endpoints and prefixes
- [ ] Phase 2: Add repository connection flow
- [ ] Phase 3: Wire up codebase analysis
- [ ] Phase 4: Fix stories and prompt pack generation
- [ ] Phase 5: Test complete end-to-end workflow
- [ ] Final: Verify all functionality works properly

**This plan will fix all identified issues and deliver a fully functional workflow system.**