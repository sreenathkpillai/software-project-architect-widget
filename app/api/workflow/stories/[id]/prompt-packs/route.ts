import { NextRequest, NextResponse } from 'next/server';
import { WorkflowPromptPackService } from '@/lib/workflow/prompt-pack-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { externalId } = await request.json();
    const { id: storyId } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    const promptPackService = new WorkflowPromptPackService();
    const promptPack = await promptPackService.generatePromptPack(storyId, externalId);

    return NextResponse.json({ promptPack }, { status: 201 });

  } catch (error) {
    console.error('Prompt pack generation error:', error);
    return NextResponse.json(
      { error: `Failed to generate prompt pack: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}