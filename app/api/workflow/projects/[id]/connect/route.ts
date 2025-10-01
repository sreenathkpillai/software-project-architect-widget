import { NextRequest, NextResponse } from 'next/server';
import { WorkflowProjectService } from '@/lib/workflow/project-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { externalId, repositoryUrl, repositoryPath, branch = 'main', githubToken } = await request.json();
    const { id: projectId } = params;

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (!repositoryUrl && !repositoryPath) {
      return NextResponse.json({
        error: 'Either repositoryUrl or repositoryPath is required'
      }, { status: 400 });
    }

    const projectService = new WorkflowProjectService();
    const project = await projectService.connectRepository(projectId, {
      repositoryUrl,
      repositoryPath,
      branch,
      githubToken
    }, externalId);

    return NextResponse.json({ project });

  } catch (error) {
    console.error('Connect repository error:', error);
    return NextResponse.json(
      { error: 'Failed to connect repository' },
      { status: 500 }
    );
  }
}