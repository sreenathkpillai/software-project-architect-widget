'use client';

import React, { useState, useEffect } from 'react';
import { GitCommit, Hash, User, Calendar, MessageSquare, ExternalLink } from 'lucide-react';

interface GitCommitData {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

interface CommitHistoryProps {
  projectId: string;
  externalId: string;
  limit?: number;
  storyId?: string;
  onCommitSelect?: (commit: GitCommitData) => void;
}

export default function CommitHistory({
  projectId,
  externalId,
  limit = 20,
  storyId,
  onCommitSelect,
}: CommitHistoryProps) {
  const [commits, setCommits] = useState<GitCommitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  useEffect(() => {
    fetchCommits();
  }, [projectId, limit]);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/widget/api/workflow/repositories/commits?projectId=${projectId}&limit=${limit}`,
        {
          headers: {
            'x-external-id': externalId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch commits');
      }

      const data = await response.json();
      setCommits(data.commits.map((commit: any) => ({
        ...commit,
        date: new Date(commit.date),
      })));
    } catch (err) {
      console.error('Error fetching commits:', err);
      setError('Failed to load commit history');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitClick = (commit: GitCommitData) => {
    setSelectedCommit(commit.hash);
    onCommitSelect?.(commit);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const isStoryRelated = (message: string) => {
    if (!storyId) return false;
    const storyRef = storyId.slice(-8);
    return message.includes(storyRef) || message.toLowerCase().includes(storyRef.toLowerCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-widget-accent-start border-t-transparent rounded-full"></div>
        <span className="ml-2 text-widget-text-secondary">Loading commits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchCommits}
          className="mt-2 px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="text-center p-8 text-widget-text-secondary">
        <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No commits found</p>
        <p className="text-sm mt-1">Make your first commit to see history here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-widget-text-primary flex items-center gap-2">
          <GitCommit className="w-5 h-5" />
          Commit History
        </h3>
        <button
          onClick={fetchCommits}
          className="text-sm text-widget-text-secondary hover:text-widget-text-primary transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {commits.map((commit) => {
          const isSelected = selectedCommit === commit.hash;
          const isRelated = isStoryRelated(commit.message);

          return (
            <div
              key={commit.hash}
              onClick={() => handleCommitClick(commit)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${isSelected
                  ? 'border-widget-accent-start bg-widget-accent-start/10'
                  : 'border-widget-border hover:border-widget-accent-start/50 hover:bg-widget-surface'
                }
                ${isRelated ? 'bg-blue-500/5 border-blue-500/20' : ''}
              `}
            >
              {/* Commit Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Hash className="w-4 h-4 text-widget-text-secondary flex-shrink-0" />
                  <span className="font-mono text-sm text-widget-text-primary truncate">
                    {commit.hash.substring(0, 8)}
                  </span>
                  {isRelated && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      Story Related
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-widget-text-secondary">
                  <Calendar className="w-3 h-3" />
                  {formatDate(commit.date)}
                </div>
              </div>

              {/* Commit Message */}
              <div className="mb-3">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-widget-text-secondary mt-0.5 flex-shrink-0" />
                  <p className="text-widget-text-primary text-sm line-clamp-2">
                    {commit.message}
                  </p>
                </div>
              </div>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-widget-text-secondary">
                  <User className="w-3 h-3" />
                  <span>{commit.author}</span>
                </div>

                {onCommitSelect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCommitSelect(commit);
                    }}
                    className="text-xs text-widget-accent-start hover:text-widget-accent-end transition-colors flex items-center gap-1"
                  >
                    View Details
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Extended Info for Selected Commit */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-widget-border">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-widget-text-secondary">Full Hash:</span>
                      <span className="font-mono text-widget-text-primary">{commit.hash}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-widget-text-secondary">Timestamp:</span>
                      <span className="text-widget-text-primary">
                        {commit.date.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {commits.length >= limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => fetchCommits()}
            className="text-sm text-widget-accent-start hover:text-widget-accent-end transition-colors"
          >
            Load More Commits
          </button>
        </div>
      )}
    </div>
  );
}