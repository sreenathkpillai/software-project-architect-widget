import { graphql } from '@octokit/graphql';
import { GitHubFileContent, GitHubRepoMetadata, AnalysisProgress } from './github-analysis-service';
import { RepositoryInfo, FileInfo } from './git-service';

interface GraphQLRateLimit {
  limit: number;
  remaining: number;
  resetAt: string;
  cost: number;
}

interface FileNode {
  name: string;
  type: string;
  path?: string;
  object?: {
    text?: string;
    byteSize?: number;
  };
}

interface TreeEntry {
  name: string;
  type: string;
  path: string;
  object?: {
    text?: string;
    byteSize?: number;
    entries?: TreeEntry[];
  };
}

export class GitHubGraphQLService {
  private graphqlClient: typeof graphql;
  private rateLimitBuffer = 100;

  constructor(githubToken: string) {
    // OAuth tokens use 'Bearer' format, PATs use 'token' format
    const authHeader = githubToken.startsWith('gho_')
      ? `Bearer ${githubToken}`
      : `token ${githubToken}`;

    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: authHeader,
      },
    });
  }

  /**
   * Main method to analyze repository using GitHub GraphQL API
   * Uses far fewer API calls than REST API
   */
  async analyzeRepository(
    repoUrl: string,
    githubToken?: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<{
    repoInfo: RepositoryInfo;
    files: FileInfo[];
    fileContents: GitHubFileContent[];
    metadata: GitHubRepoMetadata;
  }> {
    try {
      const { owner, repo } = this.parseRepositoryUrl(repoUrl);
      console.log('📦 Parsed repository:', { owner, repo, url: repoUrl });

      // Use provided token if available
      // OAuth tokens should use 'Bearer' format, PATs use 'token' format
      const authHeader = githubToken?.startsWith('gho_')
        ? `Bearer ${githubToken}`
        : `token ${githubToken}`;

      const client = githubToken ? graphql.defaults({
        headers: { authorization: authHeader }
      }) : this.graphqlClient;

      console.log('🔑 Using token:', {
        hasToken: !!githubToken,
        tokenType: githubToken?.startsWith('gho_') ? 'OAuth User' :
                   githubToken?.startsWith('ghp_') ? 'Personal Access' :
                   githubToken?.startsWith('ghs_') ? 'OAuth App' : 'Unknown',
        tokenLength: githubToken?.length
      });

      onProgress?.({
        stage: 'fetching_metadata',
        progress: 10,
        message: 'Fetching repository structure via GraphQL...'
      });

      // Fetch repository structure and important files in one query
      const repoData = await this.fetchRepositoryStructure(client, owner, repo);

      onProgress?.({
        stage: 'fetching_tree',
        progress: 30,
        message: 'Analyzing repository structure...'
      });

      // Extract metadata
      const metadata = this.extractMetadata(repoData, owner, repo);

      onProgress?.({
        stage: 'selecting_files',
        progress: 40,
        message: 'Identifying key files for analysis...'
      });

      // Get file list from tree
      const allFiles = this.extractFilesFromTree(repoData.repository.defaultBranchRef?.target?.tree);

      // Select important files
      const selectedFiles = this.selectImportantFiles(allFiles);

      onProgress?.({
        stage: 'fetching_contents',
        progress: 50,
        message: `Fetching contents of ${selectedFiles.length} key files...`,
        totalFiles: selectedFiles.length
      });

      // Fetch file contents in batches using GraphQL
      const fileContents = await this.fetchFileContentsBatch(
        client,
        owner,
        repo,
        selectedFiles,
        (processed) => {
          onProgress?.({
            stage: 'fetching_contents',
            progress: 50 + (processed / selectedFiles.length) * 35,
            message: `Fetching file contents... (${processed}/${selectedFiles.length})`,
            filesProcessed: processed,
            totalFiles: selectedFiles.length
          });
        }
      );

      onProgress?.({
        stage: 'generating_analysis',
        progress: 90,
        message: 'Preparing analysis data...'
      });

      // Convert to expected format
      const repoInfo = this.convertToRepositoryInfo(metadata, repoData);
      const files = this.convertToFileInfo(selectedFiles);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Analysis completed successfully!'
      });

      return {
        repoInfo,
        files,
        fileContents,
        metadata
      };

    } catch (error) {
      console.error('GitHub GraphQL analysis error:', error);
      throw this.handleGraphQLError(error);
    }
  }

  /**
   * Fetch repository structure and key files in a single GraphQL query
   */
  private async fetchRepositoryStructure(client: typeof graphql, owner: string, repo: string): Promise<any> {
    console.log('🔍 GraphQL Query Parameters:', { owner, repo });
    const query = `
      query GetRepoStructure($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          name
          description
          createdAt
          updatedAt
          isPrivate
          diskUsage
          primaryLanguage { name }
          languages(first: 10) {
            nodes { name }
          }
          stargazerCount
          forkCount
          homepageUrl
          repositoryTopics(first: 10) {
            nodes { topic { name } }
          }
          defaultBranchRef {
            name
            target {
              ... on Commit {
                oid
                message
                committedDate
                author {
                  name
                  email
                }
                tree {
                  entries {
                    name
                    type
                    path
                    object {
                      ... on Tree {
                        entries {
                          name
                          type
                          path
                          object {
                            ... on Blob {
                              byteSize
                            }
                            ... on Tree {
                              entries {
                                name
                                type
                                path
                                object {
                                  ... on Blob {
                                    byteSize
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                      ... on Blob {
                        byteSize
                        text
                      }
                    }
                  }
                }
              }
            }
          }
          # Pre-fetch critical files
          readme: object(expression: "HEAD:README.md") {
            ... on Blob { text }
          }
          readmeTxt: object(expression: "HEAD:README.txt") {
            ... on Blob { text }
          }
          readmeRst: object(expression: "HEAD:README.rst") {
            ... on Blob { text }
          }
          packageJson: object(expression: "HEAD:package.json") {
            ... on Blob { text }
          }
          packageLock: object(expression: "HEAD:package-lock.json") {
            ... on Blob { text }
          }
          tsconfig: object(expression: "HEAD:tsconfig.json") {
            ... on Blob { text }
          }
          requirements: object(expression: "HEAD:requirements.txt") {
            ... on Blob { text }
          }
          pipfile: object(expression: "HEAD:Pipfile") {
            ... on Blob { text }
          }
          gomod: object(expression: "HEAD:go.mod") {
            ... on Blob { text }
          }
          cargo: object(expression: "HEAD:Cargo.toml") {
            ... on Blob { text }
          }
          dockerfile: object(expression: "HEAD:Dockerfile") {
            ... on Blob { text }
          }
          dockerCompose: object(expression: "HEAD:docker-compose.yml") {
            ... on Blob { text }
          }
          envExample: object(expression: "HEAD:.env.example") {
            ... on Blob { text }
          }
          gitignore: object(expression: "HEAD:.gitignore") {
            ... on Blob { text }
          }
        }
        rateLimit {
          limit
          remaining
          resetAt
          cost
        }
      }
    `;

    const response = await client(query, { owner, repo }) as any;

    // Check rate limit
    this.checkRateLimit(response.rateLimit);

    return response;
  }

  /**
   * Fetch multiple file contents in batches using GraphQL
   */
  private async fetchFileContentsBatch(
    client: typeof graphql,
    owner: string,
    repo: string,
    files: Array<{ path: string; size?: number }>,
    onProgress?: (processed: number) => void
  ): Promise<GitHubFileContent[]> {
    const contents: GitHubFileContent[] = [];
    const batchSize = 10; // Fetch 10 files per query

    // Add pre-fetched critical files from initial query
    const preFetchedPaths = [
      'README.md', 'README.txt', 'README.rst', 'package.json',
      'package-lock.json', 'tsconfig.json', 'requirements.txt',
      'Pipfile', 'go.mod', 'Cargo.toml', 'Dockerfile',
      'docker-compose.yml', '.env.example', '.gitignore'
    ];

    // Filter out pre-fetched files
    const filesToFetch = files.filter(f => !preFetchedPaths.includes(f.path));

    for (let i = 0; i < filesToFetch.length; i += batchSize) {
      const batch = filesToFetch.slice(i, Math.min(i + batchSize, filesToFetch.length));

      // Build dynamic query for batch
      const fileQueries = batch.map((file, idx) => `
        file${idx}: object(expression: "HEAD:${file.path.replace(/"/g, '\\"')}") {
          ... on Blob {
            text
            byteSize
          }
        }
      `).join('\n');

      const query = `
        query GetFiles($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            ${fileQueries}
          }
          rateLimit {
            remaining
            resetAt
            cost
          }
        }
      `;

      try {
        const response = await client(query, { owner, repo }) as any;

        // Check rate limit
        this.checkRateLimit(response.rateLimit);

        // Extract file contents
        batch.forEach((file, idx) => {
          const fileData = response.repository[`file${idx}`];
          if (fileData?.text) {
            contents.push({
              path: file.path,
              content: fileData.text.substring(0, 5000), // Limit content size
              size: fileData.byteSize || 0,
              encoding: 'utf-8'
            });
          }
        });

        onProgress?.(i + batch.length);

      } catch (error) {
        console.warn(`Failed to fetch batch starting at index ${i}:`, error);
      }
    }

    return contents;
  }

  /**
   * Extract files from nested tree structure
   */
  private extractFilesFromTree(tree: any): Array<{ path: string; size?: number; type: string }> {
    const files: Array<{ path: string; size?: number; type: string }> = [];

    if (!tree?.entries) return files;

    const processEntries = (entries: TreeEntry[], parentPath = '') => {
      entries.forEach(entry => {
        const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

        if (entry.type === 'blob') {
          files.push({
            path: entry.path || fullPath,
            size: entry.object?.byteSize,
            type: 'blob'
          });
        } else if (entry.type === 'tree' && entry.object?.entries) {
          // Recursively process subdirectories
          processEntries(entry.object.entries, fullPath);
        }
      });
    };

    processEntries(tree.entries);
    return files;
  }

  /**
   * Select important files for analysis (optimized for GraphQL)
   */
  private selectImportantFiles(files: Array<{ path: string; size?: number; type: string }>): Array<{ path: string; size?: number }> {
    const selectedFiles: Array<{ path: string; size?: number }> = [];
    const maxFiles = 50;

    // Priority patterns (same as REST implementation)
    const priority1Patterns = [
      /^README\.(md|txt|rst)$/i,
      /^package\.json$/,
      /^tsconfig\.json$/,
      /^next\.config\.(js|ts|mjs)$/,
      /^app\.config\.(js|ts)$/,
      /^vite\.config\.(js|ts)$/,
    ];

    const priority2Patterns = [
      /^(src|app|pages|lib)\/.*\.(tsx|ts|jsx|js)$/,
      /^api\/.*\.(ts|js)$/,
      /^components\/.*\.(tsx|jsx)$/,
    ];

    const excludePatterns = [
      /node_modules/,
      /\.git\//,
      /dist\//,
      /build\//,
      /\.next\//,
      /\.(test|spec)\.(js|ts|tsx|jsx)$/,
      /__tests__/,
      /\.(png|jpg|jpeg|gif|svg|ico)$/i,
    ];

    // Filter eligible files
    const eligibleFiles = files.filter(file =>
      !excludePatterns.some(pattern => pattern.test(file.path)) &&
      (!file.size || file.size < 100000)
    );

    // Add priority files
    priority1Patterns.forEach(pattern => {
      const matches = eligibleFiles.filter(f =>
        pattern.test(f.path) && !selectedFiles.some(s => s.path === f.path)
      );
      selectedFiles.push(...matches);
    });

    // Add secondary priority files
    if (selectedFiles.length < maxFiles) {
      priority2Patterns.forEach(pattern => {
        const remaining = maxFiles - selectedFiles.length;
        const matches = eligibleFiles
          .filter(f => pattern.test(f.path) && !selectedFiles.some(s => s.path === f.path))
          .slice(0, remaining);
        selectedFiles.push(...matches);
      });
    }

    return selectedFiles.slice(0, maxFiles);
  }

  /**
   * Check GraphQL rate limit
   */
  private checkRateLimit(rateLimit: GraphQLRateLimit): void {
    if (!rateLimit) {
      console.warn('⚠️ No rate limit info in GraphQL response');
      return;
    }

    console.log(`GitHub GraphQL API - Remaining: ${rateLimit.remaining}/${rateLimit.limit}, Cost: ${rateLimit.cost}, Reset: ${rateLimit.resetAt}`);

    if (rateLimit.remaining < this.rateLimitBuffer) {
      const resetTime = new Date(rateLimit.resetAt);
      const errorMsg = `GitHub GraphQL API rate limit too low (${rateLimit.remaining} remaining). ` +
        `Please wait until ${resetTime.toLocaleString()} or use a different GitHub token.`;
      console.error('❌ GraphQL Rate limit check failed:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Parse repository URL
   */
  private parseRepositoryUrl(url: string): { owner: string; repo: string } {
    const cleanUrl = url.replace(/\.git$/, '');
    const urlObj = new URL(cleanUrl);

    if (!urlObj.hostname.includes('github.com')) {
      throw new Error('Only GitHub repositories are supported');
    }

    const pathParts = urlObj.pathname.split('/').filter(part => part);

    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL format');
    }

    return {
      owner: pathParts[0],
      repo: pathParts[1]
    };
  }

  /**
   * Extract metadata from GraphQL response
   */
  private extractMetadata(data: any, owner: string, repo: string): GitHubRepoMetadata {
    const repository = data.repository;

    return {
      name: repository.name,
      full_name: `${owner}/${repo}`,
      description: repository.description || '',
      language: repository.primaryLanguage?.name || 'Unknown',
      size: repository.diskUsage || 0,
      stargazers_count: repository.stargazerCount || 0,
      forks_count: repository.forkCount || 0,
      default_branch: repository.defaultBranchRef?.name || 'main',
      topics: repository.repositoryTopics?.nodes?.map((n: any) => n.topic.name) || [],
      homepage: repository.homepageUrl || '',
      created_at: repository.createdAt,
      updated_at: repository.updatedAt,
      private: repository.isPrivate || false
    };
  }

  /**
   * Convert to RepositoryInfo format
   */
  private convertToRepositoryInfo(metadata: GitHubRepoMetadata, data: any): RepositoryInfo {
    const commit = data.repository.defaultBranchRef?.target;

    return {
      name: metadata.name,
      branch: metadata.default_branch,
      lastCommit: {
        hash: commit?.oid || 'unknown',
        message: commit?.message || 'Latest commit',
        author: commit?.author?.name || 'Unknown',
        date: commit?.committedDate || metadata.updated_at
      },
      remoteUrl: `https://github.com/${metadata.full_name}`
    };
  }

  /**
   * Convert to FileInfo format
   */
  private convertToFileInfo(files: Array<{ path: string; size?: number }>): FileInfo[] {
    return files.map(file => ({
      path: file.path,
      relativePath: file.path,
      extension: this.getFileExtension(file.path),
      size: file.size || 0,
      language: this.detectLanguage(this.getFileExtension(file.path))
    }));
  }

  /**
   * Get file extension
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }

  /**
   * Detect language from extension
   */
  private detectLanguage(extension: string): string | undefined {
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.swift': 'swift',
      '.kt': 'kotlin',
    };

    return languageMap[extension.toLowerCase()];
  }

  /**
   * Handle GraphQL errors
   */
  private handleGraphQLError(error: any): Error {
    if (error.errors?.[0]) {
      const gqlError = error.errors[0];

      // Check if it's an organization OAuth restriction
      if (gqlError.type === 'NOT_FOUND' && gqlError.message?.includes('Could not resolve to a Repository')) {
        // This often means OAuth restrictions for private org repos
        return new Error(
          'OAUTH_RESTRICTION: Cannot access this repository. ' +
          'If this is a private organization repository, please ask your organization admin to approve this OAuth app.'
        );
      }

      if (gqlError.type === 'RATE_LIMITED') {
        return new Error('RATE_LIMIT: GitHub GraphQL API rate limit exceeded. Please try again later.');
      }

      if (gqlError.type === 'NOT_FOUND') {
        return new Error('NOT_FOUND: Repository not found or is private. Please check the URL and ensure you have access.');
      }

      if (gqlError.type === 'FORBIDDEN') {
        return new Error('ACCESS_FORBIDDEN: Access forbidden. Please check your GitHub token permissions.');
      }

      return new Error(`GitHub GraphQL error: ${gqlError.message}`);
    }

    if (error.message?.includes('401')) {
      return new Error('INVALID_TOKEN: Invalid GitHub token. Please reconnect your GitHub account.');
    }

    return new Error(`GitHub API error: ${error.message || 'Unknown error occurred'}`);
  }
}