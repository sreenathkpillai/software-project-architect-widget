# Modular Widget Architecture Refactor Plan

## Executive Summary

This document outlines a comprehensive plan to transform the current Software Project Architect widget into a modular, multi-product AI agent platform. The refactor will enable the same UI/UX foundation to support multiple AI agent products (Architect, and future products) through a configurable widget-type system.

## Current Architecture Analysis

### Existing Structure Assessment

**Current Coupling Points:**
1. **Hard-coded System Prompts** - `SYSTEM_PROMPT` in `/api/chat/route.ts` is specific to architect functionality
2. **Fixed Session Types** - `SessionType = 'intro' | 'architect'` in `hooks/useSession.ts`
3. **Product-specific API Logic** - `/api/intro-chat/route.ts` contains architect-specific questions
4. **Embedded Business Logic** - Document types, workflow steps, and tools are architect-specific
5. **Theme System** - Already modular but currently limited to visual customization

**Strengths to Preserve:**
1. **Clean Theme System** - `lib/theme.ts` already supports dynamic theming
2. **Flexible Auth System** - `lib/auth.ts` and `lib/auth-store.tsx` are product-agnostic
3. **Session Management** - Database schema and session handling can be extended
4. **Widget Integration Pattern** - Parent app integration is well-designed
5. **Component Structure** - React components have good separation of concerns

### Current Data Flow
```
Parent App → Widget URL Params → WidgetApp → Auth → Session Hook → Chat Components → API Routes → Database
```

**Key Dependencies:**
- `WidgetApp.tsx` orchestrates the entire experience
- `useSession.ts` manages session state and transitions
- `/api/chat/route.ts` contains the core AI logic
- Database schema supports multiple session types

## Proposed Modular Architecture

### 1. Widget Type Configuration System

**Core Concept:** Introduce a `widgetType` parameter that determines the complete behavior, prompts, workflow, and capabilities of the widget.

```typescript
interface WidgetTypeConfig {
  id: string;                           // 'architect', 'copilot', 'analyst', etc.
  displayName: string;                  // "Software Project Architect"
  version: string;                      // "1.0.0"
  
  // Core behavior configuration
  systemPrompt: string;                 // Base AI system prompt
  capabilities: WidgetCapability[];     // Available features/tools
  sessionFlow: SessionFlowConfig;       // Intro questions and transitions
  
  // UI/UX configuration
  branding: WidgetBranding;            // Product-specific branding
  layout: LayoutConfig;                // Custom layout options
  
  // Business logic
  workflows: WorkflowConfig[];         // Multi-step processes
  integrations: IntegrationConfig[];   // External service configs
}
```

### 2. Product Plugin Architecture

**Directory Structure:**
```
/lib/products/
├── registry.ts                      # Product registry and loader
├── types.ts                         # Shared interfaces
├── architect/
│   ├── config.ts                    # Product configuration
│   ├── prompts/
│   │   ├── system.ts                # System prompts
│   │   ├── intro.ts                 # Intro questions
│   │   └── context.ts               # Context builders
│   ├── tools/
│   │   ├── specifications.ts        # Document tools
│   │   └── analysis.ts              # Analysis tools
│   ├── workflows/
│   │   ├── intro-to-architect.ts    # Session transitions
│   │   └── document-generation.ts   # Document workflow
│   └── api/
│       ├── chat-handler.ts          # Product-specific chat logic
│       └── session-handler.ts       # Session management
├── copilot/                         # Future product
│   └── ...
└── analyst/                         # Future product
    └── ...
```

### 3. Configuration-Driven API System

**Enhanced API Routes:**
```typescript
// /api/chat/route.ts becomes a dispatcher
export async function POST(request: NextRequest) {
  const { widgetType, sessionType } = await request.json();
  
  // Load product configuration
  const product = ProductRegistry.get(widgetType);
  const handler = await product.getChatHandler();
  
  // Delegate to product-specific handler
  return handler.handleChatRequest(request);
}
```

**Product-Specific Handlers:**
```typescript
// /lib/products/architect/api/chat-handler.ts
export class ArchitectChatHandler implements ChatHandler {
  async handleChatRequest(request: NextRequest): Promise<NextResponse> {
    const config = ArchitectConfig;
    const systemPrompt = this.buildSystemPrompt(config, sessionContext);
    const tools = this.getAvailableTools(config, sessionContext);
    
    // Use product-specific logic
    return this.processWithAI(systemPrompt, tools, messages);
  }
}
```

### 4. Dynamic Session Type System

