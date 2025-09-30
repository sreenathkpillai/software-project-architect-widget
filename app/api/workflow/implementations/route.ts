import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createImplementationSchema = z.object({
  projectId: z.string(),
  storyId: z.string(),
  promptPackId: z.string(),
  type: z.enum(['manual', 'platform']),
  config: z.object({
    provider: z.enum(['anthropic', 'openai', 'local']),
    model: z.string(),
    autoCommit: z.boolean().default(true),
    runTests: z.boolean().default(true),
    generateDocs: z.boolean().default(true),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 401 });
    }

    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid external ID' }, { status: 401 });
    }

    const body = await request.json();
    const data = createImplementationSchema.parse(body);

    // Verify project and story exist
    const project = await prisma.workflowProject.findUnique({
      where: { id: data.projectId },
      include: { stories: { where: { id: data.storyId } } }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.stories.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Verify prompt pack exists
    const promptPack = await prisma.promptPack.findUnique({
      where: { id: data.promptPackId }
    });

    if (!promptPack) {
      return NextResponse.json({ error: 'Prompt pack not found' }, { status: 404 });
    }

    // Create implementation record
    const implementation = await prisma.implementation.create({
      data: {
        projectId: data.projectId,
        storyId: data.storyId,
        promptPackId: data.promptPackId,
        type: data.type,
        status: 'pending',
        config: JSON.stringify(data.config),
        externalId,
      },
      include: {
        project: true,
        story: true,
        promptPack: true,
      }
    });

    return NextResponse.json(implementation);
  } catch (error) {
    console.error('Create implementation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 401 });
    }

    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid external ID' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const storyId = searchParams.get('storyId');
    const status = searchParams.get('status');

    const where: any = { externalId };
    if (projectId) where.projectId = projectId;
    if (storyId) where.storyId = storyId;
    if (status) where.status = status;

    const implementations = await prisma.implementation.findMany({
      where,
      include: {
        project: true,
        story: true,
        promptPack: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ implementations });
  } catch (error) {
    console.error('Get implementations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}