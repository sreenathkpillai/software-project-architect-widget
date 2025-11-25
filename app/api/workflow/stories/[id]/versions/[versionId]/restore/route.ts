import { NextRequest, NextResponse } from 'next/server';
import { StoryOptimizerService } from '@/lib/workflow/story-optimizer-service';

const optimizerService = new StoryOptimizerService();

/**
 * POST /api/workflow/stories/[id]/versions/[versionId]/restore
 * Restore a specific story version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: storyId, versionId } = await params;
    const body = await request.json();
    const { externalId } = body;

    if (!externalId) {
      return NextResponse.json(
        { error: 'Missing externalId' },
        { status: 400 }
      );
    }

    const story = await optimizerService.restoreVersion(storyId, versionId, externalId);

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Restore story version error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore version' },
      { status: 500 }
    );
  }
}