**Enhanced Session Management:**
```typescript
interface SessionConfig {
  sessionType: string;                 // Dynamic instead of enum
  productId: string;                   // Widget type identifier
  workflowSteps: WorkflowStep[];       // Product-defined steps
  requiredData: RequiredDataField[];   // What data to collect
  transitionRules: TransitionRule[];   // When to move between steps
}

// Replace fixed SessionType enum
type SessionType = string;  // 'architect-intro', 'architect-main', 'copilot-setup', etc.
```

### 5. Component Factory Pattern

**Dynamic Component Loading:**
```typescript
interface ProductComponents {
  IntroComponent: React.ComponentType<IntroProps>;
  MainChatComponent: React.ComponentType<ChatProps>;
  DocumentViewer?: React.ComponentType<DocumentProps>;
  CustomSidebars?: React.ComponentType<SidebarProps>[];
}

// /components/WidgetApp.tsx
export default function WidgetApp({ widgetType }: { widgetType: string }) {
  const product = ProductRegistry.get(widgetType);
  const components = product.getComponents();
  
  return (
    <div>
      {sessionType.includes('intro') && (
        <components.IntroComponent {...introProps} />
      )}
      {sessionType.includes('main') && (
        <components.MainChatComponent {...chatProps} />
      )}
    </div>
  );
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. **Create Product Registry System**
   - Build `ProductRegistry` class for managing product configurations
   - Define base interfaces and types for product configs
   - Create loading mechanism for product modules

2. **Extract Architect Configuration**
   - Move current architect logic into `/lib/products/architect/`
   - Create `ArchitectConfig` with current system prompts and settings
   - Ensure backward compatibility during extraction

3. **Implement Widget Type Parameter**
   - Add `widgetType` URL parameter support
   - Update `WidgetApp.tsx` to accept and use widget type
   - Default to 'architect' for backward compatibility

### Phase 2: API Modularization (Week 2-3)
1. **Refactor Chat API**
   - Convert `/api/chat/route.ts` to a dispatcher
   - Create `ChatHandler` interface and architect implementation
   - Implement product-specific routing logic

2. **Modularize Session APIs**
   - Update session management to support dynamic session types
   - Modify database schema to store product context
   - Create product-specific session handlers

3. **Extract Tool Systems**
   - Move specification tools to architect product module
   - Create `ToolProvider` interface for extensible tools
   - Implement tool registration system

### Phase 3: Component Modularization (Week 3-4)
1. **Create Component Factory**
   - Build dynamic component loading system
   - Extract architect-specific components
   - Implement component registration pattern

2. **Enhance Theme System**
   - Extend theme system to support product-specific themes
   - Add branding configuration options
   - Create theme inheritance and override system

3. **Update Widget Integration**
   - Enhance parent app integration to support widget types
   - Update authentication to handle product context
   - Create product-specific configuration examples

### Phase 4: Testing & Optimization (Week 4-5)
1. **Backward Compatibility Testing**
   - Ensure all existing architect functionality works
   - Test session migrations and data integrity
   - Validate parent app integrations

2. **Performance Optimization**
   - Implement lazy loading for product modules
   - Optimize bundle splitting by product
   - Add caching for product configurations

3. **Documentation & Examples**
   - Create product development guide
   - Build example product template
   - Update integration documentation

## Database Schema Changes

### Required Migrations

```sql
-- Add product context to sessions
ALTER TABLE saved_sessions ADD COLUMN product_id VARCHAR(50) DEFAULT 'architect';
ALTER TABLE saved_sessions ADD COLUMN product_version VARCHAR(20) DEFAULT '1.0.0';

-- Update session types to be more flexible
ALTER TABLE saved_sessions ALTER COLUMN session_type TYPE VARCHAR(100);

-- Add product-specific metadata
ALTER TABLE saved_sessions ADD COLUMN product_metadata JSONB DEFAULT '{}';

