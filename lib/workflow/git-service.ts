import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RepositoryInfo {
  name: string;
  branch: string;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  remoteUrl: string;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  extension: string;
  size: number;
  language?: string;
}

export class WorkflowGitService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'repositories');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clone or update a repository
   */
  async cloneRepository(url: string, projectId: string, branch = 'main', githubToken?: string): Promise<string> {
    const localPath = path.join(this.tempDir, projectId);

    try {
      // Remove existing directory if it exists
      if (fs.existsSync(localPath)) {
        fs.rmSync(localPath, { recursive: true, force: true });
      }

      // Clone the repository
      console.log(`Cloning repository: ${url} to ${localPath}`);

      let cloneUrl = url;
      // If GitHub token is provided, inject it into the URL for authentication
      if (githubToken && url.includes('github.com')) {
        const urlObj = new URL(url);
        cloneUrl = `https://${githubToken}@${urlObj.hostname}${urlObj.pathname}`;
      }

      execSync(`git clone --depth 1 --branch ${branch} "${cloneUrl}" "${localPath}"`, {
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      });

      return localPath;
    } catch (error) {
      console.error('Git clone error:', error);
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(repoPath: string): Promise<RepositoryInfo> {
    try {
      const repoName = path.basename(repoPath);

      // Get current branch
      const branch = execSync('git branch --show-current', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      // Get last commit info
      const lastCommitInfo = execSync('git log -1 --format="%H|%s|%an|%ad" --date=iso', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      const [hash, message, author, date] = lastCommitInfo.split('|');

      // Get remote URL
      const remoteUrl = execSync('git config --get remote.origin.url', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      return {
        name: repoName,
        branch,
        lastCommit: {
          hash: hash.substring(0, 8), // Short hash
          message,
          author,
          date
        },
        remoteUrl
      };
    } catch (error) {
      console.error('Get repository info error:', error);
      throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get branches from repository
   */
  async getBranches(repoPath: string): Promise<string[]> {
    try {
      const branches = execSync('git branch -r --format="%(refname:short)"', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      return branches
        .split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch && !branch.includes('HEAD'))
        .map(branch => branch.replace('origin/', ''));
    } catch (error) {
      console.error('Get branches error:', error);
      return ['main', 'master']; // Default branches
    }
  }

  /**
   * Get file structure from repository
   */
  async getFileStructure(repoPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
      // Get all files (excluding .git and common ignore patterns)
      const gitFiles = execSync('git ls-files', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      if (!gitFiles) {
        return files;
      }

      gitFiles.split('\n').forEach(relativePath => {
        if (!relativePath.trim()) return;

        const fullPath = path.join(repoPath, relativePath);

        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            const extension = path.extname(relativePath);
            const language = this.detectLanguage(extension);

            files.push({
              path: fullPath,
              relativePath,
              extension,
              size: stats.size,
              language
            });
          }
        } catch (error) {
          // Skip files that can't be accessed
          console.warn(`Skipping file ${relativePath}: ${error}`);
        }
      });

      return files;
    } catch (error) {
      console.error('Get file structure error:', error);
      throw new Error(`Failed to get file structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get commits history
   */
  async getCommits(repoPath: string, limit = 10): Promise<any[]> {
    try {
      const commits = execSync(`git log --oneline -${limit} --format="%H|%s|%an|%ad" --date=iso`, {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();

      if (!commits) {
        return [];
      }

      return commits.split('\n').map(commit => {
        const [hash, message, author, date] = commit.split('|');
        return {
          hash: hash.substring(0, 8),
          message,
          author,
          date
        };
      });
    } catch (error) {
      console.error('Get commits error:', error);
      return [];
    }
  }

  /**
   * Clean up repository directory
   */
  async cleanupRepository(projectId: string): Promise<void> {
    const localPath = path.join(this.tempDir, projectId);

    try {
      if (fs.existsSync(localPath)) {
        fs.rmSync(localPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      // Don't throw error for cleanup failures
    }
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
}