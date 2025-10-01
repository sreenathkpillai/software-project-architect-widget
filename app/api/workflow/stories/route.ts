import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get stories for the project
    const stories = await prisma.workflowStory.findMany({
      where: { projectId },
      include: {
        _count: {
          select: {
            promptPacks: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return NextResponse.json({ stories });

  } catch (error) {
    console.error('Workflow stories GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      externalId,
      projectId,
      title,
      description,
      acceptanceCriteria,
      priority = 'MEDIUM',
      status = 'TODO',
      source = 'MANUAL',
      sourceId,
      storyPoints,
      externalStoryId
    } = await request.json();

    if (!externalId || !projectId || !title || !description) {
      return NextResponse.json({
        error: 'externalId, projectId, title, and description required'
      }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const story = await prisma.workflowStory.create({
      data: {
        projectId,
        externalId: externalStoryId,
        title,
        description,
        acceptanceCriteria,
        priority,
        status,
        source,
        sourceId,
        storyPoints
      },
      include: {
        _count: {
          select: {
            promptPacks: true
          }
        }
      }
    });

    return NextResponse.json({ story }, { status: 201 });

  } catch (error) {
    console.error('Workflow stories POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}