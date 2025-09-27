'use client';

import React, { useState } from 'react';
import { UserStory } from '@/types/workflow';
import { MoreVertical, Trash2, Edit, CheckCircle, Clock, Archive } from 'lucide-react';

interface StoryCardProps {
  story: UserStory;
  onClick: () => void;
  onStatusChange?: (status: UserStory['status']) => void;
  onDelete?: () => void;
  compact?: boolean;
}

export default function StoryCard({
  story,
  onClick,
  onStatusChange,
  onDelete,
  compact = false,
}: StoryCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleStatusChange = (e: React.MouseEvent, status: UserStory['status']) => {
    e.stopPropagation();
    onStatusChange?.(status);
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this story?')) {
      onDelete?.();
    }
    setShowMenu(false);
  };

  const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const statusIcons = {
    backlog: <Archive className="w-4 h-4" />,
    in_progress: <Clock className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
  };

  if (compact) {
    return (
      <div
        className="bg-widget-bg rounded-lg p-3 hover:shadow-md transition-all cursor-pointer border border-widget-border"
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-medium text-widget-text-primary line-clamp-2">
            {story.title}
          </h4>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-widget-surface rounded"
            >
              <MoreVertical className="w-4 h-4 text-widget-text-secondary" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 bg-widget-surface border border-widget-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                <button
                  onClick={(e) => handleStatusChange(e, 'backlog')}
                  className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
                >
                  <Archive className="w-3 h-3" />
                  To Backlog
                </button>
                <button
                  onClick={(e) => handleStatusChange(e, 'in_progress')}
                  className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
                >
                  <Clock className="w-3 h-3" />
                  In Progress
                </button>
                <button
                  onClick={(e) => handleStatusChange(e, 'completed')}
                  className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  Complete
                </button>
                <hr className="my-1 border-widget-border" />
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-widget-bg flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {story.priority && (
          <span
            className={`inline-block px-2 py-0.5 text-xs rounded border ${
              priorityColors[story.priority]
            }`}
          >
            {story.priority}
          </span>
        )}

        {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
          <div className="mt-2 text-xs text-widget-text-secondary">
            {story.acceptanceCriteria.length} acceptance{' '}
            {story.acceptanceCriteria.length === 1 ? 'criterion' : 'criteria'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-widget-surface rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer border border-widget-border"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-widget-text-secondary">
            {statusIcons[story.status]}
          </span>
          <h3 className="font-medium text-widget-text-primary">{story.title}</h3>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-widget-bg rounded"
          >
            <MoreVertical className="w-4 h-4 text-widget-text-secondary" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-widget-surface border border-widget-border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
              >
                <Edit className="w-3 h-3" />
                View Details
              </button>
              <hr className="my-1 border-widget-border" />
              <button
                onClick={(e) => handleStatusChange(e, 'backlog')}
                className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
              >
                <Archive className="w-3 h-3" />
                Move to Backlog
              </button>
              <button
                onClick={(e) => handleStatusChange(e, 'in_progress')}
                className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
              >
                <Clock className="w-3 h-3" />
                Start Progress
              </button>
              <button
                onClick={(e) => handleStatusChange(e, 'completed')}
                className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
              >
                <CheckCircle className="w-3 h-3" />
                Mark Complete
              </button>
              <hr className="my-1 border-widget-border" />
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-widget-bg flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete Story
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-widget-text-secondary mb-3 line-clamp-2">
        {story.userStatement}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {story.priority && (
            <span
              className={`px-2 py-0.5 text-xs rounded border ${
                priorityColors[story.priority]
              }`}
            >
              {story.priority}
            </span>
          )}
        </div>

        {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
          <span className="text-xs text-widget-text-secondary">
            {story.acceptanceCriteria.length} criteria
          </span>
        )}
      </div>
    </div>
  );
}