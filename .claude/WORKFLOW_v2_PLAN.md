# Workflow v2 Implementation Plan

## Overview
A simplified workflow management tool for software project architecture that streamlines the process from codebase analysis to story implementation.

## Core User Flow
1. **Create Project** → Connect to existing repository
2. **Analyze Codebase** → Generate compacted analysis MD file
3. **Workflow Dashboard** → Split view interface:
   - Left: View/update codebase analysis
   - Right: Manage stories and generate prompt packs

## Current Codebase Analysis

### ✅ Already Implemented (Foundation)
- **Database Setup**: PostgreSQL with Prisma ORM configured
- **Authentication System**: Complete external ID verification system (`lib/auth.ts`)
- **API Infrastructure**: Next.js API routes with proper structure
- **Widget Framework**: Full widget app system with theming (`components/WidgetApp.tsx`)
- **Dev Environment**: Next.js 14, TypeScript, Tailwind CSS configured
- **Package Dependencies**: AI SDKs (OpenAI, Anthropic), file handling, markdown support

### 🔧 Existing Database Models (To Extend)
Current schema includes: `IntroBrief`, `SavedSession`, `ChatMessage`, `Specification`, `analysis_sessions`, etc.
- Need to **ADD** workflow-specific models alongside existing ones
- Current auth system already handles `externalId` properly

### 🔧 Existing API Structure (To Extend)
Current endpoints: `/api/auth/*`, `/api/sessions/*`, `/api/chat/*`, etc.
- Need to **ADD** new `/api/workflow/*` endpoints alongside existing ones

### 🔧 Existing Components (To Extend)
Current: `WidgetApp`, `IntroChat`, `DocumentViewer`, etc.
- Need to **ADD** workflow components that integrate with existing widget framework

## What Needs To Be Built (NEW Implementation)

### Tech Stack (Building Upon Existing)
- **Frontend**: ✅ Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: ✅ Next.js API Routes
- **Database**: ✅ PostgreSQL with Prisma ORM
- **Authentication**: ✅ External ID verification (for ChainCatalyst integration)
- **AI Integration**: ✅ OpenAI/Anthropic SDKs installed
- **Git Integration**: 🆕 NEW - Simple Git operations via Node.js

## 🆕 NEW Database Models (To Add to Existing Schema)

### Workflow-Specific Models (Addition to Current Schema)

```prisma
// ADD these models to existing schema.prisma
model WorkflowProject {
  id              String           @id @default(cuid())
  externalId      String           // Links to ChainCatalyst user
  name            String
  description     String?
  repositoryUrl   String?
  repositoryPath  String?
  branch          String           @default("main")
  analysisStatus  AnalysisStatus   @default(PENDING)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  codebaseAnalysis WorkflowCodebaseAnalysis?
  stories         WorkflowStory[]
  promptPacks     WorkflowPromptPack[]

  @@index([externalId])
  @@map("workflow_projects")
}

model WorkflowCodebaseAnalysis {
  id              String   @id @default(cuid())
  projectId       String   @unique
  content         String   @db.Text // Markdown content
  version         Int      @default(1)
  analyzedAt      DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         WorkflowProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("workflow_codebase_analyses")
}

model WorkflowStory {
  id              String       @id @default(cuid())
  projectId       String
  externalId      String?      // For imported stories from JIRA/DevOps
  title           String
  description     String       @db.Text
  acceptanceCriteria String?   @db.Text
  priority        Priority     @default(MEDIUM)
  status          StoryStatus  @default(TODO)
  source          StorySource  @default(MANUAL)
  sourceId        String?      // Architect session ID or external system ID
  storyPoints     Int?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  project         WorkflowProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  promptPacks     WorkflowPromptPack[]

  @@index([projectId])
  @@index([externalId])
  @@map("workflow_stories")
}

model WorkflowPromptPack {
  id              String   @id @default(cuid())
  projectId       String
  storyId         String
  name            String
  content         Json     // Structured prompt data
  downloadUrl     String?  // Temporary download URL
  createdAt       DateTime @default(now())

  project         WorkflowProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  story           WorkflowStory    @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([storyId])
  @@map("workflow_prompt_packs")
}

enum AnalysisStatus {
  PENDING
  ANALYZING
  COMPLETED
  FAILED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum StoryStatus {
  TODO
  IN_PROGRESS
  READY_FOR_IMPLEMENTATION
  COMPLETED
}

enum StorySource {
  MANUAL
  JIRA
  AZURE_DEVOPS
  ARCHITECT
  GITHUB_ISSUES
}
```

