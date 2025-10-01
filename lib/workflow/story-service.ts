import { prisma } from '@/lib/db';
import { WorkflowStory, Priority, StoryStatus, StorySource } from '@prisma/client';

export interface CreateStoryDto {
  title: string;
  description: string;
  acceptanceCriteria?: string;
  priority?: Priority;
  status?: StoryStatus;
  source?: StorySource;
  sourceId?: string;
  storyPoints?: number;
  externalStoryId?: string;
}

export interface UpdateStoryDto {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  priority?: Priority;
  status?: StoryStatus;
  storyPoints?: number;
}

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface AzureConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
}

export interface StoryWithCounts extends WorkflowStory {
  _count?: {
    promptPacks: number;
  };
}

export class WorkflowStoryService {
  /**
   * Create a new story
   */
  async createStory(projectId: string, data: CreateStoryDto, externalId: string): Promise<StoryWithCounts> {
    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    const story = await prisma.workflowStory.create({
      data: {
        projectId,
        externalId: data.externalStoryId,
        title: data.title,
        description: data.description,
        acceptanceCriteria: data.acceptanceCriteria,
        priority: data.priority || 'MEDIUM',
        status: data.status || 'TODO',
        source: data.source || 'MANUAL',
        sourceId: data.sourceId,
        storyPoints: data.storyPoints
      },
      include: {
        _count: {
          select: {
            promptPacks: true
          }
        }
      }
    });

    return story;
  }

