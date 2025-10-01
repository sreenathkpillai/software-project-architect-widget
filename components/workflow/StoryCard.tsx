'use client';

import React from 'react';

interface StoryCardProps {
  story: any;
  onDelete: () => void;
  onGeneratePrompt: () => void;
  onClick?: () => void;
}

export default function StoryCard({
  story,
  onDelete,
  onGeneratePrompt,
  onClick
}: StoryCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-900/20';
      case 'HIGH':
        return 'text-orange-400 bg-orange-900/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'LOW':
        return 'text-green-400 bg-green-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400';
      case 'IN_PROGRESS':
        return 'text-blue-400';
      case 'READY_FOR_IMPLEMENTATION':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div
      className={`bg-gray-800/60 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 hover:border-purple-400/40 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-medium flex-1">{story.title}</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {story.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{story.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs">
          <span className={`px-2 py-1 rounded ${getPriorityColor(story.priority)}`}>
            {story.priority}
          </span>
          <span className={getStatusColor(story.status)}>
            {story.status.replace(/_/g, ' ')}
          </span>
          {story.storyPoints && (
            <span className="text-gray-500">{story.storyPoints} pts</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onGeneratePrompt();
          }}
          className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          title="Generate prompt pack"
        >
          Generate Pack
        </button>
      </div>

      {story.source !== 'MANUAL' && (
        <div className="mt-2 text-xs text-gray-500">
          Source: {story.source} {story.externalId && `(${story.externalId})`}
        </div>
      )}
    </div>
  );
}