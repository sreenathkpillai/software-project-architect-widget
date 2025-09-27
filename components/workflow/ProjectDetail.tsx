'use client';

import React from 'react';
import { WorkflowProject } from '@/types/workflow';
import { ArrowLeft, GitBranch, FileText, Settings } from 'lucide-react';
import StoryManager from './StoryManager';
import RepositorySettings from './RepositorySettings';

interface ProjectDetailProps {
  project: WorkflowProject;
  externalId: string;
  onBack: () => void;
  onUpdate?: (updates: Partial<WorkflowProject>) => void;
}

export default function ProjectDetail({
  project,
  externalId,
  onBack,
  onUpdate,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = React.useState<'stories' | 'docs' | 'repository' | 'settings'>('stories');

  return (
    <div className="min-h-screen bg-widget-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-widget-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-widget-text-secondary" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-widget-text-primary">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-widget-text-secondary mt-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project.repositoryUrl && (
              <div className="flex items-center gap-2 px-3 py-1 bg-widget-surface rounded-lg">
                <GitBranch className="w-4 h-4 text-widget-text-secondary" />
                <span className="text-sm text-widget-text-secondary">
                  {project.repositoryType || 'Repository'}
                </span>
              </div>
            )}
            {project.architectSessionId && (
              <button
                onClick={() => window.open(`/widget?sessionId=${project.architectSessionId}&mode=documents`, '_blank')}
                className="flex items-center gap-2 px-3 py-1 bg-widget-surface rounded-lg hover:bg-widget-border transition-colors"
                title="View original Architect session"
              >
                <FileText className="w-4 h-4 text-widget-text-secondary" />
                <span className="text-sm text-widget-text-secondary">
                  View Architect Session
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b border-widget-border mb-6">
          <button
            onClick={() => setActiveTab('stories')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'stories'
                ? 'text-widget-accent-start border-widget-accent-start'
                : 'text-widget-text-secondary border-transparent hover:text-widget-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            User Stories
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'docs'
                ? 'text-widget-accent-start border-widget-accent-start'
                : 'text-widget-text-secondary border-transparent hover:text-widget-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            Working Docs
          </button>
          <button
            onClick={() => setActiveTab('repository')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'repository'
                ? 'text-widget-accent-start border-widget-accent-start'
                : 'text-widget-text-secondary border-transparent hover:text-widget-text-primary'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Repository
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'text-widget-accent-start border-widget-accent-start'
                : 'text-widget-text-secondary border-transparent hover:text-widget-text-primary'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-widget-surface rounded-lg p-6 min-h-[600px]">
          {activeTab === 'stories' && (
            <StoryManager project={project} externalId={externalId} />
          )}

          {activeTab === 'docs' && (
            <div>
              <h2 className="text-xl font-semibold text-widget-text-primary mb-4">
                Working Documentation
              </h2>
              {project.workingDoc ? (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-widget-text-secondary">
                    {project.workingDoc}
                  </pre>
                </div>
              ) : (
                <p className="text-widget-text-secondary">
                  No working documentation available. Import from Architect or add documentation manually.
                </p>
              )}
            </div>
          )}

          {activeTab === 'repository' && (
            <RepositorySettings
              project={project}
              externalId={externalId}
              onUpdate={(updates) => onUpdate?.(updates)}
            />
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold text-widget-text-primary mb-4">
                Project Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-widget-text-primary mb-2">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={project.repositoryUrl || ''}
                    className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                    readOnly
                  />
                </div>
                {project.architectSessionId && (
                  <div>
                    <label className="block text-sm font-medium text-widget-text-primary mb-2">
                      Architect Session
                    </label>
                    <input
                      type="text"
                      value={project.architectSessionId}
                      className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                      readOnly
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}