  /**
   * Get stories for a project
   */
  async getStories(projectId: string, externalId: string): Promise<StoryWithCounts[]> {
    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    const stories = await prisma.workflowStory.findMany({
      where: { projectId },
      include: {
        _count: {
          select: {
            promptPacks: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return stories;
  }

  /**
   * Get a specific story
   */
  async getStory(id: string, externalId: string): Promise<any> {
    const story = await prisma.workflowStory.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            externalId: true
          }
        },
        promptPacks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!story || story.project.externalId !== externalId) {
      throw new Error('Story not found');
    }

    return story;
  }

  /**
   * Update a story
   */
  async updateStory(id: string, data: UpdateStoryDto, externalId: string): Promise<StoryWithCounts> {
    // Verify story ownership through project
    const existingStory = await prisma.workflowStory.findUnique({
      where: { id },
      include: {
        project: {
          select: { externalId: true }
        }
      }
    });

    if (!existingStory || existingStory.project.externalId !== externalId) {
      throw new Error('Story not found');
    }

    const story = await prisma.workflowStory.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            promptPacks: true
          }
        }
      }
    });

    return story;
  }

  /**
   * Delete a story
   */
  async deleteStory(id: string, externalId: string): Promise<void> {
    // Verify story ownership through project
    const existingStory = await prisma.workflowStory.findUnique({
      where: { id },
      include: {
        project: {
          select: { externalId: true }
        }
      }
    });

    if (!existingStory || existingStory.project.externalId !== externalId) {
      throw new Error('Story not found');
    }

    // Delete story (cascade will handle prompt packs)
    await prisma.workflowStory.delete({
      where: { id }
    });
  }

  /**
   * Import stories from JIRA
   */
  async importFromJira(projectId: string, config: JiraConfig, externalId: string): Promise<StoryWithCounts[]> {
    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    try {
      // Create basic auth header
      const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

      // Fetch issues from JIRA
      const response = await fetch(
        `${config.baseUrl}/rest/api/3/search?jql=project=${config.projectKey}&fields=key,summary,description,priority,status,customfield_10016`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`JIRA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const issues = data.issues || [];

      // Convert JIRA issues to stories
      const stories: StoryWithCounts[] = [];

      for (const issue of issues) {
        const storyData: CreateStoryDto = {
          title: issue.fields.summary || 'Untitled',
          description: issue.fields.description?.content
            ? this.extractTextFromJiraDescription(issue.fields.description)
            : 'No description provided',
          priority: this.mapJiraPriority(issue.fields.priority?.name),
          source: 'JIRA',
          externalStoryId: issue.key,
          storyPoints: issue.fields.customfield_10016 // Story points field
        };

        const story = await this.createStory(projectId, storyData, externalId);
        stories.push(story);
      }

      return stories;

    } catch (error) {
      console.error('JIRA import error:', error);
      throw new Error(`Failed to import from JIRA: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import stories from Azure DevOps
   */
  async importFromAzureDevOps(projectId: string, config: AzureConfig, externalId: string): Promise<StoryWithCounts[]> {
    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    try {
      // Create basic auth header
      const auth = Buffer.from(`:${config.personalAccessToken}`).toString('base64');

      // Fetch work items from Azure DevOps
      const response = await fetch(
        `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=6.0`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: "SELECT [System.Id], [System.Title], [System.Description], [Microsoft.VSTS.Common.Priority], [Microsoft.VSTS.Scheduling.Effort] FROM WorkItems WHERE [System.WorkItemType] = 'User Story'"
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Azure DevOps API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const workItemIds = data.workItems?.map((wi: any) => wi.id) || [];

      if (workItemIds.length === 0) {
        return [];
      }

      // Fetch detailed work item data
      const detailsResponse = await fetch(
        `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&api-version=6.0`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!detailsResponse.ok) {
        throw new Error(`Azure DevOps details API error: ${detailsResponse.status} ${detailsResponse.statusText}`);
      }

      const detailsData = await detailsResponse.json();
      const workItems = detailsData.value || [];

      // Convert Azure DevOps work items to stories
      const stories: StoryWithCounts[] = [];

      for (const workItem of workItems) {
        const fields = workItem.fields;
        const storyData: CreateStoryDto = {
          title: fields['System.Title'] || 'Untitled',
          description: fields['System.Description'] || 'No description provided',
          priority: this.mapAzurePriority(fields['Microsoft.VSTS.Common.Priority']),
          source: 'AZURE_DEVOPS',
          externalStoryId: workItem.id.toString(),
          storyPoints: fields['Microsoft.VSTS.Scheduling.Effort']
        };

        const story = await this.createStory(projectId, storyData, externalId);
        stories.push(story);
      }

      return stories;

    } catch (error) {
      console.error('Azure DevOps import error:', error);
      throw new Error(`Failed to import from Azure DevOps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate stories from architect session
   */
  async generateFromArchitect(projectId: string, sessionId: string, externalId: string): Promise<StoryWithCounts[]> {
    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    try {
      // Get architect session
      const session = await prisma.savedSession.findUnique({
        where: { userSession: sessionId },
        include: {
          messages: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!session || session.externalId !== externalId) {
        throw new Error('Architect session not found');
      }

      // Get specifications from the session
      const specifications = await prisma.specification.findMany({
        where: { userSession: sessionId },
        orderBy: { createdAt: 'asc' }
      });

      if (specifications.length === 0) {
        throw new Error('No specifications found in architect session');
      }

      // Extract stories from PRD and other relevant specifications
      const stories = await this.extractStoriesFromSpecifications(specifications, projectId, sessionId, externalId);

      return stories;

    } catch (error) {
      console.error('Architect import error:', error);
      throw new Error(`Failed to generate from architect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract stories from architect specifications
   */
  private async extractStoriesFromSpecifications(
    specifications: any[],
    projectId: string,
    sessionId: string,
    externalId: string
  ): Promise<StoryWithCounts[]> {
    const stories: StoryWithCounts[] = [];

    // Find PRD specification for features
    const prd = specifications.find(spec => spec.documentType === 'prd');
    if (prd) {
      const features = this.extractFeaturesFromPRD(prd.content);

      for (const feature of features) {
        const storyData: CreateStoryDto = {
          title: feature.title,
          description: feature.description,
          acceptanceCriteria: feature.acceptanceCriteria,
          priority: feature.priority,
          source: 'ARCHITECT',
          sourceId: sessionId
        };

        const story = await this.createStory(projectId, storyData, externalId);
        stories.push(story);
      }
    }

    // Find user flow specification for workflow stories
    const userFlow = specifications.find(spec => spec.documentType === 'user_flow');
    if (userFlow) {
      const workflows = this.extractWorkflowsFromUserFlow(userFlow.content);

      for (const workflow of workflows) {
        const storyData: CreateStoryDto = {
          title: workflow.title,
          description: workflow.description,
          acceptanceCriteria: workflow.acceptanceCriteria,
          priority: 'MEDIUM',
          source: 'ARCHITECT',
          sourceId: sessionId
        };

        const story = await this.createStory(projectId, storyData, externalId);
        stories.push(story);
      }
    }

    return stories;
  }

  /**
   * Extract features from PRD content
   */
  private extractFeaturesFromPRD(content: string): Array<{
    title: string;
    description: string;
    acceptanceCriteria?: string;
    priority: Priority;
  }> {
    const features: Array<{
      title: string;
      description: string;
      acceptanceCriteria?: string;
      priority: Priority;
    }> = [];

    // Simple regex patterns to extract features
    const featurePattern = /(?:##|###)\s*(.+?)(?:\n|$)/g;
    const priorityPattern = /(high|medium|low|critical)/gi;

    let match;
    while ((match = featurePattern.exec(content)) !== null) {
      const title = match[1].trim();

      if (title.toLowerCase().includes('feature') ||
          title.toLowerCase().includes('requirement') ||
          title.toLowerCase().includes('functionality')) {

        // Extract description (content after the heading until next heading)
        const startIndex = match.index + match[0].length;
        const nextHeadingMatch = content.slice(startIndex).search(/(?:^|\n)##/);
        const endIndex = nextHeadingMatch === -1 ? content.length : startIndex + nextHeadingMatch;
        const description = content.slice(startIndex, endIndex).trim();

        // Determine priority
        const priorityMatch = description.match(priorityPattern);
        let priority: Priority = 'MEDIUM';
        if (priorityMatch) {
          const p = priorityMatch[0].toLowerCase();
          if (p === 'high') priority = 'HIGH';
          else if (p === 'low') priority = 'LOW';
          else if (p === 'critical') priority = 'CRITICAL';
        }

        features.push({
          title: title.replace(/feature|requirement|functionality/gi, '').trim(),
          description: description.substring(0, 500), // Limit description length
          priority
        });
      }
    }

    // If no features found, create generic stories
    if (features.length === 0) {
      features.push({
        title: 'User Authentication',
        description: 'Implement user registration, login, and authentication system',
        priority: 'HIGH'
      });
      features.push({
        title: 'Core Functionality',
        description: 'Implement the main features described in the project requirements',
        priority: 'HIGH'
      });
      features.push({
        title: 'User Interface',
        description: 'Create the user interface components and layouts',
        priority: 'MEDIUM'
      });
    }

    return features;
  }

  /**
   * Extract workflows from user flow content
   */
  private extractWorkflowsFromUserFlow(content: string): Array<{
    title: string;
    description: string;
    acceptanceCriteria?: string;
  }> {
    const workflows: Array<{
      title: string;
      description: string;
      acceptanceCriteria?: string;
    }> = [];

    // Extract workflow steps
    const stepPattern = /(?:^|\n)\d+\.\s*(.+?)(?:\n|$)/g;

    let match;
    while ((match = stepPattern.exec(content)) !== null) {
      const step = match[1].trim();

      workflows.push({
        title: `Implement: ${step}`,
        description: `Implement the workflow step: ${step}`,
        acceptanceCriteria: `User can successfully complete: ${step}`
      });
    }

    return workflows;
  }

  /**
   * Map JIRA priority to our priority enum
   */
  private mapJiraPriority(jiraPriority?: string): Priority {
    if (!jiraPriority) return 'MEDIUM';

    const priority = jiraPriority.toLowerCase();
    if (priority.includes('critical') || priority.includes('blocker')) return 'CRITICAL';
    if (priority.includes('high') || priority.includes('major')) return 'HIGH';
    if (priority.includes('low') || priority.includes('trivial')) return 'LOW';
    return 'MEDIUM';
  }

  /**
   * Map Azure DevOps priority to our priority enum
   */
  private mapAzurePriority(azurePriority?: number): Priority {
    if (!azurePriority) return 'MEDIUM';

    if (azurePriority === 1) return 'CRITICAL';
    if (azurePriority === 2) return 'HIGH';
    if (azurePriority === 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Extract text content from JIRA ADF (Atlassian Document Format)
   */
  private extractTextFromJiraDescription(adf: any): string {
    if (!adf || !adf.content) return '';

    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }

      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ');
      }

      return '';
    };

    return adf.content.map(extractText).join('\n').trim();
  }
}