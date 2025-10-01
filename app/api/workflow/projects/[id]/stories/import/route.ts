import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStoryService } from '@/lib/workflow/story-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const { id: projectId } = params;
    const { source, config } = await request.json();

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (!source || !config) {
      return NextResponse.json({ error: 'source and config required' }, { status: 400 });
    }

    const storyService = new WorkflowStoryService();
    let stories;

    switch (source.toLowerCase()) {
      case 'jira':
        stories = await storyService.importFromJira(projectId, config, externalId);
        break;

      case 'azure_devops':
      case 'azuredevops':
        stories = await storyService.importFromAzureDevOps(projectId, config, externalId);
        break;

      case 'architect':
        if (!config.sessionId) {
          return NextResponse.json({ error: 'sessionId required for architect import' }, { status: 400 });
        }
        stories = await storyService.generateFromArchitect(projectId, config.sessionId, externalId);
        break;

      default:
        return NextResponse.json({ error: 'Unsupported import source' }, { status: 400 });
    }

    return NextResponse.json({
      message: `Successfully imported ${stories.length} stories from ${source}`,
      stories,
      count: stories.length
    });

  } catch (error) {
    console.error('Story import error:', error);
    return NextResponse.json(
      { error: `Failed to import stories: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}