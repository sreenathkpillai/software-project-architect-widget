'use client';

import React, { useState } from 'react';
import { UserStory, WorkflowProject } from '@/types/workflow';
import {
  X,
  Edit2,
  Save,
  Download,
  Copy,
  CheckCircle,
  Clock,
  Archive,
  AlertCircle,
  Wand2
} from 'lucide-react';
import PromptPackGenerator from './PromptPackGenerator';

interface StoryDetailProps {
  story: UserStory;
  project: WorkflowProject;
  onClose: () => void;
  onUpdate: (updates: Partial<UserStory>) => void;
  onExport?: () => void;
}

export default function StoryDetail({
  story,
  project,
  onClose,
  onUpdate,
  onExport,
}: StoryDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState(story);
  const [copied, setCopied] = useState(false);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  const handleSave = () => {
    onUpdate(editedStory);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedStory(story);
    setIsEditing(false);
  };

  const handleStatusChange = (status: UserStory['status']) => {
    onUpdate({ status });
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(story.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([story.markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const statusColors = {
    backlog: 'bg-gray-500/20 text-gray-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-widget-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-widget-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedStory.title}
                  onChange={(e) =>
                    setEditedStory({ ...editedStory, title: e.target.value })
                  }
                  className="text-xl font-semibold bg-widget-bg px-3 py-1 rounded border border-widget-border w-full"
                />
              ) : (
                <h2 className="text-xl font-semibold text-widget-text-primary">
                  {story.title}
                </h2>
              )}

              <div className="flex items-center gap-3 mt-3">
                {/* Status Badge */}
                <div className="relative group">
                  <span
                    className={`px-3 py-1 text-sm rounded cursor-pointer ${
                      statusColors[story.status]
                    }`}
                  >
                    {story.status.replace('_', ' ')}
                  </span>
                  {!isEditing && (
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-widget-surface border border-widget-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                      <button
                        onClick={() => handleStatusChange('backlog')}
                        className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
                      >
                        <Archive className="w-3 h-3" />
                        Backlog
                      </button>
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
                      >
                        <Clock className="w-3 h-3" />
                        In Progress
                      </button>
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="w-full px-3 py-2 text-left text-sm text-widget-text-primary hover:bg-widget-bg flex items-center gap-2"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </button>
                    </div>
                  )}
                </div>

                {/* Priority Badge */}
                {story.priority && (
                  <span
                    className={`px-3 py-1 text-sm rounded border ${
                      priorityColors[story.priority]
                    }`}
                  >
                    {story.priority} priority
                  </span>
                )}

                {/* Created Date */}
                <span className="text-sm text-widget-text-secondary">
                  Created {new Date(story.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-widget-text-secondary hover:text-widget-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-2 text-white bg-widget-accent-start hover:bg-widget-accent-end rounded"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-widget-text-secondary hover:text-widget-text-primary"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCopyMarkdown}
                    className="p-2 text-widget-text-secondary hover:text-widget-text-primary"
                    title="Copy as Markdown"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="p-2 text-widget-text-secondary hover:text-widget-text-primary"
                    title="Export as Markdown"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowPromptGenerator(true)}
                    className="p-2 text-widget-text-secondary hover:text-widget-accent-start"
                    title="Generate AI Prompts"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-widget-text-secondary hover:text-widget-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Story Statement */}
          <div>
            <h3 className="text-sm font-medium text-widget-text-secondary mb-2">
              User Story
            </h3>
            {isEditing ? (
              <input
                type="text"
                value={editedStory.userStatement}
                onChange={(e) =>
                  setEditedStory({ ...editedStory, userStatement: e.target.value })
                }
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg"
              />
            ) : (
              <p className="text-widget-text-primary bg-widget-bg p-3 rounded-lg">
                {story.userStatement}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-widget-text-secondary mb-2">
              Description
            </h3>
            {isEditing ? (
              <textarea
                value={editedStory.description}
                onChange={(e) =>
                  setEditedStory({ ...editedStory, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg resize-none"
                rows={6}
              />
            ) : (
              <div className="text-widget-text-primary bg-widget-bg p-3 rounded-lg whitespace-pre-wrap">
                {story.description}
              </div>
            )}
          </div>

          {/* Acceptance Criteria */}
          <div>
            <h3 className="text-sm font-medium text-widget-text-secondary mb-2">
              Acceptance Criteria
            </h3>
            {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 ? (
              <div className="space-y-2">
                {story.acceptanceCriteria.map((criteria, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-widget-bg rounded-lg"
                  >
                    <div className="mt-0.5">
                      <div className="w-5 h-5 rounded border-2 border-widget-border" />
                    </div>
                    <p className="text-widget-text-primary flex-1">{criteria}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-widget-text-secondary bg-widget-bg p-3 rounded-lg">
                No acceptance criteria defined
              </p>
            )}
          </div>

          {/* External Reference */}
          {story.externalRef && (
            <div>
              <h3 className="text-sm font-medium text-widget-text-secondary mb-2">
                External Reference
              </h3>
              <p className="text-widget-text-primary bg-widget-bg p-3 rounded-lg">
                {story.externalRef}
              </p>
            </div>
          )}

          {/* Markdown Preview */}
          <div>
            <h3 className="text-sm font-medium text-widget-text-secondary mb-2">
              Markdown Export Preview
            </h3>
            <pre className="text-widget-text-primary bg-widget-bg p-4 rounded-lg overflow-x-auto text-sm">
              {story.markdownContent}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-widget-border flex justify-between">
          <div className="flex items-center gap-2 text-sm text-widget-text-secondary">
            <AlertCircle className="w-4 h-4" />
            <span>Last updated {new Date(story.updatedAt).toLocaleDateString()}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-widget-bg text-widget-text-primary rounded-lg hover:bg-widget-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Prompt Pack Generator Modal */}
      {showPromptGenerator && (
        <PromptPackGenerator
          project={project}
          story={story}
          onGenerated={(promptPack) => {
            console.log('Prompt pack generated:', promptPack);
            // Optionally show success message or update UI
          }}
          onClose={() => setShowPromptGenerator(false)}
        />
      )}
    </div>
  );
}