## 🆕 NEW API Endpoints (To Add Alongside Existing)

Current API structure includes: `/api/auth/*`, `/api/sessions/*`, `/api/chat/*`, etc.

### New Workflow API Endpoints (Addition to Current APIs)

#### Project Management
- 🆕 `POST /api/workflow/projects` - Create new project
- 🆕 `GET /api/workflow/projects` - List all projects for externalId
- 🆕 `GET /api/workflow/projects/[id]` - Get project details
- 🆕 `PATCH /api/workflow/projects/[id]` - Update project
- 🆕 `DELETE /api/workflow/projects/[id]` - Delete project

#### Repository & Analysis
- 🆕 `POST /api/workflow/projects/[id]/connect` - Connect to repository
- 🆕 `POST /api/workflow/projects/[id]/analyze` - Trigger codebase analysis
- 🆕 `GET /api/workflow/projects/[id]/analysis` - Get analysis content
- 🆕 `PATCH /api/workflow/projects/[id]/analysis` - Update analysis content

#### Story Management
- 🆕 `POST /api/workflow/projects/[id]/stories` - Create story
- 🆕 `GET /api/workflow/projects/[id]/stories` - List project stories
- 🆕 `PATCH /api/workflow/stories/[id]` - Update story
- 🆕 `DELETE /api/workflow/stories/[id]` - Delete story
- 🆕 `POST /api/workflow/projects/[id]/stories/import` - Import from external source
- 🆕 `POST /api/workflow/projects/[id]/stories/generate` - Generate from architect

#### Prompt Pack Generation
- 🆕 `POST /api/workflow/stories/[id]/prompt-packs` - Generate prompt pack
- 🆕 `GET /api/workflow/prompt-packs/[id]` - Get prompt pack
- 🆕 `GET /api/workflow/prompt-packs/[id]/download` - Download prompt pack

## 🆕 NEW Components (To Add Alongside Existing)

Current components include: `WidgetApp`, `IntroChat`, `DocumentViewer`, etc.

### New Workflow Pages (Integration with Existing Widget)
```
app/
  workflow/                     # 🆕 NEW workflow pages
    page.tsx                    # Project list/dashboard
    projects/
      [id]/
        page.tsx               # Project architect dashboard
```

### New Workflow Components (Addition to Current Components)
```
components/
  workflow/                     # 🆕 NEW workflow component directory
    # Layout Components
    WorkflowApp.tsx            # Main workflow app (like existing WidgetApp)
    WorkflowLayout.tsx         # Layout wrapper
    ProjectDashboard.tsx       # Split-view dashboard

    # Project Management
    ProjectList.tsx            # List of projects
    CreateProjectModal.tsx     # Project creation flow
    ProjectCard.tsx            # Project card display

    # Repository & Analysis
    RepositoryConnector.tsx    # Git repo connection UI
    CodebaseAnalyzer.tsx       # Analysis viewer/editor (left panel)
    AnalysisStatus.tsx         # Analysis progress indicator

    # Story Management
    StoryManager.tsx           # Story list/management (right panel)
    StoryCard.tsx              # Individual story display
    CreateStoryModal.tsx       # Manual story creation
    ImportStoriesModal.tsx     # Import from external sources
    GenerateStoriesModal.tsx   # Generate from architect

    # Prompt Pack
    PromptPackGenerator.tsx    # Generate prompt pack from story
    PromptPackViewer.tsx       # View/download prompt pack

    # Shared (can reuse existing)
    # ✅ LoadingSpinner - use existing patterns
    # ✅ ErrorMessage - use existing patterns
```

## 🆕 NEW Services (To Add Alongside Existing)

Current services include: `WidgetAuth` (`lib/auth.ts`), database utils, etc.

