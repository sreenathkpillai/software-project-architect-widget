import { prisma } from '@/lib/db';
import { WorkflowStory, WorkflowCodebaseAnalysis } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';

export interface Prompt {
  phase: string;
  prompt: string;
  context?: string;
  files?: string[];
}

export interface ImplementationStep {
  order: number;
  task: string;
  location: string;
  details: string;
  estimatedTime?: string;
}

export interface AIGeneratedContext {
  techStack: string[];
  patterns: string[];
  architecture: string;
  relevantComponents: string[];
  implementationSteps: ImplementationStep[];
  testingRequirements: string[];
  platformSpecificNotes: string;
}

export interface PromptPackData {
  story: {
    title: string;
    description: string;
    acceptanceCriteria: string;
    priority: string;
    storyPoints?: number;
  };
  context: {
    codebaseOverview: string;
    relevantComponents: string[];
    techStack: string[];
    patterns: string[];
    architecture: string;
  };
  implementation: {
    steps: ImplementationStep[];
    testingRequirements: string[];
    acceptanceCriteria: string[];
  };
  prompts: Prompt[];
  metadata: {
    generatedAt: string;
    projectName: string;
    storyId: string;
    version: string;
    platformSpecificNotes?: string;
  };
}

export class WorkflowPromptPackService {
  /**
   * Get existing prompt packs for a story
   */
  async getPromptPacksForStory(storyId: string, externalId: string): Promise<any[]> {
    // Get the story with project info
    const story = await prisma.workflowStory.findFirst({
      where: {
        id: storyId,
        project: { externalId }
      },
      include: {
        project: true,
        promptPacks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!story) {
      throw new Error('Story not found');
    }

    return story.promptPacks || [];
  }

  /**
   * Generate prompt pack for a story
   */
  async generatePromptPack(storyId: string, externalId: string): Promise<any> {
    try {
      // Get story with project and analysis
      const story = await prisma.workflowStory.findUnique({
        where: { id: storyId },
        include: {
          project: {
            include: {
              codebaseAnalysis: true
            }
          }
        }
      });

      if (!story || story.project.externalId !== externalId) {
        throw new Error('Story not found');
      }

      // Generate prompt pack data
      const promptPackData = await this.buildImplementationPrompts(story, story.project.codebaseAnalysis);

      // Create prompt pack record
      const promptPack = await prisma.workflowPromptPack.create({
        data: {
          projectId: story.projectId,
          storyId: story.id,
          name: `${story.title} - Implementation Guide`,
          content: promptPackData as any
        }
      });

      return promptPack;

    } catch (error) {
      console.error('Prompt pack generation error:', error);
      throw error;
    }
  }

  /**
   * Get prompt pack
   */
  async getPromptPack(id: string, externalId: string): Promise<any> {
    const promptPack = await prisma.workflowPromptPack.findUnique({
      where: { id },
      include: {
        story: {
          include: {
            project: {
              select: {
                externalId: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!promptPack || promptPack.story.project.externalId !== externalId) {
      throw new Error('Prompt pack not found');
    }

    return promptPack;
  }

  /**
   * Generate download URL for prompt pack
   */
  async downloadPromptPack(id: string, externalId: string): Promise<{ downloadUrl: string; filename: string }> {
    const promptPack = await this.getPromptPack(id, externalId);

    // Format prompt pack for download
    const formattedContent = this.formatForAITool(promptPack.content as PromptPackData);

    // Create temporary file
    const filename = `${promptPack.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.md`;
    const tempDir = path.join(process.cwd(), 'temp', 'downloads');

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, formattedContent);

    // Update prompt pack with download URL (temporary)
    const downloadUrl = `/api/workflow/prompt-packs/${id}/download?file=${filename}`;

    await prisma.workflowPromptPack.update({
      where: { id },
      data: { downloadUrl }
    });

    return { downloadUrl, filename };
  }

  /**
   * Build implementation prompts from story and analysis using AI
   */
  private async buildImplementationPrompts(
    story: WorkflowStory & { project: any },
    analysis: WorkflowCodebaseAnalysis | null
  ): Promise<PromptPackData> {
    const codebaseOverview = analysis?.content || 'No codebase analysis available';

    // Generate comprehensive context using AI
    const aiContext = await this.generateContextWithAI(story, codebaseOverview);

    // Generate acceptance criteria
    const acceptanceCriteria = this.parseAcceptanceCriteria(story.acceptanceCriteria || undefined);

    // Generate prompts for each phase using AI context
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
        codebaseOverview: codebaseOverview.substring(0, 2000), // Limit length
        relevantComponents: aiContext.relevantComponents,
        techStack: aiContext.techStack,
        patterns: aiContext.patterns,
        architecture: aiContext.architecture
      },
      implementation: {
        steps: aiContext.implementationSteps,
        testingRequirements: aiContext.testingRequirements,
        acceptanceCriteria
      },
      prompts,
      metadata: {
        generatedAt: new Date().toISOString(),
        projectName: story.project.name,
        storyId: story.id,
        version: '2.0', // AI-powered version
        platformSpecificNotes: aiContext.platformSpecificNotes
      }
    };

    return promptPackData;
  }

  /**
   * Generate comprehensive context using AI analysis
   */
  private async generateContextWithAI(
    story: WorkflowStory,
    codebaseAnalysis: string
  ): Promise<AIGeneratedContext> {
    try {
      const prompt = this.buildContextPrompt(story, codebaseAnalysis);
      console.log(`[AI Context] Prompt length: ${prompt.length} characters`);
      console.log(`[AI Context] Using model: ${AI_MODEL}`);

      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a senior software architect analyzing codebases to generate implementation guidance. Provide accurate, platform-specific analysis based on the actual codebase, not assumptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1
      });

      console.log(`[AI Context] Response status:`, response.choices?.length || 0, 'choices');

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[AI Context] Empty response from GPT-5:', {
          choices: response.choices,
          usage: response.usage,
          model: response.model
        });
        throw new Error('No response from AI');
      }

      console.log(`[AI Context] Received ${content.length} characters from GPT-5`);

      const aiContext = JSON.parse(content);
      return this.validateAIContext(aiContext);

    } catch (error) {
      console.error('AI context generation failed:', error);
      console.log('[AI Context] Falling back to basic implementation');
      return this.generateBasicFallback(story, codebaseAnalysis);
    }
  }

