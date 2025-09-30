export type IssueTrackerProvider = 'jira' | 'linear' | 'github' | 'gitlab';

export interface IssueTrackerConfig {
  provider: IssueTrackerProvider;
  baseUrl: string;
  credentials: {
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
  };
  config?: {
    projectKey?: string;
    teamId?: string;
    organizationId?: string;
  };
}

export interface ExternalIssue {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignee?: string;
  labels: string[];
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export class IssueTrackerService {
  private config: IssueTrackerConfig;

  constructor(config: IssueTrackerConfig) {
    this.config = config;
  }

  async getIssues(options: {
    page?: number;
    limit?: number;
    status?: string;
    assignee?: string;
    search?: string;
  } = {}): Promise<ExternalIssue[]> {
    const { page = 1, limit = 50, status, assignee, search } = options;

    switch (this.config.provider) {
      case 'jira':
        return this.getJiraIssues({ page, limit, status, assignee, search });
      case 'linear':
        return this.getLinearIssues({ page, limit, status, assignee, search });
      case 'github':
        return this.getGitHubIssues({ page, limit, status, assignee, search });
      case 'gitlab':
        return this.getGitLabIssues({ page, limit, status, assignee, search });
      default:
        throw new Error(`Unsupported issue tracker: ${this.config.provider}`);
    }
  }

  async createIssue(issue: {
    title: string;
    description?: string;
    priority?: string;
    labels?: string[];
    assignee?: string;
  }): Promise<ExternalIssue> {
    switch (this.config.provider) {
      case 'jira':
        return this.createJiraIssue(issue);
      case 'linear':
        return this.createLinearIssue(issue);
      case 'github':
        return this.createGitHubIssue(issue);
      case 'gitlab':
        return this.createGitLabIssue(issue);
      default:
        throw new Error(`Unsupported issue tracker: ${this.config.provider}`);
    }
  }

  async updateIssue(issueId: string, updates: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
  }): Promise<ExternalIssue> {
    switch (this.config.provider) {
      case 'jira':
        return this.updateJiraIssue(issueId, updates);
      case 'linear':
        return this.updateLinearIssue(issueId, updates);
      case 'github':
        return this.updateGitHubIssue(issueId, updates);
      case 'gitlab':
        return this.updateGitLabIssue(issueId, updates);
      default:
        throw new Error(`Unsupported issue tracker: ${this.config.provider}`);
    }
  }

  // JIRA Implementation
  private async getJiraIssues(options: any): Promise<ExternalIssue[]> {
    const { page, limit, status, assignee, search } = options;

    let jql = `project = "${this.config.config?.projectKey}"`;
    if (status) jql += ` AND status = "${status}"`;
    if (assignee) jql += ` AND assignee = "${assignee}"`;
    if (search) jql += ` AND text ~ "${search}"`;

    const response = await fetch(`${this.config.baseUrl}/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.credentials.username}:${this.config.credentials.apiKey}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql,
        startAt: (page - 1) * limit,
        maxResults: limit,
        fields: ['summary', 'description', 'status', 'priority', 'assignee', 'labels', 'created', 'updated'],
      }),
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.issues.map((issue: any) => this.normalizeJiraIssue(issue));
  }

  private async createJiraIssue(issue: any): Promise<ExternalIssue> {
    const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.credentials.username}:${this.config.credentials.apiKey}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: this.config.config?.projectKey },
          summary: issue.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: issue.description || '' }],
              },
            ],
          },
          issuetype: { name: 'Task' },
          priority: issue.priority ? { name: issue.priority } : undefined,
          labels: issue.labels || [],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    const data = await response.json();
    const createdIssue = await this.getJiraIssue(data.key);
    return createdIssue;
  }

  private async updateJiraIssue(issueId: string, updates: any): Promise<ExternalIssue> {
    const updateData: any = { fields: {} };

    if (updates.title) updateData.fields.summary = updates.title;
    if (updates.description) {
      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: updates.description }],
          },
        ],
      };
    }
    if (updates.priority) updateData.fields.priority = { name: updates.priority };
    if (updates.labels) updateData.fields.labels = updates.labels;

    const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue/${issueId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.credentials.username}:${this.config.credentials.apiKey}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    return this.getJiraIssue(issueId);
  }

  private async getJiraIssue(issueId: string): Promise<ExternalIssue> {
    const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue/${issueId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.credentials.username}:${this.config.credentials.apiKey}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    const issue = await response.json();
    return this.normalizeJiraIssue(issue);
  }

  private normalizeJiraIssue(issue: any): ExternalIssue {
    return {
      id: issue.key,
      title: issue.fields.summary,
      description: this.extractJiraDescription(issue.fields.description),
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      labels: issue.fields.labels || [],
      url: `${this.config.baseUrl}/browse/${issue.key}`,
      createdAt: new Date(issue.fields.created),
      updatedAt: new Date(issue.fields.updated),
    };
  }

  private extractJiraDescription(description: any): string {
    if (!description || !description.content) return '';
    return description.content
      .map((block: any) =>
        block.content?.map((inline: any) => inline.text).join('') || ''
      )
      .join('\n');
  }

  // Linear Implementation (simplified)
  private async getLinearIssues(options: any): Promise<ExternalIssue[]> {
    // Linear GraphQL implementation would go here
    throw new Error('Linear integration not yet implemented');
  }

  private async createLinearIssue(issue: any): Promise<ExternalIssue> {
    throw new Error('Linear integration not yet implemented');
  }

  private async updateLinearIssue(issueId: string, updates: any): Promise<ExternalIssue> {
    throw new Error('Linear integration not yet implemented');
  }

  // GitHub Issues Implementation (simplified)
  private async getGitHubIssues(options: any): Promise<ExternalIssue[]> {
    // GitHub Issues API implementation would go here
    throw new Error('GitHub Issues integration not yet implemented');
  }

  private async createGitHubIssue(issue: any): Promise<ExternalIssue> {
    throw new Error('GitHub Issues integration not yet implemented');
  }

  private async updateGitHubIssue(issueId: string, updates: any): Promise<ExternalIssue> {
    throw new Error('GitHub Issues integration not yet implemented');
  }

  // GitLab Issues Implementation (simplified)
  private async getGitLabIssues(options: any): Promise<ExternalIssue[]> {
    // GitLab Issues API implementation would go here
    throw new Error('GitLab Issues integration not yet implemented');
  }

  private async createGitLabIssue(issue: any): Promise<ExternalIssue> {
    throw new Error('GitLab Issues integration not yet implemented');
  }

  private async updateGitLabIssue(issueId: string, updates: any): Promise<ExternalIssue> {
    throw new Error('GitLab Issues integration not yet implemented');
  }
}