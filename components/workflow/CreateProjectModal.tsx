'use client';

import React, { useState } from 'react';
import { useWorkflow } from './WorkflowApp';
import RepositoryConnector from './RepositoryConnector';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateProjectModal({ onClose, onCreated }: CreateProjectModalProps) {
  const { externalId } = useWorkflow();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [showRepositoryConnector, setShowRepositoryConnector] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/widget/api/workflow/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          externalId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      setCreatedProjectId(data.project.id);
      setShowRepositoryConnector(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepositoryConnected = () => {
    setShowRepositoryConnector(false);
    onCreated();
    onClose();
  };

  const handleSkipRepository = () => {
    setShowRepositoryConnector(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Project</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Project Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Brief description of your project"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>

      {showRepositoryConnector && createdProjectId && (
        <RepositoryConnector
          projectId={createdProjectId}
          project={null}
          onClose={handleSkipRepository}
          onConnected={handleRepositoryConnected}
        />
      )}
    </div>
  );
}