import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OAuthService } from '@/lib/oauth-service';
import { AIService } from '@/lib/ai-service';
import { GitService } from '@/lib/git-service';

// Mock external dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workflowProject: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userStory: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    promptPack: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    implementation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    oAuthIntegration: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    gitRepository: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    teamMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  verifyExternalId: jest.fn().mockResolvedValue(true),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Workflow API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Projects API', () => {
    it('should create a new project', async () => {
      const mockProject = {
        id: 'test-project-id',
        name: 'Test Project',
        description: 'Test Description',
        externalId: 'test-external-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflowProject.create.mockResolvedValue(mockProject);

      const { POST } = await import('@/app/api/workflow/projects/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': 'test-external-id',
        },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test Description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.name).toBe('Test Project');
      expect(mockPrisma.workflowProject.create).toHaveBeenCalledWith({
        data: {
          externalId: 'test-external-id',
          name: 'Test Project',
          description: 'Test Description',
        },
      });
    });

    it('should return 401 without external ID', async () => {
      const { POST } = await import('@/app/api/workflow/projects/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should get user projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          externalId: 'test-external-id',
          _count: { stories: 5 },
        },
        {
          id: 'project-2',
          name: 'Project 2',
          externalId: 'test-external-id',
          _count: { stories: 3 },
        },
      ];

      mockPrisma.workflowProject.findMany.mockResolvedValue(mockProjects);

      const { GET } = await import('@/app/api/workflow/projects/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/projects', {
        headers: {
          'x-external-id': 'test-external-id',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toHaveLength(2);
    });
  });

  describe('User Stories API', () => {
    it('should create a user story', async () => {
      const mockStory = {
        id: 'test-story-id',
        projectId: 'test-project-id',
        title: 'Test Story',
        userStatement: 'As a user, I want to test',
        description: 'Test description',
        acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
        markdownContent: '# Test Story',
        createdAt: new Date(),
      };

      mockPrisma.workflowProject.findUnique.mockResolvedValue({
        id: 'test-project-id',
        externalId: 'test-external-id',
      } as any);

      mockPrisma.userStory.create.mockResolvedValue(mockStory);

      const { POST } = await import('@/app/api/workflow/stories/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': 'test-external-id',
        },
        body: JSON.stringify({
          projectId: 'test-project-id',
          title: 'Test Story',
          userStatement: 'As a user, I want to test',
          description: 'Test description',
          acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.story.title).toBe('Test Story');
    });

    it('should return 404 for non-existent project', async () => {
      mockPrisma.workflowProject.findUnique.mockResolvedValue(null);

      const { POST } = await import('@/app/api/workflow/stories/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': 'test-external-id',
        },
        body: JSON.stringify({
          projectId: 'non-existent-project',
          title: 'Test Story',
          userStatement: 'As a user, I want to test',
          description: 'Test description',
          acceptanceCriteria: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  describe('OAuth Integration', () => {
    it('should generate OAuth authorization URL', async () => {
      const { GET } = await import('@/app/api/workflow/oauth/[provider]/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/oauth/github', {
        headers: {
          'x-external-id': 'test-external-id',
        },
      });

      const response = await GET(request, { params: { provider: 'github' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authUrl).toContain('github.com/login/oauth/authorize');
      expect(data.provider).toBe('github');
    });

    it('should handle OAuth callback', async () => {
      const mockIntegration = {
        id: 'integration-id',
        provider: 'github',
        userInfo: { login: 'testuser' },
      };

      mockPrisma.oAuthIntegration.upsert.mockResolvedValue(mockIntegration);
      mockPrisma.gitRepository.upsert.mockResolvedValue({} as any);

      // Mock OAuthService
      const mockOAuthService = {
        exchangeCodeForTokens: jest.fn().mockResolvedValue({
          accessToken: 'token',
          scope: 'repo',
        }),
        getUserInfo: jest.fn().mockResolvedValue({
          id: 123,
          login: 'testuser',
        }),
        getRepositories: jest.fn().mockResolvedValue([]),
      };

      jest.doMock('@/lib/oauth-service', () => ({
        OAuthService: jest.fn().mockImplementation(() => mockOAuthService),
      }));

      const { POST } = await import('@/app/api/workflow/oauth/[provider]/route');

      const request = new NextRequest('http://localhost:3000/api/workflow/oauth/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'oauth-code',
          state: 'test-external-id:12345',
        }),
      });

      const response = await POST(request, { params: { provider: 'github' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Service Layer Tests', () => {
  describe('OAuthService', () => {
    let oauthService: OAuthService;

    beforeEach(() => {
      oauthService = new OAuthService();
    });

    it('should generate correct GitHub auth URL', () => {
      const authUrl = oauthService.getAuthUrl('github', 'test-state');

      expect(authUrl).toContain('github.com/login/oauth/authorize');
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('scope=repo');
    });

    it('should normalize GitHub repositories correctly', () => {
      const githubRepos = [
        {
          id: 123,
          name: 'test-repo',
          full_name: 'user/test-repo',
          description: 'Test repository',
          private: false,
          default_branch: 'main',
          clone_url: 'https://github.com/user/test-repo.git',
          html_url: 'https://github.com/user/test-repo',
          owner: {
            login: 'user',
            avatar_url: 'https://avatar.url',
          },
        },
      ];

      const normalized = (oauthService as any).normalizeRepositories('github', githubRepos);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].id).toBe('123');
      expect(normalized[0].name).toBe('test-repo');
      expect(normalized[0].fullName).toBe('user/test-repo');
    });
  });

  describe('AIService', () => {
    let aiService: AIService;

    beforeEach(() => {
      aiService = new AIService({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      });
    });

    it('should build system prompt correctly', () => {
      const request = {
        prompt: 'Generate code',
        language: 'typescript',
        framework: 'react',
      };

      const systemPrompt = (aiService as any).buildSystemPrompt(request);

      expect(systemPrompt).toContain('typescript');
      expect(systemPrompt).toContain('react');
      expect(systemPrompt).toContain('production-ready');
    });

    it('should build user prompt with context', () => {
      const request = {
        prompt: 'Generate a component',
        context: 'Project context here',
      };

      const userPrompt = (aiService as any).buildUserPrompt(request);

      expect(userPrompt).toContain('Context:');
      expect(userPrompt).toContain('Project context here');
      expect(userPrompt).toContain('Generate a component');
    });
  });

  describe('GitService', () => {
    let gitService: GitService;

    beforeEach(() => {
      gitService = new GitService('/test/repo/path');
    });

    it('should format commit message correctly', () => {
      const message = 'feat: add new feature\n\nDetailed description';
      const formattedMessage = (gitService as any).formatCommitMessage(message);

      expect(formattedMessage).toContain('feat: add new feature');
    });
  });
});

describe('Error Handling Tests', () => {
  describe('Error classes', () => {
    it('should create WorkflowError with correct properties', () => {
      const { WorkflowError } = require('@/lib/error-handling');

      const error = new WorkflowError('TEST_ERROR', 'Test message', 400, { key: 'value' });

      expect(error.name).toBe('WorkflowError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ key: 'value' });
    });

    it('should create ValidationError from ZodError', () => {
      const { ValidationError } = require('@/lib/error-handling');
      const { z } = require('zod');

      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      try {
        schema.parse({ name: '', email: 'invalid' });
      } catch (zodError) {
        const validationError = new ValidationError(zodError);

        expect(validationError.code).toBe('VALIDATION_ERROR');
        expect(validationError.statusCode).toBe(400);
        expect(validationError.fieldErrors).toBeDefined();
      }
    });
  });

  describe('Error handler', () => {
    it('should handle WorkflowError correctly', () => {
      const { handleApiError, WorkflowError } = require('@/lib/error-handling');

      const error = new WorkflowError('TEST_ERROR', 'Test message', 400);
      const result = handleApiError(error);

      expect(result.error).toBe('Test message');
      expect(result.code).toBe('TEST_ERROR');
      expect(result.statusCode).toBe(400);
    });

    it('should handle generic errors', () => {
      const { handleApiError } = require('@/lib/error-handling');

      const error = new Error('Generic error');
      const result = handleApiError(error);

      expect(result.error).toBe('Generic error');
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.statusCode).toBe(500);
    });
  });
});

describe('Performance Monitoring Tests', () => {
  describe('PerformanceMonitor', () => {
    it('should record metrics correctly', () => {
      const { PerformanceMonitor } = require('@/lib/performance');

      const monitor = new PerformanceMonitor();

      monitor.recordMetric({
        name: 'test_metric',
        value: 100,
        unit: 'ms',
        context: { test: true },
      });

      const summary = monitor.getPerformanceSummary();
      expect(summary).toBeDefined();
    });

    it('should record API calls', () => {
      const { PerformanceMonitor } = require('@/lib/performance');

      const monitor = new PerformanceMonitor();

      monitor.recordAPICall({
        endpoint: '/api/test',
        method: 'GET',
        duration: 500,
        status: 200,
      });

      const summary = monitor.getPerformanceSummary();
      expect(summary.averageAPITime).toBe(500);
    });
  });

  describe('PerformanceTimer', () => {
    it('should measure duration correctly', (done) => {
      const { PerformanceTimer } = require('@/lib/performance');

      const timer = new PerformanceTimer('test');

      setTimeout(() => {
        const duration = timer.end();
        expect(duration).toBeGreaterThan(90);
        expect(duration).toBeLessThan(200);
        done();
      }, 100);
    });
  });
});

// Integration tests would go here in a real application
describe('Integration Tests', () => {
  // These would require a test database and actual API calls
  it.skip('should create project and story end-to-end', async () => {
    // Full workflow test
  });

  it.skip('should handle OAuth flow end-to-end', async () => {
    // OAuth integration test
  });

  it.skip('should generate and download prompt pack', async () => {
    // Prompt pack generation test
  });
});