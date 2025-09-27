import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/workflow/prompt-packs/generate - Generate AI prompts for user story
export async function POST(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, storyId, customizations } = body;

    if (!projectId || !storyId) {
      return NextResponse.json(
        { error: 'Project ID and Story ID are required' },
        { status: 400 }
      );
    }

    // Fetch project and story
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId },
      include: {
        stories: {
          where: { id: storyId }
        }
      }
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const story = project.stories[0];
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Generate context analysis
    const context = generateStoryContext(project, story, customizations);

    // Generate AI prompts based on story and customizations
    const prompts = generateAIPrompts(project, story, customizations, context);

    // Create prompt pack record
    const promptPack = await prisma.promptPack.create({
      data: {
        projectId: project.id,
        storyId: story.id,
        name: `${story.title} - Implementation Prompts`,
        description: `AI-generated prompts for implementing: ${story.title}`,
        context,
        prompts: JSON.stringify(prompts),
        customizations: JSON.stringify(customizations),
      }
    });

    // Return the prompt pack with parsed prompts
    return NextResponse.json({
      ...promptPack,
      prompts: JSON.parse(promptPack.prompts),
    });

  } catch (error) {
    console.error('Error generating prompt pack:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompt pack' },
      { status: 500 }
    );
  }
}

// Generate comprehensive context for the story
function generateStoryContext(project: any, story: any, customizations: any): string {
  let context = `# Project Context: ${project.name}\n\n`;

  if (project.description) {
    context += `**Project Description:** ${project.description}\n\n`;
  }

  if (project.workingDoc && customizations.includeContext) {
    context += `## Working Documentation\n\n${project.workingDoc}\n\n`;
  }

  context += `## User Story Details\n\n`;
  context += `**Title:** ${story.title}\n`;
  context += `**User Statement:** ${story.userStatement}\n`;
  context += `**Description:** ${story.description}\n`;
  context += `**Priority:** ${story.priority}\n`;
  context += `**Status:** ${story.status}\n\n`;

  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    context += `## Acceptance Criteria\n\n`;
    story.acceptanceCriteria.forEach((criteria: string, index: number) => {
      context += `${index + 1}. ${criteria}\n`;
    });
    context += '\n';
  }

  context += `## Technical Configuration\n\n`;
  context += `- **Code Style:** ${customizations.codeStyle}\n`;
  context += `- **Framework:** ${customizations.framework}\n`;
  context += `- **Testing:** ${customizations.testingFramework}\n`;
  context += `- **Architecture:** ${customizations.architecture}\n`;

  if (project.repositoryUrl) {
    context += `- **Repository:** ${project.repositoryUrl}\n`;
  }

  return context;
}

// Generate AI prompts based on story requirements and customizations
function generateAIPrompts(project: any, story: any, customizations: any, context: string): any[] {
  const prompts: any[] = [];

  // 1. Implementation Planning Prompt
  prompts.push({
    type: 'planning',
    title: 'Implementation Planning',
    purpose: 'Break down the user story into implementable tasks and create a development plan',
    content: generatePlanningPrompt(story, customizations, context),
    expectedOutput: 'A detailed implementation plan with tasks, dependencies, and technical approach'
  });

  // 2. Code Implementation Prompt
  prompts.push({
    type: 'implementation',
    title: 'Code Implementation',
    purpose: 'Generate the core implementation code for the user story',
    content: generateImplementationPrompt(story, customizations, context),
    expectedOutput: `Working ${customizations.codeStyle} code that implements the user story requirements`
  });

  // 3. Testing Prompt (if enabled)
  if (customizations.includeTests) {
    prompts.push({
      type: 'testing',
      title: 'Test Implementation',
      purpose: 'Create comprehensive tests for the implemented functionality',
      content: generateTestingPrompt(story, customizations, context),
      expectedOutput: `Complete test suite using ${customizations.testingFramework} covering all acceptance criteria`
    });
  }

  // 4. Documentation Prompt (if enabled)
  if (customizations.includeDocumentation) {
    prompts.push({
      type: 'documentation',
      title: 'Documentation Generation',
      purpose: 'Create technical documentation for the implemented feature',
      content: generateDocumentationPrompt(story, customizations, context),
      expectedOutput: 'Technical documentation including API docs, usage examples, and integration guides'
    });
  }

  // 5. Code Review Prompt
  prompts.push({
    type: 'review',
    title: 'Code Review & Quality Assurance',
    purpose: 'Review the implementation for quality, security, and best practices',
    content: generateReviewPrompt(story, customizations, context),
    expectedOutput: 'Detailed code review with suggestions for improvements and quality validation'
  });

  // 6. Integration Prompt
  prompts.push({
    type: 'integration',
    title: 'Integration & Deployment',
    purpose: 'Guide integration with existing codebase and deployment considerations',
    content: generateIntegrationPrompt(story, customizations, context),
    expectedOutput: 'Integration steps, deployment checklist, and rollback procedures'
  });

  return prompts;
}

function generatePlanningPrompt(story: any, customizations: any, context: string): string {
  return `You are a senior software architect tasked with creating an implementation plan for the following user story.

${context}

## Task
Create a detailed implementation plan that breaks down this user story into manageable development tasks. Consider the technical stack, architecture patterns, and project constraints.

## Requirements
1. Analyze the user story and acceptance criteria
2. Identify all components that need to be created or modified
3. Define the technical approach using ${customizations.architecture} architecture
4. Create a task breakdown with dependencies
5. Estimate complexity and identify potential risks
6. Consider integration points with existing systems

## Output Format
Provide a structured implementation plan with:
- Executive Summary
- Technical Approach
- Component Breakdown
- Task List with Dependencies
- Risk Assessment
- Integration Considerations

Focus on ${customizations.framework} framework and ${customizations.codeStyle} best practices.`;
}

