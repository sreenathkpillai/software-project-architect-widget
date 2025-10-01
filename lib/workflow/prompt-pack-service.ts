import { prisma } from '@/lib/db';
import { WorkflowStory, WorkflowCodebaseAnalysis } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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
  };
}

export class WorkflowPromptPackService {
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
   * Build implementation prompts from story and analysis
   */
  private async buildImplementationPrompts(
    story: WorkflowStory & { project: any },
    analysis: WorkflowCodebaseAnalysis | null
  ): Promise<PromptPackData> {
    const codebaseOverview = analysis?.content || 'No codebase analysis available';

    // Extract tech stack and patterns from analysis
    const techStack = this.extractTechStack(codebaseOverview);
    const patterns = this.extractPatterns(codebaseOverview);
    const relevantComponents = this.identifyRelevantComponents(story, codebaseOverview);

    // Generate implementation steps
    const steps = this.generateImplementationSteps(story, codebaseOverview);

    // Generate testing requirements
    const testingRequirements = this.generateTestingRequirements(story, techStack);

    // Generate acceptance criteria
    const acceptanceCriteria = this.parseAcceptanceCriteria(story.acceptanceCriteria || undefined);

    // Generate prompts for each phase
    const prompts = this.generatePhasePrompts(story, codebaseOverview, steps);

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
        relevantComponents,
        techStack,
        patterns,
        architecture: this.extractArchitecture(codebaseOverview)
      },
      implementation: {
        steps,
        testingRequirements,
        acceptanceCriteria
      },
      prompts,
      metadata: {
        generatedAt: new Date().toISOString(),
        projectName: story.project.name,
        storyId: story.id,
        version: '1.0'
      }
    };

    return promptPackData;
  }

  /**
   * Extract tech stack from codebase analysis
   */
  private extractTechStack(analysis: string): string[] {
    const techStack: string[] = [];

    // Common technology indicators
    const techPatterns = {
      'React': /react/i,
      'Next.js': /next\.?js/i,
      'TypeScript': /typescript|\.ts|\.tsx/i,
      'JavaScript': /javascript|\.js|\.jsx/i,
      'Node.js': /node\.?js|npm|yarn/i,
      'Express': /express/i,
      'Prisma': /prisma/i,
      'PostgreSQL': /postgresql|postgres/i,
      'MongoDB': /mongodb|mongoose/i,
      'Tailwind CSS': /tailwind/i,
      'CSS': /css|styling/i,
      'Python': /python|\.py/i,
      'Django': /django/i,
      'Flask': /flask/i,
      'FastAPI': /fastapi/i,
      'Vue.js': /vue\.?js/i,
      'Angular': /angular/i,
      'Docker': /docker/i,
      'AWS': /aws|amazon/i,
      'Vercel': /vercel/i
    };

    Object.entries(techPatterns).forEach(([tech, pattern]) => {
      if (pattern.test(analysis)) {
        techStack.push(tech);
      }
    });

    return techStack.length > 0 ? techStack : ['JavaScript', 'React', 'Node.js'];
  }

  /**
   * Extract coding patterns from analysis
   */
  private extractPatterns(analysis: string): string[] {
    const patterns: string[] = [];

    // Common pattern indicators
    if (/component|jsx|tsx/i.test(analysis)) patterns.push('Component-based architecture');
    if (/api|route|endpoint/i.test(analysis)) patterns.push('RESTful API design');
    if (/hook|use[A-Z]/i.test(analysis)) patterns.push('React Hooks pattern');
    if (/service|class/i.test(analysis)) patterns.push('Service layer pattern');
    if (/middleware/i.test(analysis)) patterns.push('Middleware pattern');
    if (/prisma|orm/i.test(analysis)) patterns.push('ORM/Database abstraction');
    if (/auth|login|jwt/i.test(analysis)) patterns.push('Authentication system');
    if (/test|spec/i.test(analysis)) patterns.push('Test-driven development');

    return patterns.length > 0 ? patterns : ['Component-based architecture', 'RESTful API design'];
  }

  /**
   * Identify components relevant to the story
   */
  private identifyRelevantComponents(story: WorkflowStory, analysis: string): string[] {
    const components: string[] = [];

    // Extract component mentions from analysis
    const componentPattern = /(?:components?|pages?|services?|utils?|lib|api)[\/\\]([^\/\\]+)/gi;
    let match;

    while ((match = componentPattern.exec(analysis)) !== null) {
      const component = match[1];
      if (component && !component.includes('.')) {
        components.push(component);
      }
    }

    // Add story-specific components
    const storyKeywords = story.title.toLowerCase().split(' ');
    storyKeywords.forEach(keyword => {
      if (keyword.length > 3) {
        components.push(`${keyword}Component`);
      }
    });

    return Array.from(new Set(components)).slice(0, 8); // Limit to 8 components
  }

  /**
   * Extract architecture information
   */
  private extractArchitecture(analysis: string): string {
    // Look for architecture section
    const archMatch = analysis.match(/(?:## Architecture|### Architecture)([\s\S]*?)(?:##|$)/i);
    if (archMatch) {
      return archMatch[1].trim().substring(0, 500);
    }

    // Fallback: extract structure information
    const structMatch = analysis.match(/(?:## Structure|### Structure)([\s\S]*?)(?:##|$)/i);
    if (structMatch) {
      return structMatch[1].trim().substring(0, 500);
    }

    return 'Standard web application architecture with frontend and backend components';
  }

  /**
   * Generate implementation steps
   */
  private generateImplementationSteps(story: WorkflowStory, analysis: string): ImplementationStep[] {
    const steps: ImplementationStep[] = [];

    // Basic implementation flow
    steps.push({
      order: 1,
      task: 'Create feature branch',
      location: 'Git repository',
      details: `Create a new branch for implementing: ${story.title}`,
      estimatedTime: '5 minutes'
    });

    steps.push({
      order: 2,
      task: 'Create/modify components',
      location: 'src/components',
      details: `Implement the UI components needed for: ${story.description}`,
      estimatedTime: '2-4 hours'
    });

    if (analysis.includes('api') || analysis.includes('backend')) {
      steps.push({
        order: 3,
        task: 'Implement API endpoints',
        location: 'api routes',
        details: `Create or modify API endpoints to support: ${story.title}`,
        estimatedTime: '1-2 hours'
      });
    }

    if (analysis.includes('database') || analysis.includes('prisma')) {
      steps.push({
        order: 4,
        task: 'Update database schema',
        location: 'prisma/schema.prisma',
        details: 'Add or modify database models if needed',
        estimatedTime: '30 minutes'
      });
    }

    steps.push({
      order: 5,
      task: 'Add styling',
      location: 'component styles',
      details: 'Style the components according to design system',
      estimatedTime: '1 hour'
    });

    steps.push({
      order: 6,
      task: 'Write tests',
      location: '__tests__ directory',
      details: 'Create unit and integration tests for the new functionality',
      estimatedTime: '1-2 hours'
    });

    steps.push({
      order: 7,
      task: 'Test and review',
      location: 'Local development',
      details: 'Test the implementation and create pull request',
      estimatedTime: '30 minutes'
    });

    return steps;
  }

  /**
   * Generate testing requirements
   */
  private generateTestingRequirements(story: WorkflowStory, techStack: string[]): string[] {
    const requirements: string[] = [];

    requirements.push('Unit tests for all new functions and components');
    requirements.push('Integration tests for user workflows');

    if (techStack.includes('React')) {
      requirements.push('Component rendering tests using React Testing Library');
    }

    if (story.description.toLowerCase().includes('api')) {
      requirements.push('API endpoint testing with proper error handling');
    }

    if (story.description.toLowerCase().includes('auth')) {
      requirements.push('Authentication and authorization testing');
    }

    requirements.push('Browser compatibility testing');
    requirements.push('Responsive design testing on mobile devices');

    return requirements;
  }

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
   * Generate phase-specific prompts
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
${steps.map(step => `${step.order}. ${step.task} (${step.location}): ${step.details}`).join('\n')}

Requirements:
- Follow existing code patterns and style
- Ensure responsive design
- Add proper error handling
- Include loading states where appropriate
- Maintain accessibility standards

${story.acceptanceCriteria ? `\nAcceptance Criteria:\n${story.acceptanceCriteria}` : ''}

Start with step 1 and implement each step systematically.`,
      context: 'Full implementation guide'
    });

    // Testing phase
    prompts.push({
      phase: 'testing',
      prompt: `Create comprehensive tests for the implemented feature: "${story.title}"

Requirements:
- Unit tests for all new functions and components
- Integration tests for user workflows
- Error handling tests
- Edge case testing

Test scenarios to cover:
${this.generateTestingRequirements(story, ['React', 'JavaScript']).map(req => `- ${req}`).join('\n')}

Ensure all tests pass and provide good coverage for the new functionality.`,
      context: 'Testing and quality assurance'
    });

    // Review phase
    prompts.push({
      phase: 'review',
      prompt: `Review the implementation of: "${story.title}"

Checklist:
- ✅ Code follows project conventions
- ✅ All acceptance criteria are met
- ✅ Tests are comprehensive and passing
- ✅ No performance regressions
- ✅ Accessible to users with disabilities
- ✅ Works on mobile devices
- ✅ Error handling is robust

Create a pull request with:
1. Clear description of changes
2. Screenshots/videos of new functionality
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