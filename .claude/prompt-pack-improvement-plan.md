# AI-Powered Prompt Pack Generation Plan

**Date**: January 2025
**Purpose**: Replace hardcoded pattern matching with GPT-5 powered analysis for accurate, context-aware prompt pack generation

## Problem Analysis

### Current Issues Identified
1. **Hardcoded Web Technology Bias**: Only looks for web frameworks, defaults to `['JavaScript', 'React', 'Node.js']`
2. **Generic Pattern Detection**: Web-centric patterns regardless of actual codebase (Component-based architecture, RESTful API design)
3. **Hardcoded Implementation Steps**: Generic web workflow (src/components, prisma/schema.prisma, etc.)
4. **Ignores Codebase Analysis**: Rich analysis content completely unused - just pattern matches keywords
5. **Poor Fallbacks**: Always defaults to web assumptions instead of "Unknown" or context-appropriate alternatives

### Example Failure
For C++ MFC Windows application:
- **Codebase Analysis**: "C++/MFC Windows application built with Visual Studio/MSBuild"
- **Generated Output**: `techStack: ['JavaScript']`, `patterns: ['Component-based architecture', 'RESTful API design']`
- **Should Generate**: `techStack: ['C++', 'MFC', 'Visual Studio']`, `patterns: ['MFC Document/View', 'Windows Message Handling']`

## Solution Strategy

### Phase 1: AI-Powered Context Extraction
Replace all hardcoded extraction methods with GPT-5 analysis:

1. **Tech Stack Detection** (`extractTechStack()`)
2. **Pattern Identification** (`extractPatterns()`)
3. **Architecture Analysis** (`extractArchitecture()`)
4. **Implementation Steps** (`generateImplementationSteps()`)
5. **Component Identification** (`identifyRelevantComponents()`)

### Phase 2: Intelligent Prompt Generation
Use extracted context to generate platform-appropriate prompts and workflows.

## Detailed Implementation Plan

### 1. Replace `buildImplementationPrompts()` Method

**Current Flow**:
```typescript
// Hardcoded extractions
const techStack = this.extractTechStack(codebaseOverview);  // BROKEN
const patterns = this.extractPatterns(codebaseOverview);    // BROKEN
const steps = this.generateImplementationSteps(story, codebaseOverview); // GENERIC
```

**New Flow**:
```typescript
// Single AI call for comprehensive analysis
const aiContext = await this.generateContextWithAI(story, codebaseOverview);
// Use AI context for all prompt pack components
```

### 2. AI Context Generation Prompt

**New Method**: `generateContextWithAI(story, codebaseAnalysis)`

**GPT-5 Prompt Structure**:
```
You are analyzing a codebase to generate implementation guidance for a user story.

CODEBASE ANALYSIS:
${codebaseAnalysis}

USER STORY:
Title: ${story.title}
Description: ${story.description}
Priority: ${story.priority}

Based on the codebase analysis, generate a JSON response with:

{
  "techStack": [
    // Actual technologies used (e.g., ["C++", "MFC", "Visual Studio"] or ["Python", "Django", "PostgreSQL"])
    // Extract from analysis, don't assume web technologies
  ],
  "patterns": [
    // Actual architectural patterns (e.g., ["MVC", "Observer Pattern"] or ["Microservices", "Event-driven"])
    // Match the platform/language identified
  ],
  "architecture": "Concise description of actual architecture from analysis",
  "relevantComponents": [
    // Actual files/modules that would be modified for this story
    // Based on codebase structure, not assumed web paths
  ],
  "implementationSteps": [
    {
      "order": 1,
      "task": "Platform-specific task name",
      "location": "Actual file/directory path from analysis",
      "details": "Specific implementation details for this codebase",
      "estimatedTime": "realistic estimate"
    }
    // Generate 5-8 context-appropriate steps
  ],
  "testingRequirements": [
    // Platform-appropriate testing approaches
    // e.g., ["Unit tests with Google Test"] for C++ or ["Jest/RTL component tests"] for React
  ],
  "platformSpecificNotes": "Important considerations for this specific platform/stack"
}

Requirements:
- Extract actual technologies from the analysis, don't assume web stack
- Generate implementation steps that match the actual codebase structure
- Use realistic file paths and commands from the analysis
- Be specific about the platform (Windows Desktop, Web App, CLI tool, etc.)
- If analysis is insufficient, use "Unknown" rather than web defaults
```

### 3. Updated Prompt Pack Flow

