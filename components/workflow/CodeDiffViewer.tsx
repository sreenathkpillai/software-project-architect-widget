'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, Copy, Download } from 'lucide-react';

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

interface CodeDiffViewerProps {
  projectId: string;
  externalId: string;
  staged?: boolean;
  onRefresh?: () => void;
}

export default function CodeDiffViewer({
  projectId,
  externalId,
  staged = false,
  onRefresh,
}: CodeDiffViewerProps) {
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDiffs();
  }, [projectId, staged]);

  const fetchDiffs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/widget/api/workflow/repositories/diff?projectId=${projectId}&staged=${staged}`,
        {
          headers: {
            'x-external-id': externalId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch diff');
      }

      const data = await response.json();
      setDiffs(data.diffs || []);
    } catch (err) {
      console.error('Error fetching diffs:', err);
      setError('Failed to load code changes');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileExpansion = (file: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(file)) {
      newExpanded.delete(file);
    } else {
      newExpanded.add(file);
    }
    setExpandedFiles(newExpanded);
  };

  const copyDiff = async (fileDiff: FileDiff) => {
    const diffText = formatDiffAsText(fileDiff);
    await navigator.clipboard.writeText(diffText);
  };

  const downloadDiff = (fileDiff: FileDiff) => {
    const diffText = formatDiffAsText(fileDiff);
    const blob = new Blob([diffText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileDiff.file.replace(/[/\\]/g, '_')}.diff`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDiffAsText = (fileDiff: FileDiff): string => {
    let text = `--- a/${fileDiff.file}\n+++ b/${fileDiff.file}\n`;
    fileDiff.lines.forEach(line => {
      if (line.type === 'add') {
        text += `+${line.content}\n`;
      } else if (line.type === 'remove') {
        text += `-${line.content}\n`;
      } else if (line.type === 'normal') {
        text += ` ${line.content}\n`;
      } else if (line.type === 'info') {
        text += `${line.content}\n`;
      }
    });
    return text;
  };

  const getLineTypeColor = (type: DiffLine['type']) => {
    switch (type) {
      case 'add':
        return 'bg-green-500/10 border-l-2 border-green-500';
      case 'remove':
        return 'bg-red-500/10 border-l-2 border-red-500';
      case 'info':
        return 'bg-blue-500/10 border-l-2 border-blue-500';
      default:
        return '';
    }
  };

  const getLineTypeSymbol = (type: DiffLine['type']) => {
    switch (type) {
      case 'add':
        return '+';
      case 'remove':
        return '-';
      default:
        return ' ';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-widget-accent-start border-t-transparent rounded-full"></div>
        <span className="ml-2 text-widget-text-secondary">Loading changes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchDiffs}
          className="mt-2 px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (diffs.length === 0) {
    return (
      <div className="text-center p-8 text-widget-text-secondary">
        <p>No {staged ? 'staged' : 'unstaged'} changes found</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-2 px-3 py-1 bg-widget-surface text-widget-text-primary rounded hover:bg-widget-border transition-colors"
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-widget-text-primary">
          {staged ? 'Staged Changes' : 'Unstaged Changes'}
        </h3>
        <div className="flex items-center gap-2 text-sm text-widget-text-secondary">
          <span className="flex items-center gap-1">
            <Plus className="w-3 h-3 text-green-400" />
            {diffs.reduce((sum, diff) => sum + diff.additions, 0)} additions
          </span>
          <span className="flex items-center gap-1">
            <Minus className="w-3 h-3 text-red-400" />
            {diffs.reduce((sum, diff) => sum + diff.deletions, 0)} deletions
          </span>
        </div>
      </div>

      {diffs.map((fileDiff) => (
        <div
          key={fileDiff.file}
          className="border border-widget-border rounded-lg overflow-hidden"
        >
          {/* File Header */}
          <div className="bg-widget-surface p-3 border-b border-widget-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleFileExpansion(fileDiff.file)}
                className="flex items-center gap-2 text-widget-text-primary hover:text-widget-accent-start transition-colors"
              >
                {expandedFiles.has(fileDiff.file) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="font-mono text-sm">{fileDiff.file}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-green-400">
                    <Plus className="w-3 h-3" />
                    {fileDiff.additions}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <Minus className="w-3 h-3" />
                    {fileDiff.deletions}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyDiff(fileDiff)}
                    className="p-1 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
                    title="Copy diff"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => downloadDiff(fileDiff)}
                    className="p-1 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
                    title="Download diff"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Diff Content */}
          {expandedFiles.has(fileDiff.file) && (
            <div className="bg-widget-bg">
              {fileDiff.lines.map((line, index) => (
                <div
                  key={index}
                  className={`flex items-start font-mono text-xs ${getLineTypeColor(line.type)}`}
                >
                  {/* Line Numbers */}
                  <div className="flex-shrink-0 w-16 px-2 py-1 text-widget-text-secondary bg-widget-surface border-r border-widget-border">
                    <div className="flex justify-between">
                      <span>{line.oldLine || ''}</span>
                      <span>{line.newLine || ''}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-3 py-1 overflow-x-auto">
                    <span className="mr-2 text-widget-text-secondary">
                      {getLineTypeSymbol(line.type)}
                    </span>
                    <span
                      className={`${
                        line.type === 'add'
                          ? 'text-green-400'
                          : line.type === 'remove'
                          ? 'text-red-400'
                          : line.type === 'info'
                          ? 'text-blue-400'
                          : 'text-widget-text-primary'
                      }`}
                    >
                      {line.content}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}