export type WorkflowMode = 'dashboard' | 'project' | 'story' | 'implementation' | 'import';

export interface WorkflowProject {
  id: string;
  externalId: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  repositoryType?: string;
  architectSessionId?: string;
  workingDoc?: string;
  createdAt: Date;
  updatedAt: Date;
  stories?: UserStory[];
}

export interface UserStory {
  id: string;
  projectId: string;
  title: string;
  userStatement: string;
  description: string;
  acceptanceCriteria: string[];
  priority?: 'high' | 'medium' | 'low';
  status: 'backlog' | 'in_progress' | 'completed';
  externalRef?: string;
  markdownContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptPack {
  id: string;
  projectId: string;
  storyId: string;
  content: {
    storyContext: string;
    codebaseContext: string;
    implementationPlan: string;
    fileStructure: string[];
    testingStrategy: string;
    codeStandards: string;
    integrationPoints: string;
    deploymentConsiderations: string;
  };
  implementationPlan: string;
  filesToModify: string[];
  testingStrategy?: string;
  createdAt: Date;
}

export interface Implementation {
  id: string;
  projectId: string;
  storyId: string;
  promptPackId: string;
  type: 'manual' | 'platform';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  branchName?: string;
  pullRequestUrl?: string;
  commitHash?: string;
  output?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  repositoryUrl?: string;
  repositoryType?: string;
  architectSessionId?: string;
}

export interface CreateStoryData {
  projectId: string;
  title: string;
  userStatement: string;
  description: string;
  acceptanceCriteria: string[];
  priority?: 'high' | 'medium' | 'low';
  externalRef?: string;
}