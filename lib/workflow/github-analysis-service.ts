import { Octokit } from '@octokit/rest';
import { RepositoryInfo, FileInfo } from './git-service';

export interface GitHubFileContent {
  path: string;
  content: string;
  size: number;
  encoding: string;
}

export interface GitHubRepoMetadata {
  name: string;
  full_name: string;
  description: string;
  language: string;
  size: number;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  topics: string[];
  homepage: string;
  created_at: string;
  updated_at: string;
  private: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface AnalysisProgress {
  stage: 'fetching_metadata' | 'fetching_tree' | 'selecting_files' | 'fetching_contents' | 'generating_analysis' | 'completed';
  progress: number;
  message: string;
  filesProcessed?: number;
  totalFiles?: number;
}

export class GitHubAnalysisService {
  private octokit: Octokit;
  private rateLimitBuffer = 100; // Reserve 100 API calls for safety

  constructor(githubToken?: string) {
    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'Software-Project-Architect/1.0'
    });
  }

  /**
   * Main method to analyze a repository using GitHub API
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
      // Parse repository URL to extract owner and repo
      const { owner, repo } = this.parseRepositoryUrl(repoUrl);

      // Create Octokit instance with provided token if available
      const octokit = githubToken
        ? new Octokit({ auth: githubToken, userAgent: 'Software-Project-Architect/1.0' })
        : this.octokit;

      // Check rate limit before starting
      await this.checkRateLimit(octokit);

      onProgress?.({
        stage: 'fetching_metadata',
        progress: 10,
        message: 'Fetching repository metadata...'
      });

      // 1. Get repository metadata
      const metadata = await this.getRepositoryMetadata(octokit, owner, repo);

      onProgress?.({
        stage: 'fetching_tree',
        progress: 25,
        message: 'Fetching repository file tree...'
      });

      // 2. Get repository tree structure
      const tree = await this.getRepositoryTree(octokit, owner, repo, metadata.default_branch);

      onProgress?.({
        stage: 'selecting_files',
        progress: 40,
        message: 'Selecting important files for analysis...'
      });

      // 3. Select important files based on priority algorithm
      const selectedFiles = this.selectImportantFiles(tree);

      onProgress?.({
        stage: 'fetching_contents',
        progress: 55,
        message: `Fetching contents of ${selectedFiles.length} key files...`,
        totalFiles: selectedFiles.length
      });

      // 4. Fetch file contents
      const fileContents = await this.fetchFileContents(
        octokit,
        owner,
        repo,
        selectedFiles,
        (processed) => {
          onProgress?.({
            stage: 'fetching_contents',
            progress: 55 + (processed / selectedFiles.length) * 25,
            message: `Fetching file contents... (${processed}/${selectedFiles.length})`,
            filesProcessed: processed,
            totalFiles: selectedFiles.length
          });
        }
      );

      onProgress?.({
        stage: 'generating_analysis',
        progress: 85,
        message: 'Preparing analysis data...'
      });

      // 5. Convert to expected format
      const repoInfo = this.convertToRepositoryInfo(metadata, tree);
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
      console.error('GitHub API analysis error:', error);
      throw this.handleGitHubError(error);
    }
  }

  /**
   * Parse GitHub repository URL to extract owner and repo name
   */
  private parseRepositoryUrl(url: string): { owner: string; repo: string } {
    try {
      // Handle various GitHub URL formats
      const cleanUrl = url.replace(/\.git$/, ''); // Remove .git suffix
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
    } catch (error) {
      throw new Error(`Invalid repository URL: ${url}. Expected format: https://github.com/owner/repo`);
    }
  }

  /**
   * Get repository metadata from GitHub API
   */
  private async getRepositoryMetadata(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<GitHubRepoMetadata> {
    try {
      const { data } = await octokit.rest.repos.get({
        owner,
        repo
      });

      return {
        name: data.name,
        full_name: data.full_name,
        description: data.description || '',
        language: data.language || 'Unknown',
        size: data.size,
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        default_branch: data.default_branch,
        topics: data.topics || [],
        homepage: data.homepage || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
        private: data.private
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or is private`);
      }
      throw error;
    }
  }

  /**
   * Get repository tree structure using GitHub API
   */
  async getRepositoryTree(
    octokit: Octokit,
    owner: string,
    repo: string,
    branch = 'main'
  ): Promise<GitHubTreeItem[]> {
    try {
      // First, get the latest commit SHA for the branch
      const { data: branchData } = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch
      });

      const commitSha = branchData.commit.sha;

      // Get the complete tree recursively
      const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: 'true'
      });

      // Filter out directories and return only files
      return treeData.tree
        .filter(item => item.type === 'blob') // Only files, not directories
        .map(item => ({
          path: item.path!,
          mode: item.mode!,
          type: item.type! as 'blob',
          sha: item.sha!,
          size: item.size,
          url: item.url!
        }));

    } catch (error: any) {
      if (error.status === 404) {
        // Try 'master' branch if 'main' doesn't exist
        if (branch === 'main') {
          return this.getRepositoryTree(octokit, owner, repo, 'master');
        }
        throw new Error(`Branch '${branch}' not found in repository ${owner}/${repo}`);
      }
      throw error;
    }
  }

  /**
   * Select important files based on priority algorithm
   */
  selectImportantFiles(tree: GitHubTreeItem[]): GitHubTreeItem[] {
    const selectedFiles: GitHubTreeItem[] = [];
    const maxFiles = 50; // Limit to prevent excessive API calls

    // Priority 1: Critical configuration and documentation files
    const priority1Patterns = [
      /^README\.(md|txt|rst)$/i,
      /^package\.json$/,
      /^package-lock\.json$/,
      /^yarn\.lock$/,
      /^requirements\.txt$/,
      /^Pipfile$/,
      /^poetry\.lock$/,
      /^composer\.json$/,
      /^go\.mod$/,
      /^Cargo\.toml$/,
      /^Dockerfile$/i,
      /^docker-compose\.(yml|yaml)$/i,
      /^\.env\.example$/,
      /^tsconfig\.json$/,
      /^next\.config\.(js|ts)$/,
      /^webpack\.config\.(js|ts)$/,
      /^vite\.config\.(js|ts)$/,
      /^babel\.config\.(js|json)$/,
      /^schema\.prisma$/,
    ];

    // Priority 2: Main entry points and core application files
    const priority2Patterns = [
      /^(index|main|app|server)\.(js|ts|tsx|jsx)$/,
      /^src\/(index|main|app)\.(js|ts|tsx|jsx)$/,
      /^app\/(page|layout|globals)\.(js|ts|tsx|jsx)$/,
      /^pages\/_app\.(js|ts|tsx|jsx)$/,
      /^pages\/index\.(js|ts|tsx|jsx)$/,
      /^public\/index\.html$/,
    ];

    // Priority 3: Important source directories (limit to first few files)
    const priority3Patterns = [
      /^src\/.*\.(js|ts|tsx|jsx|py|java|go|rs)$/,
      /^lib\/.*\.(js|ts|tsx|jsx|py|java|go|rs)$/,
      /^app\/.*\.(js|ts|tsx|jsx|py|java|go|rs)$/,
      /^components\/.*\.(js|ts|tsx|jsx)$/,
      /^pages\/.*\.(js|ts|tsx|jsx)$/,
      /^api\/.*\.(js|ts|py|java|go|rs)$/,
      /^routes\/.*\.(js|ts|py|java|go|rs)$/,
    ];

    // Exclusion patterns
    const excludePatterns = [
      /node_modules/,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.next\//,
      /\.nuxt\//,
      /\.cache\//,
      /\.temp\//,
      /\.tmp\//,
      /vendor\//,
      /target\//,
      /\.min\.(js|css)$/,
      /\.map$/,
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
      /\.test\.(js|ts|tsx|jsx)$/,
      /\.spec\.(js|ts|tsx|jsx)$/,
      /test\//,
      /tests\//,
      /__tests__\//,
    ];

    // Filter out excluded files
    const eligibleFiles = tree.filter(file =>
      !excludePatterns.some(pattern => pattern.test(file.path)) &&
      file.size && file.size < 100000 // Exclude files larger than 100KB
    );

    // Add Priority 1 files
    priority1Patterns.forEach(pattern => {
      const matches = eligibleFiles.filter(file =>
        pattern.test(file.path) && !selectedFiles.some(selected => selected.path === file.path)
      );
      selectedFiles.push(...matches);
    });

    // Add Priority 2 files
    priority2Patterns.forEach(pattern => {
      const matches = eligibleFiles.filter(file =>
        pattern.test(file.path) && !selectedFiles.some(selected => selected.path === file.path)
      );
      selectedFiles.push(...matches);
    });

    // Add Priority 3 files (limited to prevent too many API calls)
    if (selectedFiles.length < maxFiles) {
      const remainingSlots = maxFiles - selectedFiles.length;
      const priority3Files: GitHubTreeItem[] = [];

      priority3Patterns.forEach(pattern => {
        const matches = eligibleFiles.filter(file =>
          pattern.test(file.path) &&
          !selectedFiles.some(selected => selected.path === file.path) &&
          !priority3Files.some(p3 => p3.path === file.path)
        );
        priority3Files.push(...matches);
      });

      // Sort by file size (prefer smaller files) and take only what we need
      priority3Files
        .sort((a, b) => (a.size || 0) - (b.size || 0))
        .slice(0, remainingSlots)
        .forEach(file => selectedFiles.push(file));
    }

    console.log(`Selected ${selectedFiles.length} files out of ${tree.length} total files for analysis`);
    return selectedFiles.slice(0, maxFiles);
  }

  /**
   * Fetch file contents for selected files
   */
  private async fetchFileContents(
    octokit: Octokit,
    owner: string,
    repo: string,
    files: GitHubTreeItem[],
    onProgress?: (processed: number) => void
  ): Promise<GitHubFileContent[]> {
    const contents: GitHubFileContent[] = [];
    const maxConcurrency = 5; // Limit concurrent requests

    // Process files in batches to respect rate limits
    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (file) => {
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path
          });

          // Handle file content (not directory)
          if ('content' in data && typeof data.content === 'string') {
            const content = data.encoding === 'base64'
              ? Buffer.from(data.content, 'base64').toString('utf-8')
              : data.content;

            return {
              path: file.path,
              content: content.substring(0, 5000), // Limit content size for analysis
              size: data.size,
              encoding: data.encoding
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch content for ${file.path}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      contents.push(...batchResults.filter(Boolean) as GitHubFileContent[]);

      onProgress?.(i + batch.length);

      // Small delay between batches to be nice to the API
      if (i + maxConcurrency < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return contents;
  }

  /**
   * Check GitHub API rate limit
   */
  private async checkRateLimit(octokit: Octokit): Promise<void> {
    try {
      const { data: rateLimit } = await octokit.rest.rateLimit.get();
      const remaining = rateLimit.rate.remaining;
      const resetTime = new Date(rateLimit.rate.reset * 1000);

      console.log(`GitHub API rate limit: ${remaining}/${rateLimit.rate.limit} remaining. Reset at: ${resetTime}`);

      if (remaining < this.rateLimitBuffer) {
        const waitTime = resetTime.getTime() - Date.now();
        throw new Error(
          `GitHub API rate limit too low (${remaining} remaining). ` +
          `Please wait until ${resetTime.toLocaleString()} or use a different GitHub token.`
        );
      }
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Invalid GitHub token. Please provide a valid personal access token.');
      }
      throw error;
    }
  }

  /**
   * Convert GitHub metadata to RepositoryInfo format
   */
  private convertToRepositoryInfo(metadata: GitHubRepoMetadata, tree: GitHubTreeItem[]): RepositoryInfo {
    return {
      name: metadata.name,
      branch: metadata.default_branch,
      lastCommit: {
        hash: 'latest', // We don't fetch commit details in this implementation
        message: 'Latest commit via GitHub API',
        author: 'Unknown',
        date: metadata.updated_at
      },
      remoteUrl: `https://github.com/${metadata.full_name}`
    };
  }

  /**
   * Convert GitHub tree items to FileInfo format
   */
  private convertToFileInfo(treeItems: GitHubTreeItem[]): FileInfo[] {
    return treeItems.map(item => ({
      path: item.path,
      relativePath: item.path,
      extension: this.getFileExtension(item.path),
      size: item.size || 0,
      language: this.detectLanguage(this.getFileExtension(item.path))
    }));
  }

  /**
   * Get file extension from path
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(extension: string): string | undefined {
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.fish': 'shell',
      '.dockerfile': 'dockerfile',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };

    return languageMap[extension.toLowerCase()];
  }

  /**
   * Handle GitHub API errors with user-friendly messages
   */
  private handleGitHubError(error: any): Error {
    if (error.status === 403) {
      return new Error('GitHub API rate limit exceeded or repository access forbidden. Please try again later or provide a GitHub token.');
    }

    if (error.status === 404) {
      return new Error('Repository not found or is private. Please check the URL and ensure you have access.');
    }

    if (error.status === 401) {
      return new Error('Invalid GitHub token. Please provide a valid personal access token.');
    }

    if (error.message?.includes('rate limit')) {
      return new Error('GitHub API rate limit exceeded. Please wait before analyzing another repository.');
    }

    return new Error(`GitHub API error: ${error.message || 'Unknown error occurred'}`);
  }
}