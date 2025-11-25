import { NextRequest, NextResponse } from 'next/server';
import { StoryOptimizerService } from '@/lib/workflow/story-optimizer-service';

const optimizerService = new StoryOptimizerService();

/**
 * GET /api/workflow/stories/[id]/versions
 * Get all versions for a story
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const { searchParams } = new URL(request.url);
    const externalId = searchParams.get('externalId');

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing externalId' },
        { status: 400 }
      );
    }

    const versions = await optimizerService.getStoryVersions(storyId, externalId);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Get story versions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get versions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow/stories/[id]/versions
 * Create a new story version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { storyData, isOriginal, isActive, optimizationContext, externalId } = body;

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing externalId' },
        { status: 400 }
      );
    }

    if (!storyData) {
      return NextResponse.json(
        { error: 'Missing story data' },
        { status: 400 }
      );
    }

    const version = await optimizerService.saveStoryVersion(
      storyId,
      storyData,
      isOriginal ?? false,
      isActive ?? false,
      optimizationContext
    );

    return NextResponse.json({ version });
  } catch (error) {
    console.error('Create story version error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create version' },
      { status: 500 }
    );
  }
}
