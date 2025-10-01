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

    const story = await prisma.workflowStory.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            externalId: true
          }
        },
        promptPacks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!story || story.project.externalId !== externalId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json({ story });

  } catch (error) {
    console.error('Workflow story GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { externalId, ...updates } = await request.json();

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Verify story ownership through project
    const existingStory = await prisma.workflowStory.findUnique({
      where: { id },
      include: {
        project: {
          select: { externalId: true }
        }
      }
    });

    if (!existingStory || existingStory.project.externalId !== externalId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const story = await prisma.workflowStory.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            promptPacks: true
          }
        }
      }
    });

    return NextResponse.json({ story });

  } catch (error) {
    console.error('Workflow story PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update story' },
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

    // Verify story ownership through project
    const existingStory = await prisma.workflowStory.findUnique({
      where: { id },
      include: {
        project: {
          select: { externalId: true }
        }
      }
    });

    if (!existingStory || existingStory.project.externalId !== externalId) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Delete story (cascade will handle prompt packs)
    await prisma.workflowStory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Workflow story DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    );
  }
}