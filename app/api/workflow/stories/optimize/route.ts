import { NextRequest, NextResponse } from 'next/server';
import { StoryOptimizerService } from '@/lib/workflow/story-optimizer-service';

const optimizerService = new StoryOptimizerService();

/**
 * POST /api/workflow/stories/optimize
 * Analyze a story and get clarifying questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, storyInput, externalId } = body;

    if (!projectId || !externalId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and externalId' },
        { status: 400 }
      );
    }

    if (!storyInput || (!storyInput.title && !storyInput.description)) {
      return NextResponse.json(
        { error: 'Story must have at least a title or description' },
        { status: 400 }
      );
    }

    const analysis = await optimizerService.analyzeStory(projectId, storyInput, externalId);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Story optimization analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze story' },
      { status: 500 }
    );
  }
}
