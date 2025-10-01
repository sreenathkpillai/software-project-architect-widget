# Codebase Analysis Logic Improvements

## Current State
The existing analysis logic in `lib/workflow/analysis-service.ts` provides basic codebase structure detection but lacks detailed framework identification, architectural patterns, and actionable insights for AI coding agents.

## Proposed Improvements

### 1. Enhanced Framework & Technology Detection
- **Frontend Frameworks**: React, Vue, Angular, Svelte, Next.js, Nuxt, Gatsby
- **Backend Frameworks**: Express, Fastify, Koa, NestJS, Django, Flask, Rails
- **Database Technologies**: PostgreSQL, MongoDB, Redis, Prisma, TypeORM, Sequelize
- **Build Tools**: Webpack, Vite, Rollup, Parcel, esbuild
- **Package Managers**: npm, yarn, pnpm, bun
- **UI Libraries**: Tailwind CSS, Material-UI, Ant Design, Bootstrap, Chakra UI
- **State Management**: Redux, Zustand, Jotai, Pinia, Vuex
- **Testing Frameworks**: Jest, Vitest, Cypress, Playwright, Testing Library

### 2. Structured Analysis Format
Replace current unstructured text with markdown sections:

```markdown
# Project Analysis: {project_name}

## 🚀 Quick Start
- **Primary Tech Stack**: [detected stack]
- **Development Commands**: [from package.json scripts]
- **Environment Setup**: [.env requirements, database setup]

## 📋 Project Overview
- **Type**: [Web App, API, Library, etc.]
- **Architecture**: [Monorepo, Microservices, Serverless, etc.]
- **Main Language**: [TypeScript, JavaScript, Python, etc.]

## 🛠 Technology Stack
### Frontend
- Framework: [React 18.x, Next.js 14.x, etc.]
- Styling: [Tailwind CSS, styled-components, etc.]
- State Management: [Redux, Context API, etc.]

### Backend
- Framework: [Express, Next.js API Routes, etc.]
- Database: [PostgreSQL with Prisma, etc.]
- Authentication: [NextAuth, custom JWT, etc.]

## 📁 Project Structure
[Current directory tree with explanations]

## 🎯 Entry Points
- **Main Application**: [app/page.tsx, src/index.js, etc.]
- **API Routes**: [app/api/, pages/api/, etc.]
- **Configuration**: [next.config.js, vite.config.ts, etc.]

## 🗺 API Routes Mapping
[Detected API endpoints with their purposes]

## 📝 Key Files by Development Task
### Adding New Features
- Components: [components/, src/components/]
- Pages: [app/, pages/]
- API: [app/api/, pages/api/]

### Styling & UI
- Global Styles: [globals.css, tailwind.config.js]
- Component Styles: [component patterns used]

### Database & Data
- Schema: [prisma/schema.prisma, models/]
- Migrations: [prisma/migrations/, db/migrate/]
- Seeds: [prisma/seed.ts, db/seeds/]

## 🔧 Development Workflow
- **Install**: [npm install, yarn, etc.]
- **Development**: [npm run dev, yarn dev, etc.]
- **Build**: [npm run build, yarn build, etc.]
- **Test**: [npm test, yarn test, etc.]
- **Deploy**: [deployment commands/config]

## 🏗 Code Patterns & Conventions
### Component Patterns
- [Functional components with hooks, TypeScript interfaces, etc.]

### API Patterns
- [RESTful routes, error handling, middleware patterns]

### State Management
- [How data flows through the application]

## 📊 Code Quality & Tools
- **Linting**: [ESLint configuration]
- **Formatting**: [Prettier configuration]
- **Type Checking**: [TypeScript setup]
- **Testing**: [Test setup and patterns]

## 🚨 Technical Debt & Recommendations
- [Areas needing improvement]
- [Suggested upgrades or refactoring]
- [Security considerations]

## 🎯 AI Coding Context
### For Feature Development
- [Key patterns to follow when adding features]
- [Common component structures]
- [API integration patterns]

### For Bug Fixes
- [Error handling patterns]
- [Debugging tools and logs]
- [Common issue areas]

### For Refactoring
- [Modernization opportunities]
- [Performance optimization areas]
- [Code organization improvements]
```

### 3. Enhanced Detection Logic

#### Multi-Source Detection Strategy
1. **README.md/README.txt** - Parse for explicit tech stack declarations
2. **package.json dependencies** - Comprehensive dependency analysis
3. **File patterns and structure** - Deep codebase structure analysis
4. **Configuration files** - Framework and tool configuration detection

All sources are analyzed in parallel and cross-referenced for complete accuracy.

