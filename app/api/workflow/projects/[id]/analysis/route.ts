import { NextRequest, NextResponse } from 'next/server';
import { WorkflowAnalysisService } from '@/lib/workflow/analysis-service';

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

    const analysisService = new WorkflowAnalysisService();
    const analysis = await analysisService.getAnalysis(projectId, externalId);

    // Return null analysis instead of 404 - frontend expects this
    return NextResponse.json({ analysis: analysis || null });

  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const { id: projectId } = params;
    const { content } = await request.json();

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    const analysisService = new WorkflowAnalysisService();
    const analysis = await analysisService.updateAnalysis(projectId, content, externalId);

    return NextResponse.json({ analysis });

  } catch (error) {
    console.error('Update analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to update analysis' },
      { status: 500 }
    );
  }
}