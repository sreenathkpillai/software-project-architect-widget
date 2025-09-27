import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/workflow/projects/from-architect - Create project from Architect session
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
    const { architectSessionId, name, description } = body;

    if (!architectSessionId || !name) {
      return NextResponse.json(
        { error: 'Architect session ID and project name are required' },
        { status: 400 }
      );
    }

    // Fetch Architect session data
    const session = await prisma.savedSession.findUnique({
      where: {
        userSession: architectSessionId,
      },
    });

    if (!session || session.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Architect session not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch specifications from the Architect session
    const specifications = await prisma.specification.findMany({
      where: {
        userSession: architectSessionId,
      },
      orderBy: {
        order: 'asc',
      },
    });

    // Create working documentation from specifications
    let workingDoc = `# ${name} - Working Documentation\n\n`;
    workingDoc += `Generated from Architect session: ${session.sessionName || architectSessionId}\n\n`;

    if (specifications.length > 0) {
      workingDoc += `## Session Overview\n\n`;
      workingDoc += `This project was imported from an Architect session with ${specifications.length} specifications.\n\n`;
      workingDoc += `Session Details:\n`;
      workingDoc += `- Session ID: ${architectSessionId}\n`;
      workingDoc += `- Created: ${session.createdAt}\n`;
      workingDoc += `- Status: ${session.isComplete ? 'Complete' : 'In Progress'}\n\n`;

      // Add each specification to the working doc
      specifications.forEach((spec, index) => {
        workingDoc += `## ${index + 1}. ${spec.filename}\n\n`;
        workingDoc += `**Type:** ${spec.documentType}\n`;
        workingDoc += `**Description:** ${spec.description}\n\n`;
        workingDoc += spec.content;
        workingDoc += '\n\n---\n\n';
      });
    } else {
      // Handle sessions without specifications
      workingDoc += `## Session Information\n\n`;
      workingDoc += `This project was imported from an Architect session, but no specifications were found.\n\n`;
      workingDoc += `Session Details:\n`;
      workingDoc += `- Session ID: ${architectSessionId}\n`;
      workingDoc += `- Session Name: ${session.sessionName}\n`;
      workingDoc += `- Created: ${session.createdAt}\n`;
      workingDoc += `- Status: ${session.isComplete ? 'Complete' : 'In Progress'}\n\n`;
      workingDoc += `## Next Steps\n\n`;
      workingDoc += `Since no specifications were found, you may want to:\n`;
      workingDoc += `1. Go back to the Architect session and complete the documentation\n`;
      workingDoc += `2. Manually add project documentation\n`;
      workingDoc += `3. Create user stories based on your requirements\n\n`;
    }

    // Create the project
    const project = await prisma.workflowProject.create({
      data: {
        externalId,
        name,
        description: description || `Imported from Architect session: ${session.sessionName}`,
        architectSessionId,
        workingDoc,
      },
    });

    // Extract user stories from specifications
    let extractedStories: any[] = [];

    if (specifications.length > 0) {
      // Try to extract from PRD first
      const prdSpec = specifications.find(spec => spec.documentType === 'prd');
      if (prdSpec) {
        extractedStories = extractUserStoriesFromPRD(prdSpec.content);
      }

      // If no stories from PRD, try to extract from other specifications
      if (extractedStories.length === 0) {
        for (const spec of specifications) {
          const stories = extractUserStoriesFromContent(spec.content, spec.documentType);
          extractedStories.push(...stories);
        }
      }

      // Create user stories in the database
      if (extractedStories.length > 0) {
        await prisma.userStory.createMany({
          data: extractedStories.map((story) => ({
            projectId: project.id,
            title: story.title,
            userStatement: story.userStatement,
            description: story.description,
            acceptanceCriteria: story.acceptanceCriteria,
            priority: story.priority,
            status: 'backlog',
            markdownContent: formatStoryAsMarkdown(story),
          })),
        });
      }
    } else {
      // Create a default implementation story if no specifications
      const defaultStory = {
        title: 'Implement Core Functionality',
        userStatement: 'As a developer, I want to implement the core functionality described in the Architect session',
        description: 'Based on the Architect session, implement the main features and requirements.',
        acceptanceCriteria: [
          'Core functionality is implemented according to requirements',
          'Code follows best practices and architectural patterns',
          'All features are tested and working',
          'Documentation is complete and up-to-date',
        ],
        priority: 'high',
      };

      await prisma.userStory.create({
        data: {
          projectId: project.id,
          title: defaultStory.title,
          userStatement: defaultStory.userStatement,
          description: defaultStory.description,
          acceptanceCriteria: defaultStory.acceptanceCriteria,
          priority: defaultStory.priority,
          status: 'backlog',
          markdownContent: formatStoryAsMarkdown(defaultStory),
        },
      });
    }

    // Return the created project with stories
    const projectWithStories = await prisma.workflowProject.findUnique({
      where: { id: project.id },
      include: {
        stories: true,
      },
    });

    return NextResponse.json(projectWithStories);
  } catch (error) {
    console.error('Error creating project from Architect:', error);
    return NextResponse.json(
      { error: 'Failed to create project from Architect session' },
      { status: 500 }
    );
  }
}

