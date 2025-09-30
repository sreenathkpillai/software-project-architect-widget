import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/workflow/oauth/repositories - Get user's connected repositories
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
    const provider = searchParams.get('provider');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    // Build where clause
    const where: any = {
      integration: {
        externalId,
      },
    };

    if (provider) {
      where.integration.provider = provider;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get repositories with pagination
    const [repositories, total] = await Promise.all([
      prisma.gitRepository.findMany({
        where,
        include: {
          integration: {
            select: {
              provider: true,
              userInfo: true,
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { lastSyncAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.gitRepository.count({ where }),
    ]);

    return NextResponse.json({
      repositories: repositories.map(repo => ({
        id: repo.id,
        providerRepoId: repo.providerRepoId,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        private: repo.private,
        defaultBranch: repo.defaultBranch,
        cloneUrl: repo.cloneUrl,
        webUrl: repo.webUrl,
        owner: {
          login: repo.ownerLogin,
          avatarUrl: repo.ownerAvatarUrl,
        },
        provider: repo.integration.provider,
        lastSyncAt: repo.lastSyncAt,
        projects: repo.projects,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get repositories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const connectRepositorySchema = z.object({
  repositoryId: z.string(),
  projectId: z.string(),
});

// POST /api/workflow/oauth/repositories - Connect repository to project
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
    const { repositoryId, projectId } = connectRepositorySchema.parse(body);

    // Verify repository belongs to user
    const repository = await prisma.gitRepository.findFirst({
      where: {
        id: repositoryId,
        integration: {
          externalId,
        },
      },
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Verify project belongs to user
    const project = await prisma.workflowProject.findFirst({
      where: {
        id: projectId,
        externalId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Connect repository to project
    await prisma.workflowProject.update({
      where: { id: projectId },
      data: {
        repositories: {
          connect: { id: repositoryId },
        },
        repositoryUrl: repository.cloneUrl,
        repositoryType: repository.integration.provider,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Connect repository error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}