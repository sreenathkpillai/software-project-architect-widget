import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/workflow/stories/[id] - Get a specific story
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    // Get story with project verification
    const story = await prisma.userStory.findFirst({
      where: {
        id: params.id,
        project: {
          externalId: externalId,
        },
      },
      include: {
        project: true,
        promptPacks: true,
        implementations: true,
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

// PUT /api/workflow/stories/[id] - Update a story
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      title,
      userStatement,
      description,
      acceptanceCriteria,
      priority,
      status,
      externalRef,
    } = body;

    // Verify story ownership
    const existingStory = await prisma.userStory.findFirst({
      where: {
        id: params.id,
        project: {
          externalId: externalId,
        },
      },
    });

    if (!existingStory) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // Update markdown content if story details changed
    let markdownContent = existingStory.markdownContent;
    if (title || userStatement || description || acceptanceCriteria || priority) {
      markdownContent = formatStoryAsMarkdown({
        title: title || existingStory.title,
        userStatement: userStatement || existingStory.userStatement,
        description: description || existingStory.description,
        acceptanceCriteria: acceptanceCriteria || existingStory.acceptanceCriteria as string[],
        priority: priority || existingStory.priority || 'medium',
      });
    }

    // Update the story
    const updatedStory = await prisma.userStory.update({
      where: {
        id: params.id,
      },
      data: {
        ...(title !== undefined && { title }),
        ...(userStatement !== undefined && { userStatement }),
        ...(description !== undefined && { description }),
        ...(acceptanceCriteria !== undefined && { acceptanceCriteria }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(externalRef !== undefined && { externalRef }),
        markdownContent,
      },
    });

    return NextResponse.json(updatedStory);
  } catch (error) {
    console.error('Error updating story:', error);
    return NextResponse.json(
      { error: 'Failed to update story' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow/stories/[id] - Delete a story
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    // Verify story ownership
    const existingStory = await prisma.userStory.findFirst({
      where: {
        id: params.id,
        project: {
          externalId: externalId,
        },
      },
    });

    if (!existingStory) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the story (cascading deletes will handle related records)
    await prisma.userStory.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { error: 'Failed to delete story' },
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