function generateImplementationPrompt(story: any, customizations: any, context: string): string {
  return `You are a senior ${customizations.codeStyle} developer implementing the following user story using ${customizations.framework}.

${context}

## Task
Implement the complete functionality described in the user story, following ${customizations.architecture} architecture principles.

## Requirements
1. Write clean, maintainable ${customizations.codeStyle} code
2. Follow ${customizations.framework} best practices and conventions
3. Implement all acceptance criteria
4. Include proper error handling and validation
5. Add appropriate comments and type definitions
6. Ensure code is production-ready and secure

## Technical Constraints
- Use ${customizations.framework} framework
- Follow ${customizations.architecture} architecture
- Write ${customizations.codeStyle} with proper typing
- Include proper error handling
- Follow security best practices

## Output Format
Provide complete, working code files with:
- Main implementation files
- Type definitions (if applicable)
- Configuration files (if needed)
- Brief implementation notes

Make sure the code is ready to integrate into the existing codebase.`;
}

function generateTestingPrompt(story: any, customizations: any, context: string): string {
  return `You are a senior QA engineer creating comprehensive tests for the following implemented user story.

${context}

## Task
Create a complete test suite using ${customizations.testingFramework} that thoroughly validates the implementation.

## Requirements
1. Write unit tests for all core functionality
2. Create integration tests for component interactions
3. Add edge case and error condition tests
4. Ensure all acceptance criteria are tested
5. Include performance and security test considerations
6. Achieve high test coverage (>90%)

## Test Types Needed
- Unit tests for individual functions/methods
- Component tests for UI elements (if applicable)
- Integration tests for system interactions
- End-to-end tests for user workflows
- Error handling and edge case tests

## Output Format
Provide complete test files with:
- Test setup and configuration
- Comprehensive test cases
- Test data and mocks
- Performance benchmarks (if applicable)
- Test documentation

Use ${customizations.testingFramework} syntax and best practices.`;
}

function generateDocumentationPrompt(story: any, customizations: any, context: string): string {
  return `You are a technical writer creating comprehensive documentation for the following implemented user story.

${context}

## Task
Create clear, comprehensive technical documentation that enables other developers to understand, use, and maintain the implementation.

## Requirements
1. Write clear API documentation (if applicable)
2. Create usage examples and code samples
3. Document configuration and setup requirements
4. Explain architectural decisions and patterns
5. Include troubleshooting and FAQ sections
6. Add visual diagrams where helpful

## Documentation Sections Needed
- Overview and Purpose
- Installation and Setup
- API Reference (if applicable)
- Usage Examples
- Configuration Options
- Architecture and Design Decisions
- Troubleshooting
- Contributing Guidelines

## Output Format
Provide well-structured markdown documentation with:
- Clear headings and organization
- Code examples and snippets
- Configuration samples
- Visual diagrams (ASCII or mermaid syntax)
- Cross-references and links

Focus on ${customizations.framework} specific documentation patterns.`;
}

function generateReviewPrompt(story: any, customizations: any, context: string): string {
  return `You are a senior code reviewer conducting a thorough review of the implementation for the following user story.

${context}

## Task
Perform a comprehensive code review focusing on quality, security, performance, and adherence to best practices.

## Review Areas
1. **Code Quality**: Clean code principles, readability, maintainability
2. **Architecture**: Adherence to ${customizations.architecture} patterns
3. **Security**: Vulnerability assessment and secure coding practices
4. **Performance**: Optimization opportunities and bottlenecks
5. **Testing**: Test coverage and quality validation
6. **Documentation**: Code comments and technical documentation
7. **Standards**: ${customizations.framework} and ${customizations.codeStyle} conventions

## Review Checklist
- [ ] Functionality meets all acceptance criteria
- [ ] Code follows ${customizations.framework} best practices
- [ ] Error handling is comprehensive
- [ ] Security vulnerabilities are addressed
- [ ] Performance is optimized
- [ ] Tests provide adequate coverage
- [ ] Documentation is complete and accurate
- [ ] Code is ready for production deployment

## Output Format
Provide a detailed code review report with:
- Executive Summary
- Detailed Findings by Category
- Specific Recommendations
- Priority Levels for Issues
- Approval/Rejection Decision
- Next Steps

Be constructive and provide specific, actionable feedback.`;
}

function generateIntegrationPrompt(story: any, customizations: any, context: string): string {
  return `You are a DevOps engineer responsible for integrating and deploying the implementation for the following user story.

${context}

## Task
Create a comprehensive integration and deployment plan that ensures smooth delivery to production.

## Requirements
1. Define integration steps with existing codebase
2. Create deployment procedures and checklists
3. Identify infrastructure requirements
4. Plan rollback and disaster recovery procedures
5. Define monitoring and alerting needs
6. Create post-deployment validation steps

## Integration Areas
- Database schema changes (if any)
- API endpoint modifications
- Frontend component integration
- Third-party service integrations
- Configuration updates
- Environment variable changes

## Output Format
Provide a complete deployment guide with:
- Pre-deployment Checklist
- Step-by-step Integration Instructions
- Deployment Procedures
- Environment Configuration
- Monitoring Setup
- Rollback Procedures
- Post-deployment Validation
- Troubleshooting Guide

Include specific commands and configuration for ${customizations.framework} deployment patterns.`;
}