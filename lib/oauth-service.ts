export type OAuthProvider = 'github' | 'gitlab' | 'bitbucket';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string;
}

export interface GitRepository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  webUrl: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

export class OAuthService {
  private configs: Record<OAuthProvider, OAuthConfig>;

  constructor() {
    this.configs = {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        redirectUri: process.env.GITHUB_REDIRECT_URI || '',
        scopes: ['repo', 'read:user', 'read:org'],
      },
      gitlab: {
        clientId: process.env.GITLAB_CLIENT_ID || '',
        clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
        redirectUri: process.env.GITLAB_REDIRECT_URI || '',
        scopes: ['api', 'read_user', 'read_repository', 'write_repository'],
      },
      bitbucket: {
        clientId: process.env.BITBUCKET_CLIENT_ID || '',
        clientSecret: process.env.BITBUCKET_CLIENT_SECRET || '',
        redirectUri: process.env.BITBUCKET_REDIRECT_URI || '',
        scopes: ['repositories', 'account'],
      },
    };
  }

  getAuthUrl(provider: OAuthProvider, state?: string): string {
    const config = this.configs[provider];
    const baseUrls = {
      github: 'https://github.com/login/oauth/authorize',
      gitlab: 'https://gitlab.com/oauth/authorize',
      bitbucket: 'https://bitbucket.org/site/oauth2/authorize',
    };

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      ...(state && { state }),
    });

    return `${baseUrls[provider]}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    state?: string
  ): Promise<OAuthTokens> {
    const config = this.configs[provider];
    const tokenUrls = {
      github: 'https://github.com/login/oauth/access_token',
      gitlab: 'https://gitlab.com/oauth/token',
      bitbucket: 'https://bitbucket.org/site/oauth2/access_token',
    };

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrls[provider], {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope || config.scopes.join(' '),
    };
  }

  async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<any> {
    const apiUrls = {
      github: 'https://api.github.com/user',
      gitlab: 'https://gitlab.com/api/v4/user',
      bitbucket: 'https://api.bitbucket.org/2.0/user',
    };

    const response = await fetch(apiUrls[provider], {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    return response.json();
  }

  async getRepositories(
    provider: OAuthProvider,
    accessToken: string,
    options: { page?: number; perPage?: number } = {}
  ): Promise<GitRepository[]> {
    const { page = 1, perPage = 30 } = options;

    const apiUrls = {
      github: `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=updated&affiliation=owner,collaborator`,
      gitlab: `https://gitlab.com/api/v4/projects?membership=true&page=${page}&per_page=${perPage}&order_by=last_activity_at`,
      bitbucket: `https://api.bitbucket.org/2.0/repositories?role=contributor&page=${page}&pagelen=${perPage}`,
    };

    const response = await fetch(apiUrls[provider], {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    const data = await response.json();

    return this.normalizeRepositories(provider, data);
  }

  private normalizeRepositories(provider: OAuthProvider, data: any): GitRepository[] {
    switch (provider) {
      case 'github':
        return data.map((repo: any) => ({
          id: repo.id.toString(),
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          defaultBranch: repo.default_branch,
          cloneUrl: repo.clone_url,
          webUrl: repo.html_url,
          owner: {
            login: repo.owner.login,
            avatarUrl: repo.owner.avatar_url,
          },
        }));

      case 'gitlab':
        return data.map((repo: any) => ({
          id: repo.id.toString(),
          name: repo.name,
          fullName: repo.path_with_namespace,
          description: repo.description,
          private: repo.visibility === 'private',
          defaultBranch: repo.default_branch,
          cloneUrl: repo.http_url_to_repo,
          webUrl: repo.web_url,
          owner: {
            login: repo.namespace.path,
            avatarUrl: repo.owner?.avatar_url || '',
          },
        }));

      case 'bitbucket':
        return data.values.map((repo: any) => ({
          id: repo.uuid,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.is_private,
          defaultBranch: repo.mainbranch?.name || 'master',
          cloneUrl: repo.links.clone.find((link: any) => link.name === 'https')?.href || '',
          webUrl: repo.links.html.href,
          owner: {
            login: repo.owner.username,
            avatarUrl: repo.owner.links.avatar.href,
          },
        }));

      default:
        return [];
    }
  }

  async createWebhook(
    provider: OAuthProvider,
    accessToken: string,
    repoFullName: string,
    webhookUrl: string,
    events: string[] = ['push', 'pull_request']
  ): Promise<any> {
    const webhookApis = {
      github: `https://api.github.com/repos/${repoFullName}/hooks`,
      gitlab: `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}/hooks`,
      bitbucket: `https://api.bitbucket.org/2.0/repositories/${repoFullName}/hooks`,
    };

    const webhookConfig = this.getWebhookConfig(provider, webhookUrl, events);

    const response = await fetch(webhookApis[provider], {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookConfig),
    });

    if (!response.ok) {
      throw new Error(`Failed to create webhook: ${response.statusText}`);
    }

    return response.json();
  }

  private getWebhookConfig(provider: OAuthProvider, webhookUrl: string, events: string[]): any {
    switch (provider) {
      case 'github':
        return {
          name: 'web',
          active: true,
          events: events,
          config: {
            url: webhookUrl,
            content_type: 'json',
            insecure_ssl: '0',
          },
        };

      case 'gitlab':
        return {
          url: webhookUrl,
          push_events: events.includes('push'),
          merge_requests_events: events.includes('pull_request'),
          issues_events: events.includes('issues'),
          wiki_page_events: false,
          deployment_events: false,
          job_events: false,
          releases_events: false,
          enable_ssl_verification: true,
        };

      case 'bitbucket':
        return {
          description: 'ChainCatalyst Workflow Integration',
          url: webhookUrl,
          active: true,
          events: events.map(event => {
            const eventMap: Record<string, string> = {
              'push': 'repo:push',
              'pull_request': 'pullrequest:created',
              'issues': 'issue:created',
            };
            return eventMap[event] || event;
          }),
        };

      default:
        return {};
    }
  }

  async refreshAccessToken(provider: OAuthProvider, refreshToken: string): Promise<OAuthTokens> {
    const config = this.configs[provider];
    const tokenUrls = {
      github: 'https://github.com/login/oauth/access_token',
      gitlab: 'https://gitlab.com/oauth/token',
      bitbucket: 'https://bitbucket.org/site/oauth2/access_token',
    };

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrls[provider], {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope || config.scopes.join(' '),
    };
  }
}