import { prisma } from '@/lib/db';
import { WorkflowProject, AnalysisStatus } from '@prisma/client';

export interface CreateProjectDto {
  name: string;
  description?: string;
  repositoryUrl?: string;
  branch?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  repositoryUrl?: string;
  repositoryPath?: string;
  branch?: string;
  githubToken?: string;
  analysisStatus?: AnalysisStatus;
}

export interface ProjectWithStats extends WorkflowProject {
  codebaseAnalysis?: {
    id: string;
    version: number;
    analyzedAt: Date;
  } | null;
  _count?: {
    stories: number;
    promptPacks: number;
  };
}

export class WorkflowProjectService {
  /**
   * Create a new workflow project
   */
  async createProject(externalId: string, data: CreateProjectDto): Promise<ProjectWithStats> {
    // Validate repository URL if provided
    if (data.repositoryUrl) {
      try {
        new URL(data.repositoryUrl);
      } catch {
        throw new Error('Invalid repository URL format');
      }
    }

    const project = await prisma.workflowProject.create({
      data: {
        externalId,
        name: data.name,
        description: data.description,
        repositoryUrl: data.repositoryUrl,
        branch: data.branch || 'main',
        analysisStatus: 'PENDING'
      },
      include: {
        codebaseAnalysis: {
          select: {
            id: true,
            version: true,
            analyzedAt: true
          }
        },
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      }
    });

    return project;
  }

  /**
   * Get all projects for a user
   */
  async getProjects(externalId: string): Promise<ProjectWithStats[]> {
    const projects = await prisma.workflowProject.findMany({
      where: { externalId },
      include: {
        codebaseAnalysis: {
          select: {
            id: true,
            version: true,
            analyzedAt: true
          }
        },
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return projects;
  }

  /**
   * Get a specific project with full details
   */
  async getProject(id: string, externalId: string): Promise<any> {
    const project = await prisma.workflowProject.findUnique({
      where: { id },
      include: {
        codebaseAnalysis: true,
        stories: {
          orderBy: { updatedAt: 'desc' }
        },
        promptPacks: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, externalId: string, data: UpdateProjectDto): Promise<ProjectWithStats> {
    // Verify project ownership
    const existingProject = await prisma.workflowProject.findUnique({
      where: { id }
    });

    if (!existingProject || existingProject.externalId !== externalId) {
      throw new Error('Project not found');
    }

    // Validate repository URL if provided
    if (data.repositoryUrl) {
      try {
        new URL(data.repositoryUrl);
      } catch {
        throw new Error('Invalid repository URL format');
      }
    }

    const project = await prisma.workflowProject.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        codebaseAnalysis: {
          select: {
            id: true,
            version: true,
            analyzedAt: true
          }
        },
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      }
    });

    return project;
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string, externalId: string): Promise<void> {
    // Verify project ownership
    const existingProject = await prisma.workflowProject.findUnique({
      where: { id }
    });

    if (!existingProject || existingProject.externalId !== externalId) {
      throw new Error('Project not found');
    }

    // Delete project (cascade will handle related records)
    await prisma.workflowProject.delete({
      where: { id }
    });
  }

  /**
   * Connect repository to project
   */
  async connectRepository(projectId: string, connectionData: { repositoryUrl?: string; repositoryPath?: string; branch?: string; githubToken?: string }, externalId: string): Promise<ProjectWithStats> {
    // Validate repository URL if provided
    if (connectionData.repositoryUrl) {
      try {
        new URL(connectionData.repositoryUrl);
      } catch {
        throw new Error('Invalid repository URL format');
      }
    }

    // Verify project ownership
    const existingProject = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!existingProject || existingProject.externalId !== externalId) {
      throw new Error('Project not found');
    }

    const project = await prisma.workflowProject.update({
      where: { id: projectId },
      data: {
        repositoryUrl: connectionData.repositoryUrl,
        repositoryPath: connectionData.repositoryPath,
        branch: connectionData.branch || 'main',
        githubToken: connectionData.githubToken,
        analysisStatus: 'PENDING',
        updatedAt: new Date()
      },
      include: {
        codebaseAnalysis: {
          select: {
            id: true,
            version: true,
            analyzedAt: true
          }
        },
        _count: {
          select: {
            stories: true,
            promptPacks: true
          }
        }
      }
    });

    return project;
  }

  /**
   * Update project analysis status
   */
  async updateAnalysisStatus(projectId: string, status: AnalysisStatus, externalId: string): Promise<void> {
    // Verify project ownership
    const existingProject = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!existingProject || existingProject.externalId !== externalId) {
      throw new Error('Project not found');
    }

    await prisma.workflowProject.update({
      where: { id: projectId },
      data: {
        analysisStatus: status,
        updatedAt: new Date()
      }
    });
  }
}