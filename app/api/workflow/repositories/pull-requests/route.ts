import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GitService } from '@/lib/git-service';
import path from 'path';

const prisma = new PrismaClient();

// POST /api/workflow/repositories/pull-requests - Create pull request
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
      title,
      description,
      baseBranch = 'main',
      headBranch,
    } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and PR title are required' },
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

    // Check if project has a remote repository
    if (!project.repositoryUrl || project.repositoryUrl.startsWith('/')) {
      return NextResponse.json(
        { error: 'Project requires a remote repository for pull requests' },
        { status: 400 }
      );
    }

    const repoPath = path.join(process.cwd(), '.repos', projectId);
    const gitService = new GitService(repoPath);

    // Get story details if provided
    let prBody = description || '';
    if (storyId) {
      const story = await prisma.userStory.findUnique({
        where: { id: storyId },
        select: {
          title: true,
          userStatement: true,
          acceptanceCriteria: true,
        },
      });

      if (story) {
        prBody = `## User Story\n${story.title}\n\n`;
        prBody += `**Statement:** ${story.userStatement}\n\n`;

        if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
          prBody += `## Acceptance Criteria\n`;
          (story.acceptanceCriteria as string[]).forEach((criteria: string) => {
            prBody += `- [ ] ${criteria}\n`;
          });
          prBody += '\n';
        }

        if (description) {
          prBody += `## Description\n${description}\n`;
        }
      }
    }

    // Create the pull request
    const pr = await gitService.createPullRequest(
      title,
      prBody,
      baseBranch,
      headBranch
    );

    // Store PR reference (you might want to add a field to Implementation model)
    // For now, we'll return the PR info

    return NextResponse.json({
      message: 'Pull request created successfully',
      pullRequest: {
        url: pr.url,
        number: pr.number,
        title,
        storyId,
      },
    });
  } catch (error) {
    console.error('Error creating pull request:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request' },
      { status: 500 }
    );
  }
}