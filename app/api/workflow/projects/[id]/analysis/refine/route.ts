import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WorkflowAnalysisService } from '@/lib/workflow/analysis-service';

export const dynamic = 'force-dynamic';

// GET: Get refinement questions for the analysis
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const externalId = searchParams.get('externalId');

    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 400 });
    }

    // Verify project access
    const project = await prisma.workflowProject.findFirst({
      where: {
        id: params.id,
        externalId: externalId
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the analysis with refinement questions
    const analysis = await prisma.workflowCodebaseAnalysis.findUnique({
      where: { projectId: params.id }
    });

    if (!analysis) {
      return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
    }

    // Parse refinement questions
    let questions = [];
    if (analysis.refinementQuestions) {
      try {
        questions = JSON.parse(analysis.refinementQuestions);
      } catch (error) {
        console.error('Failed to parse refinement questions:', error);
      }
    }

    return NextResponse.json({
      questions,
      hasQuestions: questions.length > 0
    });

  } catch (error) {
    console.error('Error getting refinement questions:', error);
    return NextResponse.json({
      error: 'Failed to get refinement questions'
    }, { status: 500 });
  }
}

// POST: Process refinement answers and generate refined analysis
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const externalId = searchParams.get('externalId');
    const { answers } = await request.json();

    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 400 });
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Answers required' }, { status: 400 });
    }

    // Verify project access
    const project = await prisma.workflowProject.findFirst({
      where: {
        id: params.id,
        externalId: externalId
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the current analysis
    const currentAnalysis = await prisma.workflowCodebaseAnalysis.findUnique({
      where: { projectId: params.id }
    });

    if (!currentAnalysis) {
      return NextResponse.json({ error: 'No analysis found to refine' }, { status: 404 });
    }

    // Generate refined analysis using the analysis service
    const analysisService = new WorkflowAnalysisService();
    await analysisService.refineAnalysis(params.id, externalId, answers);

    return NextResponse.json({
      success: true,
      message: 'Analysis refined successfully'
    });

  } catch (error) {
    console.error('Error refining analysis:', error);
    return NextResponse.json({
      error: 'Failed to refine analysis'
    }, { status: 500 });
  }
}