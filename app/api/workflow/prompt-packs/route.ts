import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/workflow/prompt-packs - List prompt packs for a project
export async function GET(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project access
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId },
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get prompt packs for the project
    const promptPacks = await prisma.promptPack.findMany({
      where: { projectId },
      include: {
        story: {
          select: { title: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parse prompts JSON for each pack
    const packsWithParsedPrompts = promptPacks.map(pack => ({
      ...pack,
      prompts: JSON.parse(pack.prompts),
      customizations: JSON.parse(pack.customizations || '{}'),
    }));

    return NextResponse.json(packsWithParsedPrompts);

  } catch (error) {
    console.error('Error fetching prompt packs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt packs' },
      { status: 500 }
    );
  }
}

// POST /api/workflow/prompt-packs - Create a new prompt pack
export async function POST(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, storyId, name, description, context, prompts, customizations } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      );
    }

    // Verify project access
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId },
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Create prompt pack
    const promptPack = await prisma.promptPack.create({
      data: {
        projectId,
        storyId,
        name,
        description,
        context,
        prompts: JSON.stringify(prompts || []),
        customizations: JSON.stringify(customizations || {}),
      },
      include: {
        story: {
          select: { title: true, status: true }
        }
      }
    });

    return NextResponse.json({
      ...promptPack,
      prompts: JSON.parse(promptPack.prompts),
      customizations: JSON.parse(promptPack.customizations || '{}'),
    });

  } catch (error) {
    console.error('Error creating prompt pack:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt pack' },
      { status: 500 }
    );
  }
}