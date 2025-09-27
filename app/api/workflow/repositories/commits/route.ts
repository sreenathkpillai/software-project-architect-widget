import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GitService } from '@/lib/git-service';
import path from 'path';

const prisma = new PrismaClient();

// GET /api/workflow/repositories/commits - Get commit history
export async function GET(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20');

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

    const commits = await gitService.getCommitHistory(limit);

    return NextResponse.json({
      commits,
      projectId,
    });
  } catch (error) {
    console.error('Error fetching commits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commit history' },
      { status: 500 }
    );
  }
}

// POST /api/workflow/repositories/commits - Create commit
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
    const {
      projectId,
      storyId,
      message,
      files = ['.'],
      author,
      push = false
    } = body;

    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'Project ID and commit message are required' },
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

    // Check for uncommitted changes
    const hasChanges = await gitService.hasUncommittedChanges();

    if (!hasChanges) {
      return NextResponse.json(
        { error: 'No changes to commit' },
        { status: 400 }
      );
    }

    // Stage files
    await gitService.stageFiles(files);

    // Add story reference to commit message if provided
    let finalMessage = message;
    if (storyId) {
      const story = await prisma.userStory.findUnique({
        where: { id: storyId },
        select: { title: true },
      });

      if (story) {
        finalMessage = `[${storyId.slice(-8)}] ${message}\n\nRelated to: ${story.title}`;
      }
    }

    // Create commit
    const commitHash = await gitService.commit(finalMessage, author);

    // Optionally push to remote
    if (push && project.repositoryUrl && !project.repositoryUrl.startsWith('/')) {
      await gitService.push();
    }

    return NextResponse.json({
      message: 'Commit created successfully',
      commitHash,
      pushed: push,
    });
  } catch (error) {
    console.error('Error creating commit:', error);
    return NextResponse.json(
      { error: 'Failed to create commit' },
      { status: 500 }
    );
  }
}