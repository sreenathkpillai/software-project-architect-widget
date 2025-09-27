import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface GitRepository {
  url: string;
  branch: string;
  localPath?: string;
  isInitialized: boolean;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  lastCommit?: GitCommit;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  changes: string[];
}

export class GitService {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  // Initialize or clone repository
  async initializeRepository(url?: string): Promise<void> {
    try {
      if (url) {
        // Clone remote repository
        const repoName = path.basename(url, '.git');
        const clonePath = path.join(this.repoPath, repoName);

        await execAsync(`git clone ${url} ${clonePath}`);
        this.repoPath = clonePath;
      } else {
        // Initialize new repository
        await fs.mkdir(this.repoPath, { recursive: true });
        await execAsync('git init', { cwd: this.repoPath });
      }
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error}`);
    }
  }

  // Get current branch
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.repoPath,
      });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error}`);
    }
  }

  // List all branches
  async listBranches(): Promise<GitBranch[]> {
    try {
      const { stdout } = await execAsync('git branch -a -v', {
        cwd: this.repoPath,
      });

      const branches: GitBranch[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const current = line.startsWith('*');
        const parts = line.replace('*', '').trim().split(/\s+/);
        const name = parts[0];
        const hash = parts[1];

        branches.push({
          name,
          current,
          lastCommit: hash ? { hash, author: '', date: new Date(), message: '' } : undefined,
        });
      }

      return branches;
    } catch (error) {
      throw new Error(`Failed to list branches: ${error}`);
    }
  }

  // Create and checkout new branch
  async createBranch(branchName: string, checkout: boolean = true): Promise<void> {
    try {
      await execAsync(`git branch ${branchName}`, {
        cwd: this.repoPath,
      });

      if (checkout) {
        await this.checkoutBranch(branchName);
      }
    } catch (error) {
      throw new Error(`Failed to create branch ${branchName}: ${error}`);
    }
  }

  // Checkout existing branch
  async checkoutBranch(branchName: string): Promise<void> {
    try {
      await execAsync(`git checkout ${branchName}`, {
        cwd: this.repoPath,
      });
    } catch (error) {
      throw new Error(`Failed to checkout branch ${branchName}: ${error}`);
    }
  }

  // Stage files
  async stageFiles(files: string[] = ['.']): Promise<void> {
    try {
      const fileList = files.join(' ');
      await execAsync(`git add ${fileList}`, {
        cwd: this.repoPath,
      });
    } catch (error) {
      throw new Error(`Failed to stage files: ${error}`);
    }
  }

  // Commit changes
  async commit(message: string, author?: { name: string; email: string }): Promise<string> {
    try {
      let command = 'git commit';

      if (author) {
        command = `${command} --author="${author.name} <${author.email}>"`;
      }

      command = `${command} -m "${message.replace(/"/g, '\\"')}"`;

      const { stdout } = await execAsync(command, {
        cwd: this.repoPath,
      });

      // Extract commit hash from output
      const match = stdout.match(/\[[\w-]+\s+(\w+)\]/);
      return match ? match[1] : '';
    } catch (error) {
      throw new Error(`Failed to commit: ${error}`);
    }
  }

  // Push to remote
  async push(branch?: string, remote: string = 'origin'): Promise<void> {
    try {
      const branchName = branch || await this.getCurrentBranch();
      await execAsync(`git push ${remote} ${branchName}`, {
        cwd: this.repoPath,
      });
    } catch (error) {
      throw new Error(`Failed to push to remote: ${error}`);
    }
  }

  // Get commit history
  async getCommitHistory(limit: number = 20): Promise<GitCommit[]> {
    try {
      const { stdout } = await execAsync(
        `git log --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso -n ${limit}`,
        { cwd: this.repoPath }
      );

      const commits: GitCommit[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [hash, author, , date, message] = line.split('|');
        commits.push({
          hash,
          author,
          date: new Date(date),
          message,
        });
      }

      return commits;
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error}`);
    }
  }

  // Get diff for uncommitted changes
  async getDiff(staged: boolean = false): Promise<GitDiff[]> {
    try {
      const command = staged ? 'git diff --cached --stat' : 'git diff --stat';
      const { stdout } = await execAsync(command, {
        cwd: this.repoPath,
      });

      const diffs: GitDiff[] = [];
      const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('changed'));

      for (const line of lines) {
        const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([\+\-]+)/);
        if (match) {
          const [, file, changes, indicators] = match;
          const additions = (indicators.match(/\+/g) || []).length;
          const deletions = (indicators.match(/\-/g) || []).length;

          diffs.push({
            file,
            additions,
            deletions,
            changes: [],
          });
        }
      }

      return diffs;
    } catch (error) {
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  // Get detailed diff for a specific file
  async getFileDiff(filePath: string, staged: boolean = false): Promise<string> {
    try {
      const command = staged
        ? `git diff --cached ${filePath}`
        : `git diff ${filePath}`;

      const { stdout } = await execAsync(command, {
        cwd: this.repoPath,
      });

      return stdout;
    } catch (error) {
      throw new Error(`Failed to get file diff: ${error}`);
    }
  }

  // Get repository status
  async getStatus(): Promise<{
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  }> {
    try {
      const { stdout } = await execAsync('git status --porcelain -b', {
        cwd: this.repoPath,
      });

      const lines = stdout.split('\n');
      const branchLine = lines[0];
      const branch = branchLine.replace('## ', '').split('...')[0];

      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const untracked: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status === '??') untracked.push(file);
        else if (status.includes('M')) modified.push(file);
        else if (status.includes('A')) added.push(file);
        else if (status.includes('D')) deleted.push(file);
      }

      return { branch, modified, added, deleted, untracked };
    } catch (error) {
      throw new Error(`Failed to get status: ${error}`);
    }
  }

  // Create pull request (GitHub specific)
  async createPullRequest(
    title: string,
    body: string,
    baseBranch: string = 'main',
    headBranch?: string
  ): Promise<{ url: string; number: number }> {
    try {
      const currentBranch = headBranch || await this.getCurrentBranch();

      // Push current branch first
      await this.push(currentBranch);

      // Use GitHub CLI to create PR
      const { stdout } = await execAsync(
        `gh pr create --title "${title}" --body "${body}" --base ${baseBranch} --head ${currentBranch}`,
        { cwd: this.repoPath }
      );

      // Extract PR URL and number from output
      const urlMatch = stdout.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/(\d+)/);

      if (urlMatch) {
        return {
          url: urlMatch[0],
          number: parseInt(urlMatch[1]),
        };
      }

      throw new Error('Failed to extract PR details from output');
    } catch (error) {
      throw new Error(`Failed to create pull request: ${error}`);
    }
  }

  // Check if repository has uncommitted changes
  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.repoPath,
      });
      return stdout.trim().length > 0;
    } catch (error) {
      throw new Error(`Failed to check uncommitted changes: ${error}`);
    }
  }

  // Get remote URL
  async getRemoteUrl(remote: string = 'origin'): Promise<string> {
    try {
      const { stdout } = await execAsync(`git remote get-url ${remote}`, {
        cwd: this.repoPath,
      });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get remote URL: ${error}`);
    }
  }

  // Add remote
  async addRemote(name: string, url: string): Promise<void> {
    try {
      await execAsync(`git remote add ${name} ${url}`, {
        cwd: this.repoPath,
      });
    } catch (error) {
      throw new Error(`Failed to add remote: ${error}`);
    }
  }
}