**New `buildImplementationPrompts()` Method**:
```typescript
private async buildImplementationPrompts(
  story: WorkflowStory & { project: any },
  analysis: WorkflowCodebaseAnalysis | null
): Promise<PromptPackData> {
  const codebaseOverview = analysis?.content || 'No codebase analysis available';

  // Single AI call for comprehensive context
  const aiContext = await this.generateContextWithAI(story, codebaseOverview);

  // Generate phase-specific prompts using AI context
  const prompts = this.generatePhasePrompts(story, codebaseOverview, aiContext.implementationSteps);

  const promptPackData: PromptPackData = {
    story: {
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria || '',
      priority: story.priority,
      storyPoints: story.storyPoints || undefined
    },
    context: {
      codebaseOverview: codebaseOverview.substring(0, 2000),
      relevantComponents: aiContext.relevantComponents,
      techStack: aiContext.techStack,
      patterns: aiContext.patterns,
      architecture: aiContext.architecture
    },
    implementation: {
      steps: aiContext.implementationSteps,
      testingRequirements: aiContext.testingRequirements,
      acceptanceCriteria: this.parseAcceptanceCriteria(story.acceptanceCriteria)
    },
    prompts,
    metadata: {
      generatedAt: new Date().toISOString(),
      projectName: story.project.name,
      storyId: story.id,
      version: '2.0', // Increment for AI-powered version
      platformSpecificNotes: aiContext.platformSpecificNotes
    }
  };

  return promptPackData;
}
```

### 4. Enhanced Prompt Generation

**Update `generatePhasePrompts()` to use AI context**:
- Replace generic web assumptions with platform-specific guidance
- Use actual file paths and commands from AI analysis
- Include platform-specific notes in prompts

### 5. Error Handling & Fallbacks

**Intelligent Fallback Strategy**:
```typescript
private async generateContextWithAI(story, codebaseAnalysis): Promise<AIGeneratedContext> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5', // Use GPT-5 as specified
      messages: [
        { role: 'system', content: 'You are a senior software architect...' },
        { role: 'user', content: this.buildContextPrompt(story, codebaseAnalysis) }
      ],
      max_completion_tokens: 2000,
      temperature: 0.2 // Low temperature for consistent, factual analysis
    });

    const aiContext = JSON.parse(response.choices[0].message.content);
    return this.validateAIContext(aiContext);

  } catch (error) {
    console.error('AI context generation failed:', error);
    return this.generateBasicFallback(story, codebaseAnalysis);
  }
}

private generateBasicFallback(story, analysis): AIGeneratedContext {
  return {
    techStack: ['Unknown platform'],
    patterns: ['Unknown patterns'],
    architecture: 'Unable to determine architecture',
    relevantComponents: ['See codebase analysis for guidance'],
    implementationSteps: [
      {
        order: 1,
        task: 'Analyze codebase structure',
        location: 'Project root',
        details: 'Review the codebase analysis to understand project structure',
        estimatedTime: '30 minutes'
      },
      {
        order: 2,
        task: 'Implement feature',
        location: 'Appropriate location based on analysis',
        details: story.description,
        estimatedTime: '2-4 hours'
      }
    ],
    testingRequirements: ['Implement appropriate tests for the platform'],
    platformSpecificNotes: 'AI analysis failed - refer to codebase analysis for implementation guidance'
  };
}
```

## Benefits of This Approach

### 1. **Context Awareness**
- Actual tech stack detection (C++/MFC vs React/Node.js vs Python/Django)
- Platform-appropriate patterns and workflows
- Real file paths and project structure

### 2. **Quality Improvement**
- Implementation steps match actual codebase structure
- Testing recommendations appropriate for platform
- Realistic time estimates based on platform complexity

### 3. **Maintainability**
- Single AI prompt replaces 6+ hardcoded extraction methods
- Easy to improve by refining prompt rather than updating regex patterns
- Self-adapting to new technologies and patterns

### 4. **Fallback Safety**
- Graceful degradation when AI fails
- Clear indication when analysis is insufficient
- No false web technology assumptions

## Implementation Phases

### Phase 1: Core AI Integration (Day 1)
1. Add `generateContextWithAI()` method with GPT-5 integration
2. Replace hardcoded extractions in `buildImplementationPrompts()`
3. Add error handling and fallback logic

### Phase 2: Enhanced Prompts (Day 2)
1. Update `generatePhasePrompts()` to use AI context
2. Add platform-specific notes to generated prompts
3. Improve prompt quality with actual file paths and commands

### Phase 3: Testing & Validation (Day 3)
1. Test with various codebase types (C++, Python, Java, etc.)
2. Validate AI responses and fallback handling
3. Refine prompts based on output quality

### Phase 4: Deployment (Day 4)
1. Deploy with feature flag for gradual rollout
2. Monitor AI API usage and costs
3. Gather feedback on prompt pack quality

## Cost Considerations

**GPT-5 Token Usage Estimate**:
- Context analysis prompt: ~1,500 tokens input
- Expected response: ~800 tokens output
- Cost per prompt pack: ~$0.02-0.03
- Volume: Estimated 100-200 prompt packs/month = $2-6/month

**ROI**: Significantly improved prompt pack quality and developer productivity vs minimal AI costs.

## Success Metrics

1. **Accuracy**: Tech stack and patterns match actual codebase (vs current 0% for non-web)
2. **Relevance**: Implementation steps use actual file paths and project structure
3. **Platform Coverage**: Works correctly for C++, Python, Java, Go, Rust, etc.
4. **Quality**: AI-generated steps are actionable and platform-appropriate

This plan will transform prompt pack generation from hardcoded web assumptions to intelligent, context-aware analysis that actually understands and works with any codebase.