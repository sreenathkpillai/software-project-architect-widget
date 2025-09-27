'use client';

import React, { useState } from 'react';
import { WorkflowProject } from '@/types/workflow';
import { PlusIcon, FolderIcon, RefreshCwIcon, FileText } from 'lucide-react';
import CreateProjectModal from './CreateProjectModal';

interface ProjectDashboardProps {
  projects: WorkflowProject[];
  externalId: string;
  onCreateProject: (project: Partial<WorkflowProject>) => void;
  onSelectProject: (project: WorkflowProject) => void;
  onRefresh: () => void;
}

export default function ProjectDashboard({
  projects,
  externalId,
  onCreateProject,
  onSelectProject,
  onRefresh,
}: ProjectDashboardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen bg-widget-bg p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-widget-text-primary">
              Workflow Projects
            </h1>
            <p className="text-widget-text-secondary mt-2">
              Manage your development workflows and user stories
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-widget-surface text-widget-text-secondary hover:text-widget-text-primary rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCwIcon className="w-4 h-4" />
              Refresh
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => window.open('/widget?mode=documents', '_blank')}
                className="px-4 py-2 bg-widget-surface text-widget-text-secondary hover:text-widget-text-primary rounded-lg transition-colors flex items-center gap-2 border border-widget-border"
                title="Open Architect Widget"
              >
                <FileText className="w-4 h-4" />
                Architect
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="bg-widget-surface rounded-lg p-12 text-center">
            <FolderIcon className="w-16 h-16 text-widget-text-secondary mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-widget-text-primary mb-2">
              No projects yet
            </h2>
            <p className="text-widget-text-secondary mb-6">
              Create your first workflow project to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onSelectProject(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          externalId={externalId}
          onClose={() => setShowCreateModal(false)}
          onCreate={(projectData) => {
            onCreateProject(projectData);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: WorkflowProject;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const storyCount = project.stories?.length || 0;
  const hasRepository = !!project.repositoryUrl;
  const fromArchitect = !!project.architectSessionId;

  return (
    <div
      onClick={onClick}
      className="bg-widget-surface rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer border border-widget-border hover:border-widget-accent-start"
    >
      <div className="flex items-start justify-between mb-4">
        <FolderIcon className="w-8 h-8 text-widget-accent-start" />
        {fromArchitect && (
          <span className="text-xs bg-widget-accent-start/20 text-widget-accent-start px-2 py-1 rounded">
            From Architect
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-widget-text-primary mb-2">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-widget-text-secondary text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-widget-text-secondary">
            {storyCount} {storyCount === 1 ? 'story' : 'stories'}
          </span>
          {hasRepository && (
            <span className="text-widget-text-secondary">
              {project.repositoryType || 'Repository'}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-widget-text-secondary">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}