### New Workflow Services (Addition to Current Services)
```typescript
// 🆕 lib/workflow/project-service.ts
export class WorkflowProjectService {
  async createProject(externalId: string, data: CreateProjectDto)
  async getProjects(externalId: string)
  async getProject(id: string, externalId: string)
  async updateProject(id: string, externalId: string, data: UpdateProjectDto)
  async deleteProject(id: string, externalId: string)
  async connectRepository(projectId: string, repoUrl: string, externalId: string)
}

// 🆕 lib/workflow/analysis-service.ts
export class WorkflowAnalysisService {
  async analyzeCodebase(projectId: string, externalId: string)
  async getAnalysis(projectId: string, externalId: string)
  async updateAnalysis(projectId: string, content: string, externalId: string)
  private generateCompactedAnalysis(repoPath: string)
  private parseFileStructure(path: string)
  private identifyKeyComponents(files: FileInfo[])
  private generateSummary(components: ComponentInfo[])
}

// 🆕 lib/workflow/story-service.ts
export class WorkflowStoryService {
  async createStory(projectId: string, data: CreateStoryDto, externalId: string)
  async getStories(projectId: string, externalId: string)
  async updateStory(id: string, data: UpdateStoryDto, externalId: string)
  async deleteStory(id: string, externalId: string)
  async importFromJira(projectId: string, config: JiraConfig, externalId: string)
  async importFromAzureDevOps(projectId: string, config: AzureConfig, externalId: string)
  async generateFromArchitect(projectId: string, sessionId: string, externalId: string)
}

// 🆕 lib/workflow/prompt-pack-service.ts
export class WorkflowPromptPackService {
  async generatePromptPack(storyId: string, externalId: string)
  async getPromptPack(id: string, externalId: string)
  async downloadPromptPack(id: string, externalId: string)
  private buildImplementationPrompts(story: WorkflowStory, analysis: WorkflowCodebaseAnalysis)
  private formatForAITool(prompts: Prompt[])
}

// 🆕 lib/workflow/git-service.ts (NEW)
export class WorkflowGitService {
  async cloneRepository(url: string, localPath: string)
  async getRepositoryInfo(path: string)
  async getBranches(path: string)
  async getCommits(path: string, limit?: number)
}
```

## 🚀 Implementation Phases (Building on Existing Foundation)

