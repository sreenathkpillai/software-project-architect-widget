# AI Implementation Feature - Technical Architecture

This document describes the current implementation of the AI-powered code generation feature in the Workflow management system.

## Architecture Overview

The AI Implementation feature provides automated code generation from user stories using configurable AI providers (OpenAI, Anthropic, local models). It includes real-time streaming, Git integration, and file management capabilities.

### High-Level Flow
1. User selects a prompt pack for a user story
2. Implementation record is created in database
3. Real-time streaming begins via Server-Sent Events
4. AI generates code through multiple phases
5. Files are parsed and displayed in real-time
6. Git operations are performed (if configured)
7. Implementation results are stored

## Core Components

### 1. AIService (`/lib/ai-service.ts`)

**Purpose**: Abstraction layer for different AI providers

**Key Methods**:
- `generateImplementation(request)` - Single request/response generation
- `streamImplementation(request)` - Async generator for streaming
- `analyzeCode(code, language)` - Code quality analysis

**Provider Support**:
- **OpenAI**: Uses `openai` package, supports streaming via `chat.completions.create()`
- **Anthropic**: Uses `@anthropic-ai/sdk`, streams via `messages.create()`
- **Local Models**: HTTP requests to local inference servers (Ollama-style)

**Configuration**:
```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}
```

### 2. ImplementationOrchestrator (`/components/workflow/ImplementationOrchestrator.tsx`)

**Purpose**: React component for managing AI implementation UI and real-time updates

**Key Features**:
- Real-time progress tracking with visual indicators
- Live streaming output display
- Generated file management with syntax highlighting
- AI configuration settings (provider, model, options)
- Start/pause/stop controls

**State Management**:
```typescript
interface ImplementationStatus {
  phase: 'idle' | 'planning' | 'implementing' | 'testing' | 'reviewing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  output: string;
  errors: string[];
  files: Array<{ path: string; content: string; language: string }>;
}
```

**Event Handling**: Processes Server-Sent Events for real-time updates

### 3. GitService (`/lib/git-service.ts`)

**Purpose**: Git operations wrapper for repository management

**Key Methods**:
- `createBranch(branchName, checkout)` - Create feature branches
- `commit(message, author)` - Commit generated files
- `getDiff(staged)` - View changes
- `createPullRequest()` - GitHub integration

**Repository Assumptions**:
- Expects existing Git repository at `project.repositoryPath`
- Requires 'main' or 'master' branch to exist
- Uses local file system operations

## API Endpoints

### 1. Implementation CRUD (`/app/api/workflow/implementations/route.ts`)

**POST /api/workflow/implementations**
- Creates new implementation record
- Validates project, story, and prompt pack existence
- Stores configuration as JSON string
- Returns implementation with relations

**GET /api/workflow/implementations**
- Lists implementations with filtering
- Supports projectId, storyId, status filters
- Returns with full relations (project, story, promptPack)

**Request Validation**:
```typescript
const createImplementationSchema = z.object({
  projectId: z.string(),
  storyId: z.string(),
  promptPackId: z.string(),
  type: z.enum(['manual', 'platform']),
  config: z.object({
    provider: z.enum(['anthropic', 'openai', 'local']),
    model: z.string(),
    autoCommit: z.boolean().default(true),
    runTests: z.boolean().default(true),
    generateDocs: z.boolean().default(true),
  }),
});
```

### 2. Implementation Streaming (`/app/api/workflow/implementations/[id]/stream/route.ts`)

**GET /api/workflow/implementations/[id]/stream**
- Returns Server-Sent Events stream
- Manages complete implementation lifecycle
- Handles AI provider integration
- Performs Git operations
- Updates database status

**Stream Event Types**:
```typescript
interface StreamData {
  type: 'phase' | 'output' | 'file' | 'error' | 'complete';
  phase?: string;           // Current implementation phase
  message?: string;         // Status message
  progress?: number;        // Completion percentage
  content?: string;         // Streaming text content
  file?: {                 // Generated file
    path: string;
    content: string;
    language: string;
  };
  implementation?: any;     // Final result
}
```

**Implementation Phases**:
1. **Planning** (10%): Analyze story and create implementation plan
2. **Implementing** (30-70%): Generate code files with streaming
3. **Reviewing** (70%): Validate and improve generated code
4. **Committing** (85%): Git operations if enabled
5. **Completed** (100%): Finalize and store results

### 3. Implementation Control (`/app/api/workflow/implementations/[id]/stop/route.ts`)

**POST /api/workflow/implementations/[id]/stop**
- Cancels running implementation
- Updates status to 'cancelled'
- Cleanup operations

## Data Models (Prisma Schema)

### Implementation Model
```prisma
model Implementation {
  id           String   @id @default(cuid())
  projectId    String   @map("project_id")
  storyId      String   @map("story_id")
  promptPackId String   @map("prompt_pack_id")
  type         String   // 'manual' | 'platform'
  status       String   // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  config       String   @db.Text // JSON configuration
  output       String?  @db.Text // JSON results
  startedAt    DateTime? @map("started_at")
  completedAt  DateTime? @map("completed_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  externalId   String   @map("external_id")

  project    WorkflowProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  story      UserStory       @relation(fields: [storyId], references: [id], onDelete: Cascade)
  promptPack PromptPack      @relation(fields: [promptPackId], references: [id], onDelete: Cascade)
}
```

