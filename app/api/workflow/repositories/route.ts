import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GitService } from '@/lib/git-service';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// GET /api/workflow/repositories - Get repository info for a project
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

    // If no repository URL, return empty state
    if (!project.repositoryUrl) {
      return NextResponse.json({
        initialized: false,
        url: null,
        type: null,
      });
    }

    // Get repository info
    const repoPath = path.join(process.cwd(), '.repos', projectId);
    const gitService = new GitService(repoPath);

    try {
      const [branch, status, branches, commits] = await Promise.all([
        gitService.getCurrentBranch(),
        gitService.getStatus(),
        gitService.listBranches(),
        gitService.getCommitHistory(10),
      ]);

      return NextResponse.json({
        initialized: true,
        url: project.repositoryUrl,
        type: project.repositoryType,
        currentBranch: branch,
        status,
        branches,
        recentCommits: commits,
      });
    } catch (error) {
      // Repository not cloned locally yet
      return NextResponse.json({
        initialized: false,
        url: project.repositoryUrl,
        type: project.repositoryType,
        needsClone: true,
      });
    }
  } catch (error) {
    console.error('Error fetching repository info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repository info' },
      { status: 500 }
    );
  }
}

// POST /api/workflow/repositories - Initialize or clone repository
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
    const { projectId, repositoryUrl, repositoryType, action } = body;

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

    switch (action) {
      case 'init':
        // Initialize new repository
        await gitService.initializeRepository();

        // Update project with repository info
        await prisma.workflowProject.update({
          where: { id: projectId },
          data: {
            repositoryUrl: repoPath,
            repositoryType: 'local',
          },
        });

        return NextResponse.json({
          message: 'Repository initialized successfully',
          path: repoPath,
        });

      case 'clone':
        if (!repositoryUrl) {
          return NextResponse.json(
            { error: 'Repository URL is required for cloning' },
            { status: 400 }
          );
        }

        // Clone remote repository
        await gitService.initializeRepository(repositoryUrl);

        // Detect repository type from URL
        let repoType = 'git';
        if (repositoryUrl.includes('github.com')) repoType = 'github';
        else if (repositoryUrl.includes('gitlab.com')) repoType = 'gitlab';
        else if (repositoryUrl.includes('bitbucket.org')) repoType = 'bitbucket';

        // Update project with repository info
        await prisma.workflowProject.update({
          where: { id: projectId },
          data: {
            repositoryUrl,
            repositoryType: repositoryType || repoType,
          },
        });

        return NextResponse.json({
          message: 'Repository cloned successfully',
          path: repoPath,
        });

      case 'connect':
        // Connect to existing repository without cloning
        await prisma.workflowProject.update({
          where: { id: projectId },
          data: {
            repositoryUrl,
            repositoryType: repositoryType || 'git',
          },
        });

        return NextResponse.json({
          message: 'Repository connected successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing repository:', error);
    return NextResponse.json(
      { error: 'Failed to manage repository' },
      { status: 500 }
    );
  }
}