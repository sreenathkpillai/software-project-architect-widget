import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GitService } from '@/lib/git-service';
import path from 'path';

const prisma = new PrismaClient();

// GET /api/workflow/repositories/branches - List branches
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

    const repoPath = path.join(process.cwd(), '.repos', projectId);
    const gitService = new GitService(repoPath);

    const branches = await gitService.listBranches();
    const currentBranch = await gitService.getCurrentBranch();

    return NextResponse.json({
      branches,
      currentBranch,
    });
  } catch (error) {
    console.error('Error listing branches:', error);
    return NextResponse.json(
      { error: 'Failed to list branches' },
      { status: 500 }
    );
  }
}

// POST /api/workflow/repositories/branches - Create branch for user story
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
    const { projectId, storyId, branchName, checkout = true } = body;

    if (!projectId || !storyId) {
      return NextResponse.json(
        { error: 'Project ID and Story ID are required' },
        { status: 400 }
      );
    }

    // Verify project and story access
    const story = await prisma.userStory.findFirst({
      where: {
        id: storyId,
        project: {
          id: projectId,
          externalId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // Generate branch name from story title if not provided
    const finalBranchName = branchName ||
      `story/${storyId.slice(-8)}-${story.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30)}`;

    const repoPath = path.join(process.cwd(), '.repos', projectId);
    const gitService = new GitService(repoPath);

    // Create and optionally checkout the branch
    await gitService.createBranch(finalBranchName, checkout);

    // Store branch association with story (you might want to add a field to UserStory model)
    // For now, we'll return the branch info

    return NextResponse.json({
      message: 'Branch created successfully',
      branchName: finalBranchName,
      checkedOut: checkout,
      storyId,
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}

// PUT /api/workflow/repositories/branches/checkout - Checkout branch
export async function PUT(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, branchName } = body;

    if (!projectId || !branchName) {
      return NextResponse.json(
        { error: 'Project ID and branch name are required' },
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

    const repoPath = path.join(process.cwd(), '.repos', projectId);
    const gitService = new GitService(repoPath);

    await gitService.checkoutBranch(branchName);

    return NextResponse.json({
      message: 'Branch checked out successfully',
      currentBranch: branchName,
    });
  } catch (error) {
    console.error('Error checking out branch:', error);
    return NextResponse.json(
      { error: 'Failed to checkout branch' },
      { status: 500 }
    );
  }
}