import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OAuthService } from '@/lib/oauth-service';
import crypto from 'crypto';

const oauthService = new OAuthService();

// POST /api/workflow/webhooks - Handle incoming webhooks from Git providers
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256') ||
                     request.headers.get('x-gitlab-signature') ||
                     request.headers.get('x-hook-uuid');

    const event = request.headers.get('x-github-event') ||
                 request.headers.get('x-gitlab-event') ||
                 request.headers.get('x-event-key');

    if (!event) {
      return NextResponse.json({ error: 'Missing event header' }, { status: 400 });
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Determine provider based on payload structure
    let provider = 'github';
    if (payload.object_kind) provider = 'gitlab';
    if (payload.repository?.type === 'repository') provider = 'bitbucket';

    // Find webhook endpoint by repository
    const repositoryFullName = payload.repository?.full_name ||
                              payload.project?.path_with_namespace ||
                              payload.repository?.name;

    if (!repositoryFullName) {
      return NextResponse.json({ error: 'Repository information missing' }, { status: 400 });
    }

    const webhook = await prisma.webhookEndpoint.findFirst({
      where: {
        provider,
        repository: {
          fullName: repositoryFullName,
        },
      },
      include: {
        repository: {
          include: {
            projects: true,
          },
        },
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify webhook signature (optional but recommended)
    if (webhook.secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');

      const providedSignature = signature.replace(/^sha256=/, '');

      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Create webhook delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        deliveryId: request.headers.get('x-github-delivery') ||
                   request.headers.get('x-gitlab-delivery') ||
                   crypto.randomUUID(),
        payload,
      },
    });

    // Process webhook based on event type
    try {
      await processWebhookEvent(webhook, event, payload);

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          processed: true,
          success: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Webhook processing error:', error);

      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          processed: true,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
        },
      });
    }

    // Update webhook last triggered
    await prisma.webhookEndpoint.update({
      where: { id: webhook.id },
      data: { lastTriggered: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processWebhookEvent(webhook: any, event: string, payload: any) {
  switch (event) {
    case 'push':
    case 'repository:push':
      await handlePushEvent(webhook, payload);
      break;

    case 'pull_request':
    case 'merge_request':
    case 'pullrequest:created':
      await handlePullRequestEvent(webhook, payload);
      break;

    case 'issues':
    case 'issue':
      await handleIssueEvent(webhook, payload);
      break;

    default:
      console.log(`Unhandled webhook event: ${event}`);
  }
}

async function handlePushEvent(webhook: any, payload: any) {
  const branch = payload.ref?.replace('refs/heads/', '') || payload.push?.changes?.[0]?.new?.name;
  const commits = payload.commits || payload.push?.changes?.[0]?.commits || [];

  // Log activity for connected projects
  for (const project of webhook.repository.projects) {
    await prisma.activityLog.create({
      data: {
        externalId: project.externalId,
        action: 'push',
        resource: 'repository',
        resourceId: webhook.repository.id,
        details: {
          branch,
          commitCount: commits.length,
          repository: webhook.repository.fullName,
        },
        metadata: {
          webhookEvent: 'push',
          commits: commits.slice(0, 5), // Store only first 5 commits
        },
      },
    });
  }
}

async function handlePullRequestEvent(webhook: any, payload: any) {
  const pr = payload.pull_request || payload.merge_request || payload.pullrequest;
  const action = payload.action || payload.object_attributes?.action || 'created';

  // Log activity for connected projects
  for (const project of webhook.repository.projects) {
    await prisma.activityLog.create({
      data: {
        externalId: project.externalId,
        action: `pull_request_${action}`,
        resource: 'repository',
        resourceId: webhook.repository.id,
        details: {
          title: pr.title,
          number: pr.number || pr.iid || pr.id,
          author: pr.user?.login || pr.author?.username || pr.author?.display_name,
          repository: webhook.repository.fullName,
        },
        metadata: {
          webhookEvent: 'pull_request',
          url: pr.html_url || pr.web_url || pr.links?.html?.href,
        },
      },
    });
  }
}

async function handleIssueEvent(webhook: any, payload: any) {
  const issue = payload.issue || payload.object_attributes;
  const action = payload.action || 'created';

  // Log activity for connected projects
  for (const project of webhook.repository.projects) {
    await prisma.activityLog.create({
      data: {
        externalId: project.externalId,
        action: `issue_${action}`,
        resource: 'repository',
        resourceId: webhook.repository.id,
        details: {
          title: issue.title,
          number: issue.number || issue.iid || issue.id,
          author: issue.user?.login || issue.author?.username,
          repository: webhook.repository.fullName,
        },
        metadata: {
          webhookEvent: 'issue',
          url: issue.html_url || issue.web_url,
        },
      },
    });
  }
}