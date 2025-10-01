import { NextRequest, NextResponse } from 'next/server';
import { WorkflowAnalysisService } from '@/lib/workflow/analysis-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { externalId } = await request.json();
    const { id: projectId } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    const analysisService = new WorkflowAnalysisService();

    // Start analysis asynchronously
    analysisService.analyzeCodebase(projectId, externalId).catch(error => {
      console.error('Background analysis failed:', error);
    });

    return NextResponse.json({
      message: 'Analysis started',
      projectId,
      status: 'ANALYZING'
    });

  } catch (error) {
    console.error('Analysis trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}