## Implementation Flow Details

### 1. Initialization
```typescript
// 1. Create implementation record
const implementation = await prisma.implementation.create({
  data: {
    projectId, storyId, promptPackId,
    type: 'platform',
    status: 'pending',
    config: JSON.stringify(aiConfig),
    externalId
  }
});

// 2. Start streaming endpoint
const eventSource = new EventSource(`/api/implementations/${id}/stream`);
```

### 2. AI Processing Pipeline
```typescript
// Parse prompt pack and context
const prompts = JSON.parse(implementation.promptPack.prompts);
const context = implementation.promptPack.context;

// Phase 1: Planning
const planningResponse = await aiService.generateImplementation({
  prompt: prompts.planning,
  context: context,
  language: 'typescript',
  framework: 'react'
});

// Phase 2: Implementation (Streaming)
for await (const chunk of aiService.streamImplementation({
  prompt: prompts.implementation,
  context: `${context}\n\nPlanning:\n${planningResponse.content}`
})) {
  // Parse files from streaming content
  // Send real-time updates via SSE
}
```

### 3. File Parsing from AI Output
```typescript
// Parse code blocks from AI response
const lines = chunk.split('\n');
for (const line of lines) {
  if (line.includes('```') && line.includes('/')) {
    // Start of new file: ```typescript src/components/Button.tsx
    const pathMatch = line.match(/```(\w+)?\s*(.+)/);
    currentFile = pathMatch[2];
    language = pathMatch[1] || 'typescript';
  } else if (line.includes('```') && !line.includes('/')) {
    // End of file block
    files.push({ path: currentFile, content: currentContent, language });
  } else if (inCodeBlock) {
    currentContent += line + '\n';
  }
}
```

### 4. Git Integration
```typescript
if (gitService && config.autoCommit) {
  // Create feature branch
  const branchName = `feature/${story.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  await gitService.createBranch(branchName);

  // Write files to repository
  for (const file of files) {
    const fullPath = path.join(repositoryPath, file.path);
    await fs.writeFile(fullPath, file.content);
  }

  // Commit changes
  const commitMessage = `feat: ${story.title}\n\n${story.description}`;
  await gitService.commit(commitMessage);
}
```

## Storage and Persistence

### Database Storage
- **Implementation records**: Stored in PostgreSQL via Prisma
- **Configuration**: JSON-serialized AI settings
- **Results**: JSON-serialized file outputs and metadata
- **Status tracking**: Real-time status updates

### Repository Storage
- **File system**: Generated files written directly to `project.repositoryPath`
- **Git history**: All changes committed to feature branches
- **Branch naming**: `feature/story-title-slugified`

### Memory Usage
- **Streaming**: Files processed and sent in real-time chunks
- **Temporary storage**: File content accumulated in memory during parsing
- **Event stream**: Long-running HTTP connections for real-time updates

## Configuration and Dependencies

### Environment Variables
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### AI Provider Dependencies
- `openai`: OpenAI API client
- `@anthropic-ai/sdk`: Anthropic Claude API client
- Custom HTTP client for local models

### Repository Dependencies
- Node.js `child_process.exec` for Git commands
- `fs/promises` for file system operations
- Local Git installation required

## Current Limitations and Assumptions

### Repository Requirements
1. **Local file system access**: Requires direct access to repository paths
2. **Git initialization**: Repositories must have initial commits and main branch
3. **Permission model**: No sandboxing or isolation between implementations
4. **Storage persistence**: All repositories assumed to be permanently accessible

### Scalability Constraints
1. **Concurrent implementations**: No limits on simultaneous AI requests
2. **Memory usage**: Full file contents loaded into memory during processing
3. **Long-running connections**: SSE streams kept open for entire implementation
4. **Repository conflicts**: No handling of concurrent modifications

### Cost Implications
1. **AI API costs**: Direct API calls to external providers with no rate limiting
2. **Storage costs**: All repositories stored indefinitely on file system
3. **Compute costs**: No resource limits on implementation duration or complexity
4. **Bandwidth**: Full streaming output transmitted in real-time

### Security Considerations
1. **Code execution**: No sandboxing of generated code
2. **File system access**: Direct write access to repository directories
3. **API key exposure**: Keys stored in server environment variables
4. **External repositories**: Direct Git operations without validation

## Integration Points

### Frontend Integration
- **StoryDetail component**: Triggers implementation via dropdown
- **Real-time UI**: Updates via EventSource connection
- **File viewer**: Displays generated code with syntax highlighting
- **Progress tracking**: Visual indicators for implementation phases

### Authentication
- **External ID verification**: All requests validated against session
- **Project ownership**: Implementations tied to authenticated user
- **API access control**: Headers required for all implementation endpoints

### Prompt Pack Integration
- **Dynamic prompts**: AI requests built from generated prompt packs
- **Context injection**: Story and project context automatically included
- **Customization support**: Framework and language preferences applied