-- Update indexes
CREATE INDEX idx_sessions_product ON saved_sessions(external_id, product_id, is_complete);
```

### Data Migration Strategy
1. **Backward Compatibility:** All existing sessions default to `product_id: 'architect'`
2. **Session Type Migration:** Convert `'intro'` → `'architect-intro'`, `'architect'` → `'architect-main'`
3. **Metadata Preservation:** Existing session data remains unchanged

## Configuration Examples

### Architect Product Configuration
```typescript
export const ArchitectConfig: WidgetTypeConfig = {
  id: 'architect',
  displayName: 'Software Project Architect',
  version: '1.0.0',
  
  systemPrompt: `# Unified Project Planning Assistant...`, // Current system prompt
  
  capabilities: [
    { id: 'document_generation', name: 'Specification Documents' },
    { id: 'technical_analysis', name: 'Technical Architecture' },
    { id: 'project_planning', name: 'Project Planning' }
  ],
  
  sessionFlow: {
    introQuestions: INTRO_QUESTIONS, // Current intro questions
    transitions: [
      { from: 'architect-intro', to: 'architect-main', trigger: 'completion' }
    ]
  },
  
  workflows: [
    {
      id: 'document_creation',
      steps: ['prd', 'frontend', 'backend', 'database_schema', ...],
      tools: ['save_specification_document']
    }
  ]
};
```

### Future Product Example - Code Copilot
```typescript
export const CopilotConfig: WidgetTypeConfig = {
  id: 'copilot',
  displayName: 'Code Copilot Assistant',
  version: '1.0.0',
  
  systemPrompt: `You are an expert code assistant that helps developers...`,
  
  capabilities: [
    { id: 'code_generation', name: 'Code Generation' },
    { id: 'code_review', name: 'Code Review' },
    { id: 'debugging', name: 'Debug Assistance' }
  ],
  
  sessionFlow: {
    introQuestions: [
      { field: 'codebase_type', question: 'What type of codebase are you working with?' },
      { field: 'primary_language', question: 'What\'s your primary programming language?' }
    ],
    transitions: [
      { from: 'copilot-setup', to: 'copilot-main', trigger: 'completion' }
    ]
  },
  
  workflows: [
    {
      id: 'code_assistance',
      steps: ['analyze', 'suggest', 'implement'],
      tools: ['generate_code', 'review_code', 'explain_code']
    }
  ]
};
```

## Migration & Backward Compatibility

### Compatibility Strategy
1. **URL Parameter Migration:**
   - `mode=architect` automatically maps to `widgetType=architect&sessionType=architect-main`
   - `mode=intro` maps to `widgetType=architect&sessionType=architect-intro`
   - Default behavior remains unchanged for existing integrations

2. **API Backward Compatibility:**
   - All existing API endpoints continue to work
   - New `widgetType` parameter is optional, defaults to 'architect'
   - Session type enum values are preserved with mapping to new dynamic types

3. **Database Migration:**
   - Gradual migration approach with default values
   - No breaking changes to existing session data
   - New fields are optional with sensible defaults

### Rollout Strategy
1. **Internal Testing Phase:** Deploy alongside existing system
2. **Opt-in Beta:** Allow early adopters to test new widget types
3. **Gradual Migration:** Migrate existing customers with communication
4. **Full Deployment:** Complete rollout with deprecation notices for old APIs

## Risk Assessment & Mitigation

### Technical Risks
1. **Performance Impact**
   - *Risk:* Dynamic loading might slow widget initialization
   - *Mitigation:* Implement efficient caching and lazy loading strategies

2. **Bundle Size Growth**
   - *Risk:* Multiple product configurations could increase bundle size
   - *Mitigation:* Use code splitting and dynamic imports for product modules

3. **Complexity Increase**
   - *Risk:* Added abstraction layers might make debugging harder
   - *Mitigation:* Comprehensive logging, clear error messages, and thorough documentation

### Business Risks
1. **Customer Disruption**
   - *Risk:* Changes might break existing customer integrations
   - *Mitigation:* Extensive backward compatibility testing and gradual rollout

2. **Development Velocity**
   - *Risk:* Initial refactor might slow feature development
   - *Mitigation:* Phased approach allowing parallel feature development

## Success Metrics

### Technical Metrics
- **Zero Breaking Changes:** All existing integrations continue working
- **Performance Baseline:** Widget load time remains within 10% of current performance
- **Code Quality:** Improved modularity with reduced coupling scores

### Business Metrics
- **Product Velocity:** New widget types can be developed in <2 weeks
- **Customer Adoption:** Seamless migration with <1% customer issues
- **Extensibility:** Framework supports 3+ different product types

## Future Extensibility

### Product Development Framework
The modular architecture will enable rapid development of new AI agent products:

1. **Template System:** Standardized product template for quick setup
2. **Shared Components:** Reusable UI components across products
3. **Common Services:** Shared auth, session management, and database services
4. **Plugin Ecosystem:** Potential for third-party product plugins

### Planned Product Extensions
1. **Business Analyst Agent:** Requirements gathering and process optimization
2. **DevOps Assistant:** Infrastructure and deployment planning
3. **Data Science Copilot:** Data analysis and ML model planning
4. **Product Manager Assistant:** Feature planning and roadmap creation

## Conclusion

This modular architecture refactor transforms the current specialized architect widget into a flexible, multi-product AI agent platform while maintaining full backward compatibility. The phased implementation approach minimizes risk while enabling rapid development of new AI agent products that share the same robust UI/UX foundation.

The architecture balances modularity with simplicity, avoiding over-engineering while providing the extensibility needed for a growing product suite. The configuration-driven approach ensures that new products can be developed efficiently while maintaining the high-quality user experience of the existing architect widget.