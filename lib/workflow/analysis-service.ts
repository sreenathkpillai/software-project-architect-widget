import { prisma } from '@/lib/db';
import { WorkflowGitService, FileInfo, RepositoryInfo } from './git-service';
import { GitHubAnalysisService, GitHubFileContent, GitHubRepoMetadata, AnalysisProgress } from './github-analysis-service';
import { GitHubGraphQLService } from './github-graphql-service';
import { RateLimitMonitor } from './rate-limit-monitor';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_KEY,
});

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

export interface ComponentInfo {
  name: string;
  location: string;
  purpose: string;
  dependencies: string[];
  language: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface TechnicalDebt {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  files: string[];
}

export interface AnalysisResult {
  overview: {
    repository: string;
    language: string;
    framework: string;
    lastAnalyzed: string;
  };
  architecture: {
    structure: Record<string, string>;
    keyComponents: ComponentInfo[];
    databaseSchema?: any;
    externalDependencies: string[];
  };
  technicalDebt: TechnicalDebt[];
  recommendations: string[];
}

export class WorkflowAnalysisService {
  private gitService: WorkflowGitService;
  private githubService: GitHubAnalysisService;
  private githubGraphQLService: GitHubGraphQLService | null = null;

  constructor() {
    this.gitService = new WorkflowGitService();
    this.githubService = new GitHubAnalysisService();
    // GraphQL service will be initialized on-demand with user's OAuth token
    this.githubGraphQLService = null;
  }

  /**
   * Analyze codebase and generate compacted analysis using GitHub API
   */
  async analyzeCodebase(projectId: string, externalId: string): Promise<void> {
    try {
      // Update project status to analyzing
      await prisma.workflowProject.update({
        where: { id: projectId },
        data: { analysisStatus: 'ANALYZING' }
      });

      // Get project details
      const project = await prisma.workflowProject.findUnique({
        where: { id: projectId }
      });

      if (!project || project.externalId !== externalId) {
        throw new Error('Project not found');
      }

      if (!project.repositoryUrl) {
        throw new Error('Repository URL not configured');
      }

      // Check if this is a GitHub repository
      const isGitHubRepo = project.repositoryUrl.includes('github.com');

      let analysisResult: AnalysisResult;
      let markdownContent: string;

      if (isGitHubRepo) {
        // Use GitHub API approach for GitHub repositories
        console.log(`Analyzing GitHub repository via API: ${project.repositoryUrl}`);

        let repoInfo: RepositoryInfo;
        let files: FileInfo[];
        let fileContents: GitHubFileContent[];
        let metadata: GitHubRepoMetadata;

        // Try GraphQL first (more efficient), fallback to REST API
        const token = project.githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

        // Initialize GraphQL service with user's OAuth token if we have one
        if (token && !this.githubGraphQLService) {
          this.githubGraphQLService = new GitHubGraphQLService(token);
        }

        // Check rate limits to decide which API to use
        const rateLimitMonitor = RateLimitMonitor.getInstance();
        const shouldUseGraphQL = token ? await rateLimitMonitor.shouldUseGraphQL(token) : false;

        try {
          if (shouldUseGraphQL && this.githubGraphQLService) {
            console.log('Using GitHub GraphQL API for efficient analysis...');

            // Check and log rate limit before starting
            const rateLimitInfo = await rateLimitMonitor.checkGraphQLRateLimit(token!);
            console.log('GraphQL Rate Limit:', rateLimitMonitor.formatRateLimitInfo(rateLimitInfo));

            const graphqlResult = await this.githubGraphQLService.analyzeRepository(
              project.repositoryUrl,
              token,
              (progress: AnalysisProgress) => {
                console.log(`GraphQL Analysis: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
              }
            );
            repoInfo = graphqlResult.repoInfo;
            files = graphqlResult.files;
            fileContents = graphqlResult.fileContents;
            metadata = graphqlResult.metadata;
          } else {
            throw new Error('Using REST API due to rate limits or configuration');
          }
        } catch (graphqlError: any) {
          // Check if it's a rate limit error
          if (graphqlError.message?.includes('rate limit')) {
            console.error('GraphQL rate limit exceeded:', graphqlError.message);
            // Wait for rate limit reset if needed
            await rateLimitMonitor.waitForRateLimitReset(token, 'graphql');
          } else {
            console.warn('GraphQL API failed:', graphqlError.message);
          }

          // Fallback to REST API
          console.log('Falling back to REST API...');

          // Check REST rate limit
          if (token) {
            const restRateLimit = await rateLimitMonitor.checkRestRateLimit(token);
            console.log('REST Rate Limit:', rateLimitMonitor.formatRateLimitInfo(restRateLimit));

            // Wait if rate limit is low
            if (restRateLimit.core.remaining < 100) {
              await rateLimitMonitor.waitForRateLimitReset(token, 'rest');
            }
          }

          const restResult = await this.githubService.analyzeRepository(
            project.repositoryUrl,
            project.githubToken || undefined,
            (progress: AnalysisProgress) => {
              console.log(`REST Analysis: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
            }
          );
          repoInfo = restResult.repoInfo;
          files = restResult.files;
          fileContents = restResult.fileContents;
          metadata = restResult.metadata;
        }

        // Generate analysis using GitHub API data
        analysisResult = await this.generateCompactedAnalysisFromGitHub(fileContents, repoInfo, metadata);

        // Format as markdown
        markdownContent = this.formatAnalysisAsMarkdown(analysisResult, project.name);

      } else {
        // Fallback to local cloning for non-GitHub repositories
        console.log(`Falling back to local cloning for non-GitHub repository: ${project.repositoryUrl}`);

        const repoPath = await this.gitService.cloneRepository(
          project.repositoryUrl,
          projectId,
          project.branch,
          project.githubToken || undefined
        );

        // Get repository info and files using git service
        const repoInfo = await this.gitService.getRepositoryInfo(repoPath);
        const files = await this.gitService.getFileStructure(repoPath);

        // Generate analysis using local files
        analysisResult = await this.generateCompactedAnalysis(repoPath, files, repoInfo);

        // Format as markdown
        markdownContent = this.formatAnalysisAsMarkdown(analysisResult, project.name);

        // Cleanup temporary files
        await this.gitService.cleanupRepository(projectId);
      }

      // Save analysis to database
      await prisma.workflowCodebaseAnalysis.upsert({
        where: { projectId },
        update: {
          content: markdownContent,
          version: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          projectId,
          content: markdownContent,
          version: 1
        }
      });

      // Update project status
      await prisma.workflowProject.update({
        where: { id: projectId },
        data: {
          analysisStatus: 'COMPLETED',
          repositoryPath: isGitHubRepo ? null : undefined // Don't set path for GitHub API analysis
        }
      });

    } catch (error) {
      console.error('Analysis error details:', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status: (error as any)?.status,
        response: (error as any)?.response?.data,
        timestamp: new Date().toISOString()
      });

      // Categorize the error for better debugging
      const errorInfo = this.categorizeError(error);
      console.error('Categorized error:', errorInfo);

      // Get project for additional context
      const projectForError = await prisma.workflowProject.findUnique({
        where: { id: projectId }
      });

      // Update project status to failed with error details
      await prisma.workflowProject.update({
        where: { id: projectId },
        data: {
          analysisStatus: 'FAILED',
          // Store error information in the notes field
          notes: JSON.stringify({
            error: {
              code: errorInfo.code,
              message: errorInfo.message,
              details: errorInfo.details,
              timestamp: new Date().toISOString(),
              repositoryUrl: projectForError?.repositoryUrl,
              hasGithubToken: !!projectForError?.githubToken
            }
          })
        }
      });

      throw error;
    }
  }

  /**
   * Categorize error for better debugging
   */
  private categorizeError(error: any): { code: string, message: string, details: any } {
    // GitHub API errors
    if (error.status === 403) {
      return {
        code: 'GITHUB_ACCESS_DENIED',
        message: 'Repository access denied. Check GitHub token permissions.',
        details: { status: error.status, response: error.response?.data }
      };
    }
    if (error.status === 404) {
      return {
        code: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found or has been deleted.',
        details: { status: error.status, response: error.response?.data }
      };
    }
    if (error.status === 401) {
      return {
        code: 'GITHUB_AUTH_INVALID',
        message: 'GitHub authentication failed. Token may be expired.',
        details: { status: error.status, response: error.response?.data }
      };
    }
    if (error.message?.includes('rate limit') || error.status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'GitHub API rate limit exceeded. Try again later.',
        details: { status: error.status, response: error.response?.data }
      };
    }

    // OpenAI/AI service errors
    if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
      return {
        code: 'AI_SERVICE_ERROR',
        message: 'AI analysis service error.',
        details: { originalError: error.message }
      };
    }

