import { NextRequest, NextResponse } from 'next/server';
import { WorkflowPromptPackService } from '@/lib/workflow/prompt-pack-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const { id } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    const promptPackService = new WorkflowPromptPackService();
    const promptPack = await promptPackService.getPromptPack(id, externalId);

    return NextResponse.json({ promptPack });

  } catch (error) {
    console.error('Get prompt pack error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt pack' },
      { status: 500 }
    );
  }
}