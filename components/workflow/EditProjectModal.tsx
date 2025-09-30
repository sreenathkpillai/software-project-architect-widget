'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WorkflowProject } from '@/types/workflow';

interface EditProjectModalProps {
  project: WorkflowProject;
  onClose: () => void;
  onUpdate: (updates: Partial<WorkflowProject>) => void;
}

export default function EditProjectModal({
  project,
  onClose,
  onUpdate,
}: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    repositoryUrl: project.repositoryUrl || '',
    repositoryType: project.repositoryType || 'github',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate({
        id: project.id,
        ...formData,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-lg max-w-md w-full p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Edit Project
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 backdrop-blur-sm"
              placeholder="My Awesome Project"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 resize-none backdrop-blur-sm"
              placeholder="Brief description of your project..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Repository URL (Optional)
            </label>
            <input
              type="url"
              value={formData.repositoryUrl}
              onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 backdrop-blur-sm"
              placeholder="https://github.com/user/repo"
            />
          </div>

          {formData.repositoryUrl && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Repository Type
              </label>
              <select
                value={formData.repositoryType}
                onChange={(e) => setFormData({ ...formData, repositoryType: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 backdrop-blur-sm"
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
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 shadow-lg"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}