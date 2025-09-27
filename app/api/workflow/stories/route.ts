import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/workflow/stories - List stories for a project
export async function GET(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.workflowProject.findFirst({
      where: {
        id: projectId,
        externalId: externalId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get stories for the project
    const stories = await prisma.userStory.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: [
        { status: 'asc' }, // backlog first, then in_progress, then completed
        { priority: 'desc' }, // high priority first
        { createdAt: 'desc' }, // newest first within same priority
      ],
    });

    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

// POST /api/workflow/stories - Create a new story
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
    const {
      projectId,
      title,
      userStatement,
      description,
      acceptanceCriteria,
      priority,
      externalRef,
    } = body;

    if (!projectId || !title || !userStatement || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.workflowProject.findFirst({
      where: {
        id: projectId,
        externalId: externalId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Format story as markdown
    const markdownContent = formatStoryAsMarkdown({
      title,
      userStatement,
      description,
      acceptanceCriteria: acceptanceCriteria || [],
      priority: priority || 'medium',
    });

    // Create the story
    const story = await prisma.userStory.create({
      data: {
        projectId,
        title,
        userStatement,
        description,
        acceptanceCriteria: acceptanceCriteria || [],
        priority: priority || 'medium',
        status: 'backlog',
        externalRef,
        markdownContent,
      },
    });

    return NextResponse.json(story);
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

// Helper function to format story as markdown
function formatStoryAsMarkdown(story: {
  title: string;
  userStatement: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
}): string {
  let markdown = `# ${story.title}\n\n`;
  markdown += `**User Story:** ${story.userStatement}\n\n`;
  markdown += `## Description\n\n${story.description}\n\n`;

  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    markdown += `## Acceptance Criteria\n\n`;
    story.acceptanceCriteria.forEach((criteria: string) => {
      markdown += `- [ ] ${criteria}\n`;
    });
    markdown += '\n';
  }

  markdown += `## Priority\n\n${story.priority}\n`;

  return markdown;
}