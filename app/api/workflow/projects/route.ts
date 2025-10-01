import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Get all projects for the user
    const projects = await prisma.workflowProject.findMany({
      where: { externalId },
      include: {
        codebaseAnalysis: {
          select: {
            id: true,
            version: true,
            analyzedAt: true
          }
        },
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ projects });

  } catch (error) {
    console.error('Workflow projects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { externalId, name, description, repositoryUrl, branch = 'main' } = await request.json();

    if (!externalId || !name) {
      return NextResponse.json({ error: 'externalId and name required' }, { status: 400 });
    }

    // Validate repository URL format if provided
    if (repositoryUrl) {
      try {
        new URL(repositoryUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid repository URL format' }, { status: 400 });
      }
    }

    const project = await prisma.workflowProject.create({
      data: {
        externalId,
        name,
        description,
        repositoryUrl,
        branch,
        analysisStatus: 'PENDING'
      },
      include: {
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      }
    });

    return NextResponse.json({ project }, { status: 201 });

  } catch (error) {
    console.error('Workflow projects POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}