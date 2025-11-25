import { NextRequest, NextResponse } from 'next/server';
import { StoryOptimizerService } from '@/lib/workflow/story-optimizer-service';

const optimizerService = new StoryOptimizerService();

/**
 * POST /api/workflow/stories/optimize/preview
 * Generate optimized story preview after Q&A conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, storyInput, conversation, externalId } = body;

    if (!projectId || !externalId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and externalId' },
        { status: 400 }
      );
    }

    if (!storyInput) {
      return NextResponse.json(
        { error: 'Missing story input' },
        { status: 400 }
      );
    }

    const optimizedStory = await optimizerService.generateOptimizedStory(
      projectId,
      storyInput,
      conversation || [],
      externalId
    );

    return NextResponse.json({ optimizedStory });
  } catch (error) {
    console.error('Story optimization preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate optimized story' },
      { status: 500 }
    );
  }
}
