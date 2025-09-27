import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RouteParams {
  params: { id: string };
}

// GET /api/workflow/prompt-packs/[id] - Get specific prompt pack
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    const promptPack = await prisma.promptPack.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: { externalId: true, name: true }
        },
        story: {
          select: { title: true, status: true, userStatement: true }
        }
      }
    });

    if (!promptPack || promptPack.project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Prompt pack not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...promptPack,
      prompts: JSON.parse(promptPack.prompts),
      customizations: JSON.parse(promptPack.customizations || '{}'),
    });

  } catch (error) {
    console.error('Error fetching prompt pack:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt pack' },
      { status: 500 }
    );
  }
}

// PUT /api/workflow/prompt-packs/[id] - Update prompt pack
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    // Verify access to prompt pack
    const existingPack = await prisma.promptPack.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: { externalId: true }
        }
      }
    });

    if (!existingPack || existingPack.project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Prompt pack not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, context, prompts, customizations } = body;

    // Update prompt pack
    const promptPack = await prisma.promptPack.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(context && { context }),
        ...(prompts && { prompts: JSON.stringify(prompts) }),
        ...(customizations && { customizations: JSON.stringify(customizations) }),
        updatedAt: new Date(),
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
    console.error('Error updating prompt pack:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt pack' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow/prompt-packs/[id] - Delete prompt pack
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    // Verify access to prompt pack
    const promptPack = await prisma.promptPack.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: { externalId: true }
        }
      }
    });

    if (!promptPack || promptPack.project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Prompt pack not found or access denied' },
        { status: 404 }
      );
    }

    // Delete prompt pack
    await prisma.promptPack.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      message: 'Prompt pack deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting prompt pack:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt pack' },
      { status: 500 }
    );
  }
}