  /**
   * Build the AI context prompt
   */
  private buildContextPrompt(story: WorkflowStory, codebaseAnalysis: string): string {
    return `You are analyzing a codebase to generate implementation guidance for a user story.

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
- Ensure all JSON is valid and properly escaped`;
  }

  /**
   * Validate AI context response
   */
  private validateAIContext(aiContext: any): AIGeneratedContext {
    return {
      techStack: Array.isArray(aiContext.techStack) ? aiContext.techStack : ['Unknown'],
      patterns: Array.isArray(aiContext.patterns) ? aiContext.patterns : ['Unknown patterns'],
      architecture: typeof aiContext.architecture === 'string' ? aiContext.architecture : 'Unknown architecture',
      relevantComponents: Array.isArray(aiContext.relevantComponents) ? aiContext.relevantComponents : [],
      implementationSteps: Array.isArray(aiContext.implementationSteps) ? aiContext.implementationSteps : [],
      testingRequirements: Array.isArray(aiContext.testingRequirements) ? aiContext.testingRequirements : ['Add appropriate tests'],
      platformSpecificNotes: typeof aiContext.platformSpecificNotes === 'string' ? aiContext.platformSpecificNotes : ''
    };
  }

  /**
   * Generate basic fallback when AI fails
   */
  private generateBasicFallback(story: WorkflowStory, analysis: string): AIGeneratedContext {
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
        },
        {
          order: 3,
          task: 'Add tests',
          location: 'Test directory',
          details: 'Implement appropriate tests for the platform',
          estimatedTime: '1 hour'
        }
      ],
      testingRequirements: ['Implement appropriate tests for the platform'],
      platformSpecificNotes: 'AI analysis failed - refer to codebase analysis for implementation guidance'
    };
  }

  // Note: Hardcoded extraction methods replaced with AI-powered analysis

  /**
   * Parse acceptance criteria
   */
  private parseAcceptanceCriteria(criteria?: string): string[] {
    if (!criteria) {
      return ['Feature works as described', 'No errors in console', 'Responsive on all devices'];
    }

    // Split by lines and clean up
    return criteria
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-*•]\s*/, ''))
      .slice(0, 8); // Limit to 8 criteria
  }

  /**
   * Generate phase-specific prompts using AI context
   */
  private generatePhasePrompts(
    story: WorkflowStory,
    analysis: string,
    steps: ImplementationStep[]
  ): Prompt[] {
    const prompts: Prompt[] = [];

    // Setup phase
    prompts.push({
      phase: 'setup',
      prompt: `Analyze the existing codebase and plan the implementation for: "${story.title}"

Context:
${story.description}

Current codebase structure:
${analysis.substring(0, 1000)}

Please:
1. Identify which files need to be modified
2. Suggest the implementation approach
3. Highlight any potential conflicts or dependencies
4. Recommend the development timeline

Focus on maintaining consistency with existing code patterns and architecture.`,
      context: 'Initial analysis and planning'
    });

    // Implementation phase
    prompts.push({
      phase: 'implementation',
      prompt: `Implement the following user story step by step:

Story: ${story.title}
Description: ${story.description}
Priority: ${story.priority}

Implementation Steps:
${steps.map(step => `${step.order}. ${step.task} (${step.location}): ${step.details} [${step.estimatedTime}]`).join('\n')}

Requirements:
- Follow existing code patterns and style
- Use the project's actual build system and conventions
- Add proper error handling
- Include appropriate logging/debugging
- Follow platform-specific best practices

${story.acceptanceCriteria ? `\nAcceptance Criteria:\n${story.acceptanceCriteria}` : ''}

Start with step 1 and implement each step systematically.`,
      context: 'Full implementation guide'
    });

    // Testing phase
    prompts.push({
      phase: 'testing',
      prompt: `Create comprehensive tests for the implemented feature: "${story.title}"

Follow the testing patterns and frameworks identified in the codebase.

Implementation Steps Reference:
${steps.filter(step => step.task.toLowerCase().includes('test')).map(step => `- ${step.details}`).join('\n')}

Ensure all tests pass and provide good coverage for the new functionality. Use the project's existing testing infrastructure and conventions.`,
      context: 'Testing and quality assurance'
    });

    // Review phase
    prompts.push({
      phase: 'review',
      prompt: `Review the implementation of: "${story.title}"

Checklist:
- ✅ Code follows project conventions and patterns
- ✅ All acceptance criteria are met
- ✅ Tests are comprehensive and passing
- ✅ No performance regressions
- ✅ Platform-specific requirements addressed
- ✅ Error handling is robust
- ✅ Documentation updated if needed

Create a pull request with:
1. Clear description of changes
2. Evidence of functionality (screenshots, logs, etc.)
3. Test coverage report
4. Notes for reviewers

${story.acceptanceCriteria ? `\nVerify acceptance criteria:\n${story.acceptanceCriteria}` : ''}`,
      context: 'Final review and submission'
    });

    return prompts;
  }

  /**
   * Format prompt pack for AI tool consumption
   */
  private formatForAITool(promptPack: PromptPackData): string {
    return `# Implementation Guide: ${promptPack.story.title}

## Story Overview

**Title:** ${promptPack.story.title}
**Priority:** ${promptPack.story.priority}
${promptPack.story.storyPoints ? `**Story Points:** ${promptPack.story.storyPoints}` : ''}

**Description:**
${promptPack.story.description}

**Acceptance Criteria:**
${promptPack.story.acceptanceCriteria || 'No specific criteria provided'}

## Technical Context

### Codebase Overview
${promptPack.context.codebaseOverview}

### Technology Stack
${promptPack.context.techStack.map(tech => `- ${tech}`).join('\n')}

### Relevant Components
${promptPack.context.relevantComponents.map(comp => `- ${comp}`).join('\n')}

### Code Patterns
${promptPack.context.patterns.map(pattern => `- ${pattern}`).join('\n')}

### Architecture
${promptPack.context.architecture}

## Implementation Plan

### Steps
${promptPack.implementation.steps.map(step =>
  `**${step.order}. ${step.task}** (${step.estimatedTime})\n- Location: ${step.location}\n- Details: ${step.details}`
).join('\n\n')}

### Testing Requirements
${promptPack.implementation.testingRequirements.map(req => `- ${req}`).join('\n')}

### Acceptance Criteria Checklist
${promptPack.implementation.acceptanceCriteria.map(criteria => `- [ ] ${criteria}`).join('\n')}

### Platform-Specific Notes
${promptPack.metadata.platformSpecificNotes || 'No platform-specific considerations identified'}

## AI Prompts

### Phase 1: Setup & Planning
\`\`\`
${promptPack.prompts.find(p => p.phase === 'setup')?.prompt || 'Setup prompt not available'}
\`\`\`

### Phase 2: Implementation
\`\`\`
${promptPack.prompts.find(p => p.phase === 'implementation')?.prompt || 'Implementation prompt not available'}
\`\`\`

### Phase 3: Testing
\`\`\`
${promptPack.prompts.find(p => p.phase === 'testing')?.prompt || 'Testing prompt not available'}
\`\`\`

### Phase 4: Review
\`\`\`
${promptPack.prompts.find(p => p.phase === 'review')?.prompt || 'Review prompt not available'}
\`\`\`

---

*Generated on ${new Date(promptPack.metadata.generatedAt).toLocaleDateString()} for ${promptPack.metadata.projectName}*
*Version: ${promptPack.metadata.version}*
`;
  }
}