#### README Analysis Patterns
```typescript
const readmePatterns = {
  techStack: [
    /(?:tech\s*stack|technology\s*stack|built\s*with|technologies)/i,
    /(?:frontend|front-end):\s*([^\n]+)/i,
    /(?:backend|back-end):\s*([^\n]+)/i,
    /(?:database):\s*([^\n]+)/i,
    /(?:hosting|deployed\s*on):\s*([^\n]+)/i,
    /(?:auth|authentication):\s*([^\n]+)/i,
    /(?:ci\/cd|deployment):\s*([^\n]+)/i
  ],
  frameworks: [
    /react/i, /vue/i, /angular/i, /svelte/i, /next\.?js/i, /nuxt/i,
    /nest\.?js/i, /express/i, /fastify/i, /django/i, /flask/i, /rails/i
  ],
  databases: [
    /postgresql|postgres/i, /mongodb/i, /mysql/i, /redis/i, /supabase/i,
    /prisma/i, /typeorm/i, /sequelize/i
  ]
}
```

#### Framework Detection Fallbacks
```typescript
const frameworkDetection = {
  'Next.js': {
    files: ['next.config.js', 'next.config.ts'],
    packageJson: ['next'],
    directories: ['app/', 'pages/']
  },
  'NestJS': {
    files: ['nest-cli.json'],
    packageJson: ['@nestjs/core', '@nestjs/common'],
    directories: ['src/modules/', 'src/controllers/']
  },
  'React': {
    packageJson: ['react', 'react-dom'],
    files: ['src/App.jsx', 'src/App.tsx']
  },
  // ... more frameworks
}
```

#### Architecture Pattern Detection
- **Monorepo**: presence of `workspaces` in package.json, `lerna.json`, `nx.json`
- **Microservices**: multiple service directories, docker-compose files
- **Serverless**: `serverless.yml`, `vercel.json`, `netlify.toml`
- **JAMstack**: static site generators, headless CMS integrations

#### Database Schema Analysis
- Parse Prisma schema files for model relationships
- Detect database migrations and their purposes
- Identify data flow patterns and API endpoint mappings

### 4. Actionable Insights Generation

#### Development Commands Discovery
- Parse `package.json` scripts for common development tasks
- Identify build, test, lint, and deployment commands
- Extract environment variable requirements from `.env.example`

#### Code Organization Analysis
- Identify component hierarchies and reusable patterns
- Map API routes to their database operations
- Detect authentication and authorization patterns

#### Performance & Security Recommendations
- Identify potential performance bottlenecks
- Suggest security improvements based on detected patterns
- Recommend modern alternatives for outdated dependencies

### 5. Implementation Strategy

#### Phase 1: Enhanced Detection Engine
1. Expand file pattern recognition in `analyzeCodebase()` function
2. Add framework-specific analysis modules
3. Implement structured markdown generation

#### Phase 2: Deep Analysis Features
1. Parse configuration files (package.json, tsconfig.json, etc.)
2. Analyze import/export patterns for dependency mapping
3. Generate API route documentation from code

#### Phase 3: AI Context Generation
1. Create development task-specific guidance
2. Generate component and API patterns documentation
3. Provide modernization and refactoring suggestions

### 6. Files to Modify

1. **`lib/workflow/analysis-service.ts`**
   - Enhance `analyzeCodebase()` with structured detection
   - Add framework-specific analyzers
   - Implement markdown template generation

2. **`lib/workflow/analyzers/`** (new directory)
   - `framework-detector.ts` - Framework and library detection
   - `structure-analyzer.ts` - Project structure analysis
   - `pattern-detector.ts` - Code pattern recognition
   - `markdown-generator.ts` - Structured output generation

3. **`lib/workflow/templates/`** (new directory)
   - Analysis markdown templates for different project types
   - Framework-specific analysis templates

### 7. Analysis Progress UX Enhancement

When analysis is regenerating, show loading state instead of stale data:

#### Implementation
- Add `analysisStatus` field to track: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `ERROR`
- Show "Regenerating Analysis..." interstitial with spinner when status is `IN_PROGRESS`
- Poll every 3 seconds to check analysis completion
- Replace old analysis only when new one is ready

#### UI States
```typescript
// When analysis is being regenerated
{analysisStatus === 'IN_PROGRESS' && (
  <div className="text-center py-12">
    <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
    <h3 className="text-lg font-medium text-white">Regenerating Analysis...</h3>
    <p className="text-gray-400">This may take a few minutes</p>
  </div>
)}
```

### 8. Expected Benefits

- **For Developers**: Clear project understanding, faster onboarding
- **For AI Agents**: Rich context for code generation and assistance
- **For Teams**: Standardized project documentation and insights
- **For Maintenance**: Technical debt identification and improvement suggestions
- **For UX**: Clear feedback during analysis regeneration process

This enhanced analysis will provide comprehensive, actionable insights that help both human developers and AI coding agents understand and work with the codebase effectively.