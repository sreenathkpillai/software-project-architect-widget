'use client';

import React, { useState } from 'react';
import { useWorkflow } from './WorkflowApp';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ProjectCardProps {
  project: any;
  onClick: () => void;
  onRefresh: () => void;
}

export default function ProjectCard({ project, onClick, onRefresh }: ProjectCardProps) {
  const { externalId } = useWorkflow();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/widget/api/workflow/projects/${project.id}?externalId=${externalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsDeleted(true);
        setShowDeleteModal(false);
        // Add a small delay to ensure the modal closes and UI updates before refresh
        setTimeout(() => {
          onRefresh();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'ANALYZING':
        return 'bg-blue-500';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleCardClick = () => {
    if (!isDeleting && !isDeleted) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 transition-all duration-200 ${
        isDeleting || isDeleted
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-purple-400/40 hover:bg-gray-800/60 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
          {project.description && (
            <p className="mt-1 text-sm text-gray-400">{project.description}</p>
          )}
        </div>
        <button
          onClick={handleDeleteClick}
          className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center space-x-4 text-sm text-gray-400">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(project.analysisStatus)}`}></div>
          {project.analysisStatus}
        </div>
        {project._count && (
          <>
            <div>{project._count.stories} stories</div>
            <div>{project._count.promptPacks} packs</div>
          </>
        )}
      </div>

      {project.repositoryUrl && (
        <div className="mt-3 text-xs text-gray-500 truncate">
          {project.repositoryUrl}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? All associated stories and prompt packs will also be deleted."
        itemName={project.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}