### Phase 1: Database & API Foundation
- [ ] 🔧 **EXTEND** database schema with workflow models (to existing schema.prisma)
- [ ] 🆕 **CREATE** workflow API structure (/api/workflow/*)
- [ ] 🔧 **REUSE** existing authentication middleware (already implemented)
- [ ] 🆕 **CREATE** project service and endpoints

### Phase 2: Repository Integration
- [ ] 🆕 **CREATE** repository connection service
- [ ] 🆕 **BUILD** codebase analysis service (using existing AI SDKs)
- [ ] 🆕 **CREATE** analysis generation logic
- [ ] 🆕 **ADD** analysis API endpoints

### Phase 3: Story Management
- [ ] 🆕 **CREATE** story service
- [ ] 🆕 **IMPLEMENT** CRUD operations
- [ ] 🆕 **ADD** import from JIRA
- [ ] 🆕 **ADD** import from Azure DevOps
- [ ] 🔧 **INTEGRATE** with existing architect sessions (SavedSession model)

### Phase 4: Prompt Pack Generation
- [ ] 🆕 **BUILD** prompt pack service (using existing AI SDKs)
- [ ] 🆕 **CREATE** generation algorithm
- [ ] 🆕 **IMPLEMENT** download functionality (using existing file utils)
- [ ] 🆕 **ADD** API endpoints

### Phase 5: UI Implementation
- [ ] 🆕 **CREATE** WorkflowApp component (similar to existing WidgetApp)
- [ ] 🆕 **BUILD** project creation flow
- [ ] 🆕 **IMPLEMENT** split-view architect dashboard
- [ ] 🆕 **ADD** codebase analysis viewer/editor
- [ ] 🆕 **CREATE** story management UI
- [ ] 🆕 **ADD** prompt pack generation UI
- [ ] 🔧 **INTEGRATE** with existing widget theming system

### Phase 6: Integration & Testing
- [ ] 🔧 **INTEGRATE** with existing widget framework
- [ ] 🆕 **TEST** end-to-end workflow
- [ ] 🔧 **REUSE** existing error handling patterns
- [ ] 🔧 **LEVERAGE** existing performance optimization

## Key Features

### Codebase Analysis Format
```markdown
# Codebase Analysis - [Project Name]

## Overview
- Repository: [URL]
- Language: [Primary Language]
- Framework: [Main Framework]
- Last Analyzed: [Date]

## Architecture
### Structure
- /src
  - /components - React components
  - /api - API routes
  - /lib - Utility functions
  - /styles - CSS/styling

### Key Components
1. **Authentication System**
   - Location: /lib/auth
   - Purpose: Handle user authentication
   - Dependencies: JWT, bcrypt

2. **API Layer**
   - Location: /api
   - Purpose: Backend endpoints
   - Pattern: RESTful

### Database Schema
- Tables: [List]
- Relationships: [Key relationships]

### External Dependencies
- Production: [List]
- Development: [List]

## Technical Debt
- [Item 1]
- [Item 2]

## Recommendations
- [Suggestion 1]
- [Suggestion 2]
```

### Story Import Mappings

#### JIRA
- Summary → title
- Description → description
- Acceptance Criteria → acceptanceCriteria
- Story Points → storyPoints
- Priority → priority
- Issue Key → externalId

#### Azure DevOps
- Title → title
- Description → description
- Acceptance Criteria → acceptanceCriteria
- Effort → storyPoints
- Priority → priority
- Work Item ID → externalId

### Prompt Pack Structure
```json
{
  "story": {
    "title": "Story title",
    "description": "Full description",
    "acceptanceCriteria": "AC list"
  },
  "context": {
    "codebaseOverview": "From analysis",
    "relevantComponents": ["Component list"],
    "techStack": ["Technologies"],
    "patterns": ["Code patterns to follow"]
  },
  "implementation": {
    "steps": [
      {
        "order": 1,
        "task": "Task description",
        "location": "File/folder path",
        "details": "Specific instructions"
      }
    ],
    "testingRequirements": ["Test cases"],
    "acceptanceCriteria": ["Formatted AC"]
  },
  "prompts": [
    {
      "phase": "setup",
      "prompt": "Analyze the codebase at..."
    },
    {
      "phase": "implementation",
      "prompt": "Implement the following story..."
    },
    {
      "phase": "testing",
      "prompt": "Write tests for..."
    }
  ]
}
```

## 🎯 Success Metrics
- Project creation to analysis: < 30 seconds
- Story import time: < 5 seconds per story
- Prompt pack generation: < 10 seconds
- UI responsiveness: < 100ms for interactions
- Analysis file size: < 50KB compressed

## 🔒 Security Considerations (Building on Existing)
- ✅ **EXISTING**: External ID validation for all requests (already implemented)
- 🆕 **NEW**: Repository access via HTTPS only
- 🆕 **NEW**: No credential storage (use temporary tokens)
- 🆕 **NEW**: Sanitize all markdown content
- ✅ **EXISTING**: Rate limiting patterns (can reuse existing patterns)

## 🔗 Integration Points with Existing System
- **Authentication**: Use existing `WidgetAuth` and `externalId` system
- **Database**: Extend existing Prisma schema with workflow models
- **AI Integration**: Leverage existing OpenAI/Anthropic SDK setup
- **Widget Framework**: Build `WorkflowApp` similar to existing `WidgetApp`
- **Routing**: Add workflow routes alongside existing `/widget` routes
- **Theming**: Integrate with existing theme system

## 🚀 Future Enhancements (Post-MVP)
- GitHub/GitLab direct integration
- Real-time collaborative editing
- AI-powered story estimation
- Automated story prioritization
- Implementation progress tracking
- Multiple codebase analysis versions
- Analysis diff/comparison
- Bulk prompt pack generation

## 📋 Summary: What's Actually New vs. What Exists

### ✅ **LEVERAGE EXISTING** (60% of Foundation Already Built)
- Database setup & ORM
- Authentication system
- API routing structure
- Widget framework
- AI SDK integration
- Dev environment
- Theming system

### 🆕 **BUILD NEW** (40% Net New Implementation)
- Workflow database models (4 models)
- Workflow API endpoints (~12 endpoints)
- Workflow services (4 service classes)
- Workflow UI components (~15 components)
- Git integration service
- Codebase analysis logic
- Prompt pack generation

**Estimated Development Time**: 2-3 days instead of 1-2 weeks (due to existing foundation)