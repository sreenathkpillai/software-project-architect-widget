import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    const project = await prisma.workflowProject.findUnique({
      where: { id },
      include: {
        codebaseAnalysis: true,
        stories: {
          orderBy: { updatedAt: 'desc' }
        },
        promptPacks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('Workflow project GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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
    const { id } = params;
    const updates = await request.json();

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Verify project ownership
    const existingProject = await prisma.workflowProject.findUnique({
      where: { id }
    });

    if (!existingProject || existingProject.externalId !== externalId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate repository URL format if provided
    if (updates.repositoryUrl) {
      try {
        new URL(updates.repositoryUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid repository URL format' }, { status: 400 });
      }
    }

    const project = await prisma.workflowProject.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        codebaseAnalysis: true,
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      }
    });

    return NextResponse.json({ project });

  } catch (error) {
    console.error('Workflow project PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const { id } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Verify project ownership
    const existingProject = await prisma.workflowProject.findUnique({
      where: { id }
    });

    if (!existingProject || existingProject.externalId !== externalId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete project (cascade will handle related records)
    await prisma.workflowProject.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Workflow project DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}