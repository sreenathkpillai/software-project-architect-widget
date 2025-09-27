import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GitService } from '@/lib/git-service';
import path from 'path';

const prisma = new PrismaClient();

interface DiffLine {
  type: 'add' | 'remove' | 'normal' | 'info';
  oldLine?: number;
  newLine?: number;
  content: string;
}

interface FileDiff {
  file: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

// GET /api/workflow/repositories/diff - Get code diff
export async function GET(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const staged = searchParams.get('staged') === 'true';
    const filePath = searchParams.get('file');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required' },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project access
    const project = await prisma.workflowProject.findUnique({
      where: { id: projectId },
    });

    if (!project || project.externalId !== externalId) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const repoPath = path.join(process.cwd(), '.repos', projectId);
    const gitService = new GitService(repoPath);

    if (filePath) {
      // Get detailed diff for specific file
      const diffContent = await gitService.getFileDiff(filePath, staged);
      const parsedDiff = parseDiffContent(diffContent, filePath);

      return NextResponse.json({
        file: filePath,
        diff: parsedDiff,
      });
    } else {
      // Get overview diff for all files
      const diffs = await gitService.getDiff(staged);
      const detailedDiffs: FileDiff[] = [];

      for (const diff of diffs) {
        try {
          const diffContent = await gitService.getFileDiff(diff.file, staged);
          const parsedDiff = parseDiffContent(diffContent, diff.file);
          detailedDiffs.push(parsedDiff);
        } catch (error) {
          console.error(`Error getting diff for ${diff.file}:`, error);
          // Add basic diff info even if detailed parsing fails
          detailedDiffs.push({
            file: diff.file,
            additions: diff.additions,
            deletions: diff.deletions,
            lines: [{
              type: 'info',
              content: `Error loading detailed diff for ${diff.file}`
            }]
          });
        }
      }

      return NextResponse.json({
        diffs: detailedDiffs,
        staged,
      });
    }
  } catch (error) {
    console.error('Error fetching diff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diff' },
      { status: 500 }
    );
  }
}

// Parse git diff output into structured format
function parseDiffContent(diffContent: string, fileName: string): FileDiff {
  const lines = diffContent.split('\n');
  const diffLines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Hunk header (e.g., @@ -1,4 +1,6 @@)
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNum = parseInt(match[1]);
        newLineNum = parseInt(match[2]);
      }

      diffLines.push({
        type: 'info',
        content: line,
      });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      // Addition
      diffLines.push({
        type: 'add',
        newLine: newLineNum++,
        content: line.substring(1),
      });
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // Deletion
      diffLines.push({
        type: 'remove',
        oldLine: oldLineNum++,
        content: line.substring(1),
      });
      deletions++;
    } else if (line.startsWith(' ')) {
      // Context line (unchanged)
      diffLines.push({
        type: 'normal',
        oldLine: oldLineNum++,
        newLine: newLineNum++,
        content: line.substring(1),
      });
    } else if (line.startsWith('diff ') || line.startsWith('index ') ||
               line.startsWith('---') || line.startsWith('+++')) {
      // File header lines
      diffLines.push({
        type: 'info',
        content: line,
      });
    }
  }

  return {
    file: fileName,
    additions,
    deletions,
    lines: diffLines,
  };
}