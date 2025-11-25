import { NextRequest, NextResponse } from 'next/server';
import { StoryOptimizerService } from '@/lib/workflow/story-optimizer-service';

const optimizerService = new StoryOptimizerService();

/**
 * POST /api/workflow/stories/optimize/more-questions
 * Get additional clarifying questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, storyInput, previousQuestions, answers, externalId } = body;

    if (!projectId || !externalId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and externalId' },
        { status: 400 }
      );
    }

    const questions = await optimizerService.getMoreQuestions(
      projectId,
      storyInput,
      previousQuestions || [],
      answers || {},
      externalId
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Get more questions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get more questions' },
      { status: 500 }
    );
  }
}
