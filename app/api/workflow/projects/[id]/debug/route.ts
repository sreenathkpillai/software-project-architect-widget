import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: projectId } = params;

    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        repositoryUrl: true,
        analysisStatus: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        githubToken: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse error information from notes if available
    let errorInfo = null;
    if (project.notes) {
      try {
        const parsed = JSON.parse(project.notes);
        if (parsed.error) {
          errorInfo = parsed.error;
        }
      } catch (e) {
        // Notes might not be JSON, ignore
      }
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        repositoryUrl: project.repositoryUrl,
        analysisStatus: project.analysisStatus,
        hasGithubToken: !!project.githubToken,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      errorInfo,
      debugInfo: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasClaudeKey: !!process.env.CLAUDE_KEY,
        aiProvider: process.env.AI_PROVIDER || 'openai'
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug information' },
      { status: 500 }
    );
  }
}