    // Network/timeout errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error during analysis.',
        details: { code: error.code, message: error.message }
      };
    }

    // Database errors
    if (error.code?.startsWith('P') && error.meta) { // Prisma errors
      return {
        code: 'DATABASE_ERROR',
        message: 'Database error during analysis.',
        details: { code: error.code, meta: error.meta }
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred during analysis.',
      details: {
        stack: error.stack,
        name: error.name,
        originalError: error
      }
    };
  }

  /**
   * Get analysis for a project
   */
  async getAnalysis(projectId: string, externalId: string): Promise<any> {
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId },
      include: {
        codebaseAnalysis: true
      }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    return project.codebaseAnalysis;
  }

  /**
   * Update analysis content
   */
  async updateAnalysis(projectId: string, content: string, externalId: string): Promise<any> {
    // Verify project ownership
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.externalId !== externalId) {
      throw new Error('Project not found');
    }

    const analysis = await prisma.workflowCodebaseAnalysis.upsert({
      where: { projectId },
      update: {
        content,
        version: { increment: 1 },
        updatedAt: new Date()
      },
      create: {
        projectId,
        content,
        version: 1
      }
    });

    return analysis;
  }

  /**
   * Generate compacted analysis using AI
   */
  private async generateCompactedAnalysis(
    repoPath: string,
    files: FileInfo[],
    repoInfo: RepositoryInfo
  ): Promise<AnalysisResult> {
    try {
      // Read README for explicit tech stack information
      const readmeContent = await this.readREADME(repoPath);

      // Enhanced multi-source detection
      const techStack = await this.detectTechStack(repoPath, files, readmeContent);
      const framework = techStack.framework;
      const language = techStack.language;

      // Filter and analyze key files
      const keyFiles = this.identifyKeyFiles(files);
      const fileContents = await this.readKeyFiles(keyFiles.slice(0, 10)); // Limit to prevent token overflow

      // Create enhanced analysis prompt
      const prompt = this.createEnhancedAnalysisPrompt(repoInfo, techStack, fileContents, readmeContent);

      // Call AI service
      let aiAnalysis: any;
      if (AI_PROVIDER === 'claude') {
        aiAnalysis = await this.callClaudeForAnalysis(prompt);
      } else {
        aiAnalysis = await this.callOpenAIForAnalysis(prompt);
      }

      // Parse and structure the analysis
      const analysisResult: AnalysisResult = {
        overview: {
          repository: repoInfo.remoteUrl,
          language: techStack.language,
          framework: techStack.framework,
          lastAnalyzed: new Date().toISOString()
        },
        architecture: {
          structure: this.parseFileStructure(files),
          keyComponents: this.identifyKeyComponents(files),
          externalDependencies: this.extractDependencies(repoPath),
        },
        technicalDebt: [],
        recommendations: [aiAnalysis] // Store the markdown content here
      };

      return analysisResult;

    } catch (error) {
      console.error('AI analysis error:', error);

      // Fallback to basic analysis
      return this.generateBasicAnalysis(repoPath, files, repoInfo);
    }
  }

  /**
   * Generate compacted analysis using GitHub API data
   */
  private async generateCompactedAnalysisFromGitHub(
    fileContents: GitHubFileContent[],
    repoInfo: RepositoryInfo,
    metadata: GitHubRepoMetadata
  ): Promise<AnalysisResult> {
    try {
      // Extract README content from file contents
      const readmeContent = this.extractReadmeFromContents(fileContents);

      // Detect tech stack from GitHub metadata and file contents
      const techStack = await this.detectTechStackFromGitHub(fileContents, metadata, readmeContent);

      // Create enhanced analysis prompt for GitHub data
      const prompt = this.createEnhancedAnalysisPromptFromGitHub(repoInfo, techStack, fileContents, readmeContent, metadata);

      // Call AI service
      let aiAnalysis: any;
      if (AI_PROVIDER === 'claude') {
        aiAnalysis = await this.callClaudeForAnalysis(prompt);
      } else {
        aiAnalysis = await this.callOpenAIForAnalysis(prompt);
      }

      // Parse and structure the analysis
      const analysisResult: AnalysisResult = {
        overview: {
          repository: repoInfo.remoteUrl,
          language: techStack.language,
          framework: techStack.framework,
          lastAnalyzed: new Date().toISOString()
        },
        architecture: {
          structure: this.parseFileStructureFromContents(fileContents),
          keyComponents: this.identifyKeyComponentsFromContents(fileContents),
          externalDependencies: this.extractDependenciesFromContents(fileContents),
        },
        technicalDebt: [],
        recommendations: [aiAnalysis] // Store the markdown content here
      };

      return analysisResult;

    } catch (error) {
      console.error('GitHub AI analysis error:', error);

      // Fallback to basic analysis
      return this.generateBasicAnalysisFromGitHub(fileContents, repoInfo, metadata);
    }
  }

  /**
   * Read README file for explicit tech stack information
   */
  private async readREADME(repoPath: string): Promise<string | null> {
    const readmeFiles = ['README.md', 'README.txt', 'readme.md', 'readme.txt'];

    for (const filename of readmeFiles) {
      try {
        const readmePath = path.join(repoPath, filename);
        const content = fs.readFileSync(readmePath, 'utf-8');
        return content;
      } catch {
        // File doesn't exist, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Enhanced tech stack detection from multiple sources
   */
  private async detectTechStack(repoPath: string, files: FileInfo[], readmeContent: string | null): Promise<any> {
    const techStack = {
      frontend: [] as string[],
      backend: [] as string[],
      database: [] as string[],
      hosting: [] as string[],
      auth: [] as string[],
      cicd: [] as string[],
      monitoring: [] as string[],
      framework: 'Unknown',
      language: 'Unknown'
    };

    // 1. README Analysis (highest priority)
    if (readmeContent) {
      const readmeStack = this.parseREADMETechStack(readmeContent);
      Object.assign(techStack, readmeStack);
    }

    // 2. Package.json Analysis
    const packageInfo = await this.analyzePackageJson(repoPath);
    if (packageInfo) {
      // Merge package.json findings with README findings
      techStack.frontend = [...new Set([...techStack.frontend, ...packageInfo.frontend])];
      techStack.backend = [...new Set([...techStack.backend, ...packageInfo.backend])];

      // Set primary framework and language if not detected from README
      if (techStack.framework === 'Unknown') {
        techStack.framework = packageInfo.framework || this.detectFramework(files);
      }
      if (techStack.language === 'Unknown') {
        techStack.language = packageInfo.language || this.detectPrimaryLanguage(files);
      }
    }

    // 3. File Pattern Analysis (fallback)
    if (techStack.framework === 'Unknown') {
      techStack.framework = this.detectFramework(files);
    }
    if (techStack.language === 'Unknown') {
      techStack.language = this.detectPrimaryLanguage(files);
    }

    return techStack;
  }

  /**
   * Parse README content for tech stack mentions
   */
  private parseREADMETechStack(content: string): any {
    const stack = {
      frontend: [] as string[],
      backend: [] as string[],
      database: [] as string[],
      hosting: [] as string[],
      auth: [] as string[],
      cicd: [] as string[],
      monitoring: [] as string[],
      framework: 'Unknown',
      language: 'Unknown'
    };

    // Tech stack section patterns
    const techStackMatch = content.match(/(?:tech\s*stack|technology\s*stack|built\s*with|technologies)[:\s]*([^#]*?)(?=\n#|\n\n|$)/i);
    if (techStackMatch) {
      const techSection = techStackMatch[1];

      // Frontend detection
      const frontendMatch = techSection.match(/(?:frontend|front-end)[:\s]*([^\n]+)/i);
      if (frontendMatch) {
        stack.frontend = this.extractTechnologies(frontendMatch[1]);
        // Detect primary framework
        if (frontendMatch[1].match(/react/i)) stack.framework = 'React';
        else if (frontendMatch[1].match(/next\.?js/i)) stack.framework = 'Next.js';
        else if (frontendMatch[1].match(/vue/i)) stack.framework = 'Vue';
        else if (frontendMatch[1].match(/angular/i)) stack.framework = 'Angular';
      }

      // Backend detection
      const backendMatch = techSection.match(/(?:backend|back-end)[:\s]*([^\n]+)/i);
      if (backendMatch) {
        stack.backend = this.extractTechnologies(backendMatch[1]);
        // Detect primary backend framework
        if (backendMatch[1].match(/nest\.?js/i)) stack.framework = 'NestJS';
        else if (backendMatch[1].match(/express/i)) stack.framework = 'Express';
        else if (backendMatch[1].match(/fastify/i)) stack.framework = 'Fastify';
      }

      // Database detection
      const dbMatch = techSection.match(/(?:database)[:\s]*([^\n]+)/i);
      if (dbMatch) {
        stack.database = this.extractTechnologies(dbMatch[1]);
      }

      // Other sections
      const hostingMatch = techSection.match(/(?:hosting|deployed\s*on|hosted\s*on)[:\s]*([^\n]+)/i);
      if (hostingMatch) stack.hosting = this.extractTechnologies(hostingMatch[1]);

      const authMatch = techSection.match(/(?:auth|authentication)[:\s]*([^\n]+)/i);
      if (authMatch) stack.auth = this.extractTechnologies(authMatch[1]);

      const cicdMatch = techSection.match(/(?:ci\/cd|deployment)[:\s]*([^\n]+)/i);
      if (cicdMatch) stack.cicd = this.extractTechnologies(cicdMatch[1]);

      const monitoringMatch = techSection.match(/(?:monitoring)[:\s]*([^\n]+)/i);
      if (monitoringMatch) stack.monitoring = this.extractTechnologies(monitoringMatch[1]);
    }

    return stack;
  }

  /**
   * Extract just the tech stack section from README for efficiency
   */
  private extractTechStackFromReadme(readmeContent: string): string {
    const techStackMatch = readmeContent.match(/(?:tech\s*stack|technology\s*stack|built\s*with|technologies)[:\s]*([^#]*?)(?=\n#|\n\n|$)/i);
    if (techStackMatch) {
      return techStackMatch[0].substring(0, 800); // Limit to 800 chars
    }

    // Fallback: look for frontend/backend mentions
    const lines = readmeContent.split('\n').slice(0, 30); // First 30 lines
    const relevantLines = lines.filter(line =>
      /frontend|backend|database|stack|built|using|tech/i.test(line)
    );

    return relevantLines.join('\n').substring(0, 800) || 'No tech stack info found in README';
  }

  /**
   * Extract individual technologies from a string
   */
  private extractTechnologies(text: string): string[] {
    return text
      .split(/[,+&—\n]/)
      .map(tech => tech.trim().replace(/[^\w\s.-]/g, ''))
      .filter(tech => tech.length > 0)
      .map(tech => tech.trim());
  }

  /**
   * Analyze package.json for dependencies
   */
  private async analyzePackageJson(repoPath: string): Promise<any | null> {
    try {
      const packagePath = path.join(repoPath, 'package.json');
      const content = fs.readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(content);

      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      const stack = {
        frontend: [] as string[],
        backend: [] as string[],
        framework: 'Unknown',
        language: 'Unknown'
      };

      // Frontend frameworks
      if (allDeps['next']) stack.framework = 'Next.js';
      else if (allDeps['react']) stack.framework = 'React';
      else if (allDeps['vue']) stack.framework = 'Vue';
      else if (allDeps['@angular/core']) stack.framework = 'Angular';

      // Backend frameworks
      if (allDeps['@nestjs/core']) stack.framework = 'NestJS';
      else if (allDeps['express']) stack.framework = 'Express';
      else if (allDeps['fastify']) stack.framework = 'Fastify';

      // Language detection
      if (allDeps['typescript'] || packageJson.devDependencies?.['@types/node']) {
        stack.language = 'TypeScript';
      } else {
        stack.language = 'JavaScript';
      }

      // Frontend tech
      if (allDeps['react']) stack.frontend.push('React');
      if (allDeps['tailwindcss']) stack.frontend.push('Tailwind CSS');
      if (allDeps['@mui/material']) stack.frontend.push('Material-UI');
      if (allDeps['framer-motion']) stack.frontend.push('Framer Motion');
      if (allDeps['zustand']) stack.frontend.push('Zustand');
      if (allDeps['@tanstack/react-query']) stack.frontend.push('React Query');

      // Backend tech
      if (allDeps['prisma']) stack.backend.push('Prisma');
      if (allDeps['typeorm']) stack.backend.push('TypeORM');

      return stack;
    } catch {
      return null;
    }
  }

  /**
   * Create enhanced analysis prompt with structured output
   */
  private createEnhancedAnalysisPrompt(repoInfo: RepositoryInfo, techStack: any, fileContents: Array<{path: string, content: string}>, readmeContent: string | null): string {
    return `You are a senior software architect analyzing a codebase. Generate a comprehensive, structured analysis in markdown format.

Repository: ${repoInfo.remoteUrl || 'Local repository'}
Detected Tech Stack: ${JSON.stringify(techStack, null, 2)}

README Tech Stack:
${readmeContent ? this.extractTechStackFromReadme(readmeContent) : 'No README found'}

Key Files Sample:
${fileContents.slice(0, 5).map(f => `${f.path}: ${f.content.substring(0, 200)}...`).join('\n')}

Generate a comprehensive analysis using this EXACT markdown structure:

# Project Analysis: ${repoInfo.name || 'Untitled Project'}

## 🚀 Quick Start
- **Primary Tech Stack**: [Main technologies used]
- **Development Commands**: [from package.json or detected patterns]
- **Environment Setup**: [requirements and setup steps]

## 📋 Project Overview
- **Type**: [Web App, API, Library, etc.]
- **Architecture**: [Monorepo, Microservices, SPA, etc.]
- **Main Language**: [Primary programming language]

## 🛠 Technology Stack
### Frontend
${techStack.frontend.length > 0 ? techStack.frontend.map((t: string) => `- ${t}`).join('\n') : '- [Analyze and list frontend technologies]'}

### Backend
${techStack.backend.length > 0 ? techStack.backend.map((t: string) => `- ${t}`).join('\n') : '- [Analyze and list backend technologies]'}

### Database
${techStack.database.length > 0 ? techStack.database.map((t: string) => `- ${t}`).join('\n') : '- [Analyze and list database technologies]'}

## 📁 Project Structure
[Provide clear directory structure with explanations]

## 🎯 Entry Points
- **Main Application**: [Primary entry point file]
- **API Routes**: [API endpoint locations]
- **Configuration**: [Config file locations]

## 🗺 API Routes Mapping
[List and explain API endpoints found in the codebase]

## 📝 Key Files by Development Task
### Adding New Features
- Components: [Component directories]
- Pages: [Page/route directories]
- API: [API directories]

### Database & Data
- Schema: [Database schema files]
- Migrations: [Migration directories]

## 🔧 Development Workflow
- **Install**: [Installation command]
- **Development**: [Dev server command]
- **Build**: [Build command]
- **Test**: [Test command]

## 🏗 Code Patterns & Conventions
[Identify and explain coding patterns used]

## 🎯 AI Coding Context
### For Feature Development
[Key patterns and structures for adding features]

### For Bug Fixes
[Error handling patterns and debugging approaches]

Make the analysis practical and actionable for both human developers and AI coding assistants.`;
  }

  /**
   * Call OpenAI for analysis
   */
  private async callOpenAIForAnalysis(prompt: string): Promise<any> {
    const model = process.env.OPENAI_MODEL || 'gpt-4';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a senior software architect analyzing codebases. Provide structured, actionable insights in markdown format exactly as requested in the prompt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      // Use max_completion_tokens for newer models like GPT-5, max_tokens for older models
      // GPT-5 needs more tokens due to reasoning overhead
      ...(model.includes('gpt-5') || model.includes('o1') ?
        { max_completion_tokens: 6000 } :
        { max_tokens: 2000 }
      )
    });

    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === '') {
      console.error('OpenAI Response:', JSON.stringify(response, null, 2));

      // Check if it was cut off due to length
      if (response.choices[0]?.finish_reason === 'length') {
        throw new Error('OpenAI response was cut off due to token limit. Try using a shorter prompt or increase max_completion_tokens.');
      }

      throw new Error('No response content from OpenAI');
    }

    // Return the markdown content directly instead of trying to parse as JSON
    return content;
  }

  /**
   * Call Claude for analysis
   */
  private async callClaudeForAnalysis(prompt: string): Promise<any> {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: 'You are a senior software architect analyzing codebases. Provide structured, actionable insights in markdown format exactly as requested in the prompt.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = (response.content[0] as any)?.text;
    if (!content) {
      throw new Error('No response from Claude');
    }

    // Return the markdown content directly instead of trying to parse as JSON
    return content;
  }

  /**
   * Create analysis prompt
   */
  private createAnalysisPrompt(
    repoInfo: RepositoryInfo,
    framework: string,
    language: string,
    fileContents: Array<{ path: string; content: string }>
  ): string {
    return `
Analyze this ${language} codebase using ${framework}:

Repository: ${repoInfo.name}
Branch: ${repoInfo.branch}
Last Commit: ${repoInfo.lastCommit.message}

Key Files:
${fileContents.map(f => `\n=== ${f.path} ===\n${f.content.substring(0, 1000)}...`).join('\n')}

Please analyze and return JSON with:
{
  "technicalDebt": [
    {
      "type": "string",
      "description": "string",
      "severity": "low|medium|high",
      "files": ["array of file paths"]
    }
  ],
  "recommendations": [
    "actionable improvement suggestions"
  ]
}

Focus on:
1. Code quality and maintainability issues
2. Security vulnerabilities
3. Performance bottlenecks
4. Architectural improvements
5. Best practices compliance
`;
  }

  /**
   * Identify key files for analysis
   */
  private identifyKeyFiles(files: FileInfo[]): FileInfo[] {
    const priorities = [
      // Config files
      'package.json', 'package-lock.json', 'yarn.lock',
      'requirements.txt', 'Pipfile', 'poetry.lock',
      'composer.json', 'go.mod', 'Cargo.toml',
      // Entry points
      'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
      'server.js', 'server.ts', 'index.html',
      // Config
      'next.config.js', 'webpack.config.js', 'vite.config.js',
      'tsconfig.json', 'babel.config.js', '.env.example',
      // Database
      'schema.prisma', 'models.py', 'schema.sql',
      // Documentation
      'README.md', 'CHANGELOG.md'
    ];

    const keyFiles: FileInfo[] = [];

    // Add priority files
    priorities.forEach(priority => {
      const found = files.find(f =>
        path.basename(f.relativePath).toLowerCase() === priority.toLowerCase()
      );
      if (found) keyFiles.push(found);
    });

    // Add main source files
    const sourceFiles = files
      .filter(f => this.isSourceFile(f))
      .sort((a, b) => a.size - b.size) // Prefer smaller files for analysis
      .slice(0, 15);

    keyFiles.push(...sourceFiles);

    return Array.from(new Set(keyFiles)); // Remove duplicates
  }

  /**
   * Check if file is a source code file
   */
  private isSourceFile(file: FileInfo): boolean {
    const sourceExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.kt', '.swift',
      '.go', '.rs', '.rb', '.php',
      '.cs', '.cpp', '.c', '.h'
    ];

    return sourceExtensions.includes(file.extension.toLowerCase()) &&
           !file.relativePath.includes('node_modules') &&
           !file.relativePath.includes('.git') &&
           !file.relativePath.includes('dist') &&
           !file.relativePath.includes('build') &&
           !file.relativePath.includes('coverage');
  }

  /**
   * Read key files content
   */
  private async readKeyFiles(files: FileInfo[]): Promise<Array<{ path: string; content: string }>> {
    const contents: Array<{ path: string; content: string }> = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        contents.push({
          path: file.relativePath,
          content: content.substring(0, 5000) // Limit content size
        });
      } catch (error) {
        console.warn(`Failed to read file ${file.path}:`, error);
      }
    }

    return contents;
  }

  /**
   * Detect primary framework
   */
  private detectFramework(files: FileInfo[]): string {
    const packageJson = files.find(f => f.relativePath === 'package.json');

    if (packageJson) {
      try {
        const content = fs.readFileSync(packageJson.path, 'utf8');
        const pkg = JSON.parse(content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.next) return 'Next.js';
        if (deps.react) return 'React';
        if (deps.vue) return 'Vue.js';
        if (deps.angular || deps['@angular/core']) return 'Angular';
        if (deps.express) return 'Express.js';
        if (deps.fastify) return 'Fastify';
        if (deps.nuxt) return 'Nuxt.js';
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // Check for other framework indicators
    if (files.some(f => f.relativePath.includes('requirements.txt'))) {
      if (files.some(f => f.relativePath.includes('django'))) return 'Django';
      if (files.some(f => f.relativePath.includes('flask'))) return 'Flask';
      return 'Python';
    }

    if (files.some(f => f.relativePath.includes('go.mod'))) return 'Go';
    if (files.some(f => f.relativePath.includes('Cargo.toml'))) return 'Rust';
    if (files.some(f => f.relativePath.includes('composer.json'))) return 'PHP';

    return 'Unknown';
  }

  /**
   * Detect primary programming language
   */
  private detectPrimaryLanguage(files: FileInfo[]): string {
    const languageCounts: Record<string, number> = {};

    files.forEach(file => {
      if (file.language) {
        languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
      }
    });

    const primaryLanguage = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return primaryLanguage || 'Unknown';
  }

  /**
   * Parse file structure
   */
  private parseFileStructure(files: FileInfo[]): Record<string, string> {
    const structure: Record<string, string> = {};

    // Group files by directory
    const directories = new Set(
      files.map(f => path.dirname(f.relativePath))
        .filter(dir => dir !== '.')
    );

    directories.forEach(dir => {
      const dirFiles = files.filter(f =>
        path.dirname(f.relativePath) === dir
      );

      const description = this.describeDirectory(dir, dirFiles);
      structure[dir] = description;
    });

    return structure;
  }

  /**
   * Describe what a directory contains
   */
  private describeDirectory(dirPath: string, files: FileInfo[]): string {
    const dirName = path.basename(dirPath);
    const fileTypes = Array.from(new Set(files.map(f => f.extension)));
    const languages = Array.from(new Set(files.map(f => f.language).filter(Boolean)));

    // Common directory patterns
    if (dirName.includes('component')) return 'React/UI components';
    if (dirName.includes('page')) return 'Page components/routes';
    if (dirName.includes('api')) return 'API routes and handlers';
    if (dirName.includes('lib') || dirName.includes('util')) return 'Utility functions and helpers';
    if (dirName.includes('style') || dirName.includes('css')) return 'Styling and CSS files';
    if (dirName.includes('test') || dirName.includes('spec')) return 'Test files';
    if (dirName.includes('type')) return 'TypeScript type definitions';
    if (dirName.includes('hook')) return 'React hooks';
    if (dirName.includes('store') || dirName.includes('redux')) return 'State management';
    if (dirName.includes('service')) return 'Business logic and services';
    if (dirName.includes('model')) return 'Data models and schemas';

    return `${languages.join(', ')} files (${fileTypes.join(', ')})`;
  }

  /**
   * Identify key components
   */
  private identifyKeyComponents(files: FileInfo[]): ComponentInfo[] {
    const components: ComponentInfo[] = [];

    // Find main entry points
    const entryPoints = files.filter(f =>
      ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts']
        .includes(path.basename(f.relativePath))
    );

    entryPoints.forEach(file => {
      components.push({
        name: path.basename(file.relativePath, file.extension),
        location: file.relativePath,
        purpose: 'Application entry point',
        dependencies: [],
        language: file.language || 'Unknown'
      });
    });

    // Find config files
    const configFiles = files.filter(f =>
      f.relativePath.includes('config') ||
      ['package.json', 'tsconfig.json', 'next.config.js'].includes(path.basename(f.relativePath))
    );

    configFiles.forEach(file => {
      components.push({
        name: path.basename(file.relativePath),
        location: file.relativePath,
        purpose: 'Configuration',
        dependencies: [],
        language: file.language || 'Configuration'
      });
    });

    return components;
  }

  /**
   * Extract dependencies from package files
   */
  private extractDependencies(repoPath: string): string[] {
    const dependencies: string[] = [];

    try {
      // Node.js dependencies
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        dependencies.push(...deps);
      }
    } catch (error) {
      console.warn('Failed to read package.json:', error);
    }

    return Array.from(new Set(dependencies)).sort();
  }

  /**
   * Generate basic analysis fallback
   */
  private generateBasicAnalysis(
    repoPath: string,
    files: FileInfo[],
    repoInfo: RepositoryInfo
  ): AnalysisResult {
    const framework = this.detectFramework(files);
    const language = this.detectPrimaryLanguage(files);

    return {
      overview: {
        repository: repoInfo.remoteUrl,
        language,
        framework,
        lastAnalyzed: new Date().toISOString()
      },
      architecture: {
        structure: this.parseFileStructure(files),
        keyComponents: this.identifyKeyComponents(files),
        externalDependencies: this.extractDependencies(repoPath)
      },
      technicalDebt: [],
      recommendations: [
        'Complete automated analysis was not available',
        'Consider running manual code review',
        'Check for security vulnerabilities',
        'Review performance optimizations'
      ]
    };
  }

  /**
   * Format analysis as markdown
   */
  private formatAnalysisAsMarkdown(analysis: AnalysisResult, projectName: string): string {
    // Use the AI-generated markdown directly if available
    if (analysis.recommendations && analysis.recommendations.length > 0 && typeof analysis.recommendations[0] === 'string') {
      return analysis.recommendations[0];
    }

    // Fallback to basic analysis if AI analysis failed
    return `# Codebase Analysis - ${projectName}

## Overview
- **Repository**: ${analysis.overview.repository}
- **Primary Language**: ${analysis.overview.language}
- **Framework**: ${analysis.overview.framework}
- **Last Analyzed**: ${new Date(analysis.overview.lastAnalyzed).toLocaleDateString()}

## Architecture

### Directory Structure
${Object.entries(analysis.architecture.structure)
  .map(([dir, desc]) => `- **/${dir}** - ${desc}`)
  .join('\n')}

### Key Components
${analysis.architecture.keyComponents
  .map(comp => `
#### ${comp.name}
- **Location**: ${comp.location}
- **Purpose**: ${comp.purpose}
- **Language**: ${comp.language}`)
  .join('\n')}

### External Dependencies
${analysis.architecture.externalDependencies.length > 0
  ? `\n**Production Dependencies:**\n${analysis.architecture.externalDependencies.slice(0, 10).map(dep => `- ${dep}`).join('\n')}${analysis.architecture.externalDependencies.length > 10 ? `\n- ... and ${analysis.architecture.externalDependencies.length - 10} more` : ''}`
  : 'No external dependencies detected'}

## Technical Debt
${analysis.technicalDebt.length > 0
  ? analysis.technicalDebt.map(debt => `
### ${debt.type} (${debt.severity})
${debt.description}
**Affected files**: ${debt.files.join(', ')}`).join('\n')
  : 'No significant technical debt identified.'}

## Recommendations
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Analysis generated on ${new Date().toLocaleDateString()} using AI-powered codebase analysis*
`;
  }

  /**
   * Extract README content from GitHub file contents
   */
  private extractReadmeFromContents(fileContents: GitHubFileContent[]): string | null {
    const readmeFile = fileContents.find(file =>
      /^README\.(md|txt|rst)$/i.test(file.path.split('/').pop() || '')
    );
    return readmeFile?.content || null;
  }

  /**
   * Detect tech stack from GitHub metadata and file contents
   */
  private async detectTechStackFromGitHub(
    fileContents: GitHubFileContent[],
    metadata: GitHubRepoMetadata,
    readmeContent: string | null
  ): Promise<any> {
    const techStack = {
      frontend: [] as string[],
      backend: [] as string[],
      database: [] as string[],
      hosting: [] as string[],
      auth: [] as string[],
      cicd: [] as string[],
      monitoring: [] as string[],
      framework: metadata.language || 'Unknown',
      language: metadata.language || 'Unknown'
    };

    // 1. README Analysis (highest priority)
    if (readmeContent) {
      const readmeStack = this.parseREADMETechStack(readmeContent);
      Object.assign(techStack, readmeStack);
    }

    // 2. Package.json Analysis from file contents
    const packageJsonFile = fileContents.find(file => file.path === 'package.json');
    if (packageJsonFile) {
      const packageInfo = this.analyzePackageJsonContent(packageJsonFile.content);
      if (packageInfo) {
        // Merge package.json findings with README findings
        techStack.frontend = [...new Set([...techStack.frontend, ...packageInfo.frontend])];
        techStack.backend = [...new Set([...techStack.backend, ...packageInfo.backend])];

        // Set primary framework and language if not detected from README
        if (techStack.framework === 'Unknown' || techStack.framework === metadata.language) {
          techStack.framework = packageInfo.framework || this.detectFrameworkFromContents(fileContents);
        }
        if (techStack.language === 'Unknown') {
          techStack.language = packageInfo.language || metadata.language || 'Unknown';
        }
      }
    }

    // 3. File Pattern Analysis (fallback)
    if (techStack.framework === 'Unknown' || techStack.framework === metadata.language) {
      techStack.framework = this.detectFrameworkFromContents(fileContents);
    }

    return techStack;
  }

  /**
   * Analyze package.json content from string
   */
  private analyzePackageJsonContent(content: string): any | null {
    try {
      const packageJson = JSON.parse(content);
      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      const stack = {
        frontend: [] as string[],
        backend: [] as string[],
        framework: 'Unknown',
        language: 'Unknown'
      };

      // Frontend frameworks
      if (allDeps['next']) stack.framework = 'Next.js';
      else if (allDeps['react']) stack.framework = 'React';
      else if (allDeps['vue']) stack.framework = 'Vue';
      else if (allDeps['@angular/core']) stack.framework = 'Angular';

      // Backend frameworks
      if (allDeps['@nestjs/core']) stack.framework = 'NestJS';
      else if (allDeps['express']) stack.framework = 'Express';
      else if (allDeps['fastify']) stack.framework = 'Fastify';

      // Language detection
      if (allDeps['typescript'] || packageJson.devDependencies?.['@types/node']) {
        stack.language = 'TypeScript';
      } else {
        stack.language = 'JavaScript';
      }

      // Frontend tech
      if (allDeps['react']) stack.frontend.push('React');
      if (allDeps['tailwindcss']) stack.frontend.push('Tailwind CSS');
      if (allDeps['@mui/material']) stack.frontend.push('Material-UI');
      if (allDeps['framer-motion']) stack.frontend.push('Framer Motion');
      if (allDeps['zustand']) stack.frontend.push('Zustand');
      if (allDeps['@tanstack/react-query']) stack.frontend.push('React Query');

      // Backend tech
      if (allDeps['prisma']) stack.backend.push('Prisma');
      if (allDeps['typeorm']) stack.backend.push('TypeORM');

      return stack;
    } catch {
      return null;
    }
  }

  /**
   * Detect framework from file contents
   */
  private detectFrameworkFromContents(fileContents: GitHubFileContent[]): string {
    const packageJsonFile = fileContents.find(file => file.path === 'package.json');

    if (packageJsonFile) {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.next) return 'Next.js';
        if (deps.react) return 'React';
        if (deps.vue) return 'Vue.js';
        if (deps.angular || deps['@angular/core']) return 'Angular';
        if (deps.express) return 'Express.js';
        if (deps.fastify) return 'Fastify';
        if (deps.nuxt) return 'Nuxt.js';
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // Check for other framework indicators
    if (fileContents.some(f => f.path.includes('requirements.txt'))) {
      if (fileContents.some(f => f.content.includes('django'))) return 'Django';
      if (fileContents.some(f => f.content.includes('flask'))) return 'Flask';
      return 'Python';
    }

    if (fileContents.some(f => f.path.includes('go.mod'))) return 'Go';
    if (fileContents.some(f => f.path.includes('Cargo.toml'))) return 'Rust';
    if (fileContents.some(f => f.path.includes('composer.json'))) return 'PHP';

    return 'Unknown';
  }

  /**
   * Create enhanced analysis prompt for GitHub data
   */
  private createEnhancedAnalysisPromptFromGitHub(
    repoInfo: RepositoryInfo,
    techStack: any,
    fileContents: GitHubFileContent[],
    readmeContent: string | null,
    metadata: GitHubRepoMetadata
  ): string {
    return `You are a senior software architect analyzing a codebase. Generate a comprehensive, structured analysis in markdown format.

Repository: ${repoInfo.remoteUrl}
GitHub Metadata:
- Name: ${metadata.name}
- Description: ${metadata.description}
- Language: ${metadata.language}
- Stars: ${metadata.stargazers_count}
- Forks: ${metadata.forks_count}
- Topics: ${metadata.topics.join(', ')}

Detected Tech Stack: ${JSON.stringify(techStack, null, 2)}

README Tech Stack:
${readmeContent ? this.extractTechStackFromReadme(readmeContent) : 'No README found'}

Key Files Sample:
${fileContents.slice(0, 5).map(f => `${f.path}: ${f.content.substring(0, 200)}...`).join('\n')}

Generate a comprehensive analysis using this EXACT markdown structure:

# Project Analysis: ${metadata.name}

## 🚀 Quick Start
- **Primary Tech Stack**: [Main technologies used]
- **Development Commands**: [from package.json or detected patterns]
- **Environment Setup**: [requirements and setup steps]

## 📋 Project Overview
- **Type**: [Web App, API, Library, etc.]
- **Architecture**: [Monorepo, Microservices, SPA, etc.]
- **Main Language**: [Primary programming language]
- **Repository Stats**: ${metadata.stargazers_count} stars, ${metadata.forks_count} forks

## 🛠 Technology Stack
### Frontend
${techStack.frontend.length > 0 ? techStack.frontend.map((t: string) => `- ${t}`).join('\n') : '- [Analyze and list frontend technologies]'}

### Backend
${techStack.backend.length > 0 ? techStack.backend.map((t: string) => `- ${t}`).join('\n') : '- [Analyze and list backend technologies]'}

### Database
${techStack.database.length > 0 ? techStack.database.map((t: string) => `- ${t}`).join('\n') : '- [Analyze and list database technologies]'}

## 📁 Project Structure
[Provide clear directory structure with explanations]

## 🎯 Entry Points
- **Main Application**: [Primary entry point file]
- **API Routes**: [API endpoint locations]
- **Configuration**: [Config file locations]

## 🗺 API Routes Mapping
[List and explain API endpoints found in the codebase]

## 📝 Key Files by Development Task
### Adding New Features
- Components: [Component directories]
- Pages: [Page/route directories]
- API: [API directories]

### Database & Data
- Schema: [Database schema files]
- Migrations: [Migration directories]

## 🔧 Development Workflow
- **Install**: [Installation command]
- **Development**: [Dev server command]
- **Build**: [Build command]
- **Test**: [Test command]

## 🏗 Code Patterns & Conventions
[Identify and explain coding patterns used]

## 🎯 AI Coding Context
### For Feature Development
[Key patterns and structures for adding features]

### For Bug Fixes
[Error handling patterns and debugging approaches]

Make the analysis practical and actionable for both human developers and AI coding assistants.`;
  }

  /**
   * Parse file structure from GitHub file contents
   */
  private parseFileStructureFromContents(fileContents: GitHubFileContent[]): Record<string, string> {
    const structure: Record<string, string> = {};

    // Group files by directory
    const directories = new Set(
      fileContents.map(f => {
        const parts = f.path.split('/');
        return parts.length > 1 ? parts[0] : '.';
      }).filter(dir => dir !== '.')
    );

    directories.forEach(dir => {
      const dirFiles = fileContents.filter(f => f.path.startsWith(dir + '/'));
      const fileTypes = Array.from(new Set(dirFiles.map(f => {
        const parts = f.path.split('.');
        return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
      })));

      structure[dir] = this.describeDirectoryFromFiles(dir, fileTypes);
    });

    return structure;
  }

  /**
   * Describe directory from file types
   */
  private describeDirectoryFromFiles(dirName: string, fileTypes: string[]): string {
    // Common directory patterns
    if (dirName.includes('component')) return 'React/UI components';
    if (dirName.includes('page')) return 'Page components/routes';
    if (dirName.includes('api')) return 'API routes and handlers';
    if (dirName.includes('lib') || dirName.includes('util')) return 'Utility functions and helpers';
    if (dirName.includes('style') || dirName.includes('css')) return 'Styling and CSS files';
    if (dirName.includes('test') || dirName.includes('spec')) return 'Test files';
    if (dirName.includes('type')) return 'TypeScript type definitions';
    if (dirName.includes('hook')) return 'React hooks';
    if (dirName.includes('store') || dirName.includes('redux')) return 'State management';
    if (dirName.includes('service')) return 'Business logic and services';
    if (dirName.includes('model')) return 'Data models and schemas';

    return `Files with extensions: ${fileTypes.join(', ')}`;
  }

  /**
   * Identify key components from GitHub file contents
   */
  private identifyKeyComponentsFromContents(fileContents: GitHubFileContent[]): ComponentInfo[] {
    const components: ComponentInfo[] = [];

    // Find main entry points
    const entryPoints = fileContents.filter(f =>
      ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts']
        .includes(f.path.split('/').pop() || '')
    );

    entryPoints.forEach(file => {
      const fileName = file.path.split('/').pop() || '';
      const extension = fileName.includes('.') ? fileName.split('.').pop() : '';

      components.push({
        name: fileName.replace(`.${extension}`, ''),
        location: file.path,
        purpose: 'Application entry point',
        dependencies: [],
        language: this.gitService.detectLanguage(`.${extension}`) || 'Unknown'
      });
    });

    // Find config files
    const configFiles = fileContents.filter(f => {
      const fileName = f.path.split('/').pop() || '';
      return f.path.includes('config') ||
        ['package.json', 'tsconfig.json', 'next.config.js'].includes(fileName);
    });

    configFiles.forEach(file => {
      const fileName = file.path.split('/').pop() || '';
      const extension = fileName.includes('.') ? fileName.split('.').pop() : '';

      components.push({
        name: fileName,
        location: file.path,
        purpose: 'Configuration',
        dependencies: [],
        language: this.gitService.detectLanguage(`.${extension}`) || 'Configuration'
      });
    });

    return components;
  }

  /**
   * Extract dependencies from GitHub file contents
   */
  private extractDependenciesFromContents(fileContents: GitHubFileContent[]): string[] {
    const dependencies: string[] = [];

    // Node.js dependencies
    const packageJsonFile = fileContents.find(f => f.path === 'package.json');
    if (packageJsonFile) {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        dependencies.push(...deps);
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    return Array.from(new Set(dependencies)).sort();
  }

  /**
   * Generate basic analysis fallback for GitHub data
   */
  private generateBasicAnalysisFromGitHub(
    fileContents: GitHubFileContent[],
    repoInfo: RepositoryInfo,
    metadata: GitHubRepoMetadata
  ): AnalysisResult {
    const framework = this.detectFrameworkFromContents(fileContents);
    const language = metadata.language || 'Unknown';

    return {
      overview: {
        repository: repoInfo.remoteUrl,
        language,
        framework,
        lastAnalyzed: new Date().toISOString()
      },
      architecture: {
        structure: this.parseFileStructureFromContents(fileContents),
        keyComponents: this.identifyKeyComponentsFromContents(fileContents),
        externalDependencies: this.extractDependenciesFromContents(fileContents)
      },
      technicalDebt: [],
      recommendations: [
        'Complete automated analysis was not available',
        'Consider running manual code review',
        'Check for security vulnerabilities',
        'Review performance optimizations'
      ]
    };
  }
}