import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStoryService } from '@/lib/workflow/story-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const { id: projectId } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    const storyService = new WorkflowStoryService();
    const stories = await storyService.getStories(projectId, externalId);

    return NextResponse.json({ stories });

  } catch (error) {
    console.error('Get project stories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { externalId, title, description, acceptanceCriteria, priority = 'MEDIUM', storyPoints } = await request.json();
    const { id: projectId } = params;

    if (!externalId || !title || !description) {
      return NextResponse.json({
        error: 'externalId, title, and description are required'
      }, { status: 400 });
    }

    const storyService = new WorkflowStoryService();
    const story = await storyService.createStory(projectId, {
      title,
      description,
      acceptanceCriteria,
      priority,
      storyPoints: storyPoints ? parseInt(storyPoints) : undefined
    }, externalId);

    return NextResponse.json({ story }, { status: 201 });

  } catch (error) {
    console.error('Create story error:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}