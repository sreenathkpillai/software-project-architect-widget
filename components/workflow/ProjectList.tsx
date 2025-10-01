'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflow } from './WorkflowApp';
import CreateProjectModal from './CreateProjectModal';
import ProjectCard from './ProjectCard';

export default function ProjectList() {
  const { projects, isLoading, externalId, refreshProjects } = useWorkflow();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const handleProjectClick = (projectId: string) => {
    router.push(`/workflow/projects/${projectId}?externalId=${externalId}`);
  };

  const handleProjectCreated = () => {
    setShowCreateModal(false);
    refreshProjects();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Projects</h2>
          <p className="mt-1 text-gray-400">
            Manage your software projects and generate implementation prompts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-200">No projects</h3>
          <p className="mt-1 text-sm text-gray-400">
            Get started by creating a new project.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project.id)}
              onRefresh={refreshProjects}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}