// Helper function to extract user stories from any content
function extractUserStoriesFromContent(content: string, docType: string): any[] {
  const stories: any[] = [];

  // Extract user stories based on document type
  switch (docType) {
    case 'prd':
      return extractUserStoriesFromPRD(content);
    case 'frontend':
      return extractFrontendStories(content);
    case 'backend':
      return extractBackendStories(content);
    case 'api':
      return extractAPIStories(content);
    default:
      return extractGenericStories(content, docType);
  }
}

// Helper function to extract user stories from PRD content
function extractUserStoriesFromPRD(prdContent: string): any[] {
  const stories: any[] = [];

  // Look for user stories section in PRD
  const userStoriesMatch = prdContent.match(/##?\s*User Stories([\s\S]*?)(?=##?\s*|$)/i);

  if (userStoriesMatch) {
    const storiesSection = userStoriesMatch[1];

    // Extract individual stories (looking for patterns like "As a...")
    const storyMatches = storiesSection.matchAll(/As a.*?(?=As a|$)/gis);

    for (const match of storyMatches) {
      const storyText = match[0];

      // Extract user statement
      const userStatementMatch = storyText.match(/As a.*?(?=\n|$)/i);
      const userStatement = userStatementMatch ? userStatementMatch[0].trim() : '';

      // Extract title (often the first line or a heading)
      const titleMatch = storyText.match(/###?\s*(.+?)(?=\n|$)/);
      const title = titleMatch ? titleMatch[1].trim() : userStatement.substring(0, 50) + '...';

      // Extract acceptance criteria
      const criteriaMatch = storyText.match(/Acceptance Criteria:?([\s\S]*?)(?=\n\n|$)/i);
      const acceptanceCriteria: string[] = [];

      if (criteriaMatch) {
        const criteriaText = criteriaMatch[1];
        const criteriaItems = criteriaText.match(/[-*]\s*.+/g);
        if (criteriaItems) {
          criteriaItems.forEach(item => {
            acceptanceCriteria.push(item.replace(/^[-*]\s*/, '').trim());
          });
        }
      }

      stories.push({
        title,
        userStatement,
        description: storyText,
        acceptanceCriteria,
        priority: 'medium', // Default priority
      });
    }
  }

  // If no structured user stories found, create a general implementation story
  if (stories.length === 0) {
    stories.push({
      title: 'Implement Core Functionality',
      userStatement: 'As a developer, I want to implement the core functionality described in the specifications',
      description: 'Implementation of the main features and requirements outlined in the Architect specifications.',
      acceptanceCriteria: [
        'All specified features are implemented',
        'Code follows the architecture patterns defined',
        'Tests are written and passing',
        'Documentation is complete',
      ],
      priority: 'high',
    });
  }

  return stories;
}

// Helper function to format story as markdown
function formatStoryAsMarkdown(story: any): string {
  let markdown = `# ${story.title}\n\n`;
  markdown += `**User Story:** ${story.userStatement}\n\n`;
  markdown += `## Description\n\n${story.description}\n\n`;
  markdown += `## Acceptance Criteria\n\n`;

  story.acceptanceCriteria.forEach((criteria: string) => {
    markdown += `- [ ] ${criteria}\n`;
  });

  markdown += `\n## Priority\n\n${story.priority}\n`;

  return markdown;
}

// Extract stories from frontend specifications
function extractFrontendStories(content: string): any[] {
  const stories: any[] = [];

  // Look for component or page descriptions
  const componentMatches = content.matchAll(/##?\s*(.*Component|.*Page|.*Feature)([\s\S]*?)(?=##?\s*|$)/gi);

  for (const match of componentMatches) {
    const title = match[1].trim();
    const description = match[2].trim();

    stories.push({
      title: `Implement ${title}`,
      userStatement: `As a user, I want to interact with the ${title.toLowerCase()}, so that I can achieve my goals efficiently`,
      description: `Frontend implementation for ${title}:\n\n${description}`,
      acceptanceCriteria: [
        `${title} is implemented according to design specifications`,
        'Component is responsive and works on all screen sizes',
        'Component follows accessibility best practices',
        'Component is properly tested',
      ],
      priority: 'medium',
    });
  }

  return stories;
}

// Extract stories from backend specifications
function extractBackendStories(content: string): any[] {
  const stories: any[] = [];

  // Look for service or module descriptions
  const serviceMatches = content.matchAll(/##?\s*(.*Service|.*Module|.*Handler)([\s\S]*?)(?=##?\s*|$)/gi);

  for (const match of serviceMatches) {
    const title = match[1].trim();
    const description = match[2].trim();

    stories.push({
      title: `Implement ${title}`,
      userStatement: `As a system, I need ${title.toLowerCase()} to be implemented, so that the backend can handle requests properly`,
      description: `Backend implementation for ${title}:\n\n${description}`,
      acceptanceCriteria: [
        `${title} is implemented with proper error handling`,
        'Service follows security best practices',
        'Service is properly tested with unit tests',
        'Service integrates correctly with database',
      ],
      priority: 'high',
    });
  }

  return stories;
}

// Extract stories from API specifications
function extractAPIStories(content: string): any[] {
  const stories: any[] = [];

  // Look for endpoint descriptions
  const endpointMatches = content.matchAll(/(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)([\s\S]*?)(?=(?:GET|POST|PUT|DELETE|PATCH)|$)/gi);

  for (const match of endpointMatches) {
    const method = match[1];
    const endpoint = match[2];
    const description = match[3].trim();

    stories.push({
      title: `Implement ${method} ${endpoint}`,
      userStatement: `As a client application, I want to ${method.toLowerCase()} data via ${endpoint}, so that I can interact with the system`,
      description: `API endpoint implementation:\n\n**Method:** ${method}\n**Endpoint:** ${endpoint}\n\n${description}`,
      acceptanceCriteria: [
        'Endpoint returns correct HTTP status codes',
        'Request/response validation is implemented',
        'Endpoint is properly documented',
        'Error handling is comprehensive',
      ],
      priority: 'high',
    });
  }

  return stories;
}

// Extract stories from generic content
function extractGenericStories(content: string, docType: string): any[] {
  const stories: any[] = [];

  // Look for requirements or tasks in the content
  const requirementMatches = content.matchAll(/(?:[-*•]|\d+\.)\s+([^.\n]+)/gi);
  const requirements = Array.from(requirementMatches).map(match => match[1].trim());

  if (requirements.length > 0) {
    stories.push({
      title: `Implement ${docType} Requirements`,
      userStatement: `As a developer, I want to implement the ${docType} requirements, so that the system meets the specified standards`,
      description: `Implementation of ${docType} requirements:\n\n${requirements.map(req => `• ${req}`).join('\n')}`,
      acceptanceCriteria: requirements.slice(0, 5), // Use first 5 requirements as criteria
      priority: 'medium',
    });
  }

  return stories;
}