'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WorkflowProject } from '@/types/workflow';

interface CreateProjectModalProps {
  externalId: string;
  onClose: () => void;
  onCreate: (project: Partial<WorkflowProject>) => void;
}

export default function CreateProjectModal({
  externalId,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repositoryUrl: '',
    repositoryType: 'github',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        ...formData,
        externalId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-widget-surface rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-widget-text-primary">
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="text-widget-text-secondary hover:text-widget-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-widget-text-primary mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
              placeholder="My Awesome Project"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-widget-text-primary mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start resize-none"
              placeholder="Brief description of your project..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-widget-text-primary mb-2">
              Repository URL
            </label>
            <input
              type="url"
              value={formData.repositoryUrl}
              onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
              className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
              placeholder="https://github.com/user/repo"
            />
          </div>

          {formData.repositoryUrl && (
            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                Repository Type
              </label>
              <select
                value={formData.repositoryType}
                onChange={(e) => setFormData({ ...formData, repositoryType: e.target.value })}
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">Bitbucket</option>
                <option value="azure">Azure DevOps</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}