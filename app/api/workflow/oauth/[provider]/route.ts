import { NextRequest, NextResponse } from 'next/server';
import { OAuthService, OAuthProvider } from '@/lib/oauth-service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withAuthenticatedRoute, withValidation } from '@/lib/middleware';
import { ValidationError } from '@/lib/error-handling';

const oauthService = new OAuthService();

// GET /api/workflow/oauth/github - Get OAuth authorization URL
export const GET = withAuthenticatedRoute(async (
  request: NextRequest,
  { params }: { params: { provider: string } }
) => {
  const externalId = (request as any).externalId;
  const provider = params.provider as OAuthProvider;

  if (!['github', 'gitlab', 'bitbucket'].includes(provider)) {
    throw new ValidationError(
      z.ZodError.create([{
        code: 'invalid_enum_value',
        options: ['github', 'gitlab', 'bitbucket'],
        received: provider,
        path: ['provider'],
        message: 'Invalid OAuth provider'
      }])
    );
  }

  const state = `${externalId}:${Date.now()}`;
  const authUrl = oauthService.getAuthUrl(provider, state);

  return NextResponse.json({
    authUrl,
    state,
    provider
  });
});

const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

// POST /api/workflow/oauth/github - Handle OAuth callback
export const POST = withValidation(
  callbackSchema,
  async (
    request: NextRequest,
    validatedData: z.infer<typeof callbackSchema>,
    { params }: { params: { provider: string } }
  ) => {
    const provider = params.provider as OAuthProvider;

    if (!['github', 'gitlab', 'bitbucket'].includes(provider)) {
      throw new ValidationError(
        z.ZodError.create([{
          code: 'invalid_enum_value',
          options: ['github', 'gitlab', 'bitbucket'],
          received: provider,
          path: ['provider'],
          message: 'Invalid OAuth provider'
        }])
      );
    }

    const { code, state } = validatedData;

    // Extract externalId from state
    const externalId = state.split(':')[0];
    if (!externalId) {
      throw new ValidationError(
        z.ZodError.create([{
          code: 'invalid_string',
          validation: 'regex',
          message: 'Invalid state parameter format',
          path: ['state']
        }])
      );
    }

    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(provider, code, state);

    // Get user info from provider
    const userInfo = await oauthService.getUserInfo(provider, tokens.accessToken);

    // Store or update OAuth integration
    const integration = await prisma.oAuthIntegration.upsert({
      where: {
        externalId_provider: {
          externalId,
          provider,
        },
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        userInfo,
        updatedAt: new Date(),
      },
      create: {
        externalId,
        provider,
        providerUserId: userInfo.id?.toString() || userInfo.uuid || userInfo.account_id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        userInfo,
      },
    });

    // Fetch and store repositories
    const repositories = await oauthService.getRepositories(provider, tokens.accessToken);

    // Store repositories in database
    for (const repo of repositories) {
      await prisma.gitRepository.upsert({
        where: {
          integrationId_providerRepoId: {
            integrationId: integration.id,
            providerRepoId: repo.id,
          },
        },
        update: {
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          private: repo.private,
          defaultBranch: repo.defaultBranch,
          cloneUrl: repo.cloneUrl,
          webUrl: repo.webUrl,
          ownerLogin: repo.owner.login,
          ownerAvatarUrl: repo.owner.avatarUrl,
          lastSyncAt: new Date(),
        },
        create: {
          integrationId: integration.id,
          providerRepoId: repo.id,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          private: repo.private,
          defaultBranch: repo.defaultBranch,
          cloneUrl: repo.cloneUrl,
          webUrl: repo.webUrl,
          ownerLogin: repo.owner.login,
          ownerAvatarUrl: repo.owner.avatarUrl,
          lastSyncAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        userInfo: integration.userInfo,
        repositoryCount: repositories.length,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/workflow/oauth/github - Remove OAuth integration
export const DELETE = withAuthenticatedRoute(async (
  request: NextRequest,
  { params }: { params: { provider: string } }
) => {
  const externalId = (request as any).externalId;
  const provider = params.provider as OAuthProvider;

  if (!['github', 'gitlab', 'bitbucket'].includes(provider)) {
    throw new ValidationError(
      z.ZodError.create([{
        code: 'invalid_enum_value',
        options: ['github', 'gitlab', 'bitbucket'],
        received: provider,
        path: ['provider'],
        message: 'Invalid OAuth provider'
      }])
    );
  }

  // Delete OAuth integration (cascades to repositories and webhooks)
  await prisma.oAuthIntegration.delete({
    where: {
      externalId_provider: {
        externalId,
        provider,
      },
    },
  });

  return NextResponse.json({ success: true });
});