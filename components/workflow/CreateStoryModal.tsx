'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { UserStory } from '@/types/workflow';

interface CreateStoryModalProps {
  projectId: string;
  onClose: () => void;
  onCreate: (story: Partial<UserStory>) => void;
}

export default function CreateStoryModal({
  projectId,
  onClose,
  onCreate,
}: CreateStoryModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    userStatement: '',
    description: '',
    acceptanceCriteria: [''],
    priority: 'medium' as 'high' | 'medium' | 'low',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'template'>('manual');

  const handleAddCriteria = () => {
    setFormData({
      ...formData,
      acceptanceCriteria: [...formData.acceptanceCriteria, ''],
    });
  };

  const handleRemoveCriteria = (index: number) => {
    setFormData({
      ...formData,
      acceptanceCriteria: formData.acceptanceCriteria.filter((_, i) => i !== index),
    });
  };

  const handleCriteriaChange = (index: number, value: string) => {
    const newCriteria = [...formData.acceptanceCriteria];
    newCriteria[index] = value;
    setFormData({ ...formData, acceptanceCriteria: newCriteria });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.userStatement.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        ...formData,
        acceptanceCriteria: formData.acceptanceCriteria.filter(c => c.trim()),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (template: string) => {
    switch (template) {
      case 'feature':
        setFormData({
          title: 'Add [Feature Name]',
          userStatement: 'As a [user type], I want [goal], so that [benefit]',
          description: 'Implement a new feature that allows users to...',
          acceptanceCriteria: [
            'Feature is accessible from [location]',
            'Users can [primary action]',
            'Data is validated before [action]',
            'Success/error messages are displayed appropriately',
            'Feature works on all supported browsers',
          ],
          priority: 'medium',
        });
        break;
      case 'bug':
        setFormData({
          title: 'Fix [Bug Description]',
          userStatement: 'As a user, I want [issue] to be fixed, so that [impact]',
          description: 'Current behavior: \n\nExpected behavior: \n\nSteps to reproduce:\n1. ',
          acceptanceCriteria: [
            'Bug no longer occurs under described conditions',
            'Fix does not break existing functionality',
            'Unit tests are added to prevent regression',
          ],
          priority: 'high',
        });
        break;
      case 'improvement':
        setFormData({
          title: 'Improve [Component/Feature]',
          userStatement: 'As a [user type], I want [improvement], so that [benefit]',
          description: 'Current state: \n\nProposed improvement: ',
          acceptanceCriteria: [
            'Performance is improved by [metric]',
            'User experience is enhanced',
            'Backward compatibility is maintained',
          ],
          priority: 'low',
        });
        break;
    }
    setActiveTab('manual');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-widget-surface rounded-lg max-w-3xl w-full my-8">
        <div className="p-6 border-b border-widget-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-widget-text-primary">
              Create User Story
            </h2>
            <button
              onClick={onClose}
              className="text-widget-text-secondary hover:text-widget-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'text-widget-accent-start border-widget-accent-start'
                  : 'text-widget-text-secondary border-transparent hover:text-widget-text-primary'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === 'template'
                  ? 'text-widget-accent-start border-widget-accent-start'
                  : 'text-widget-text-secondary border-transparent hover:text-widget-text-primary'
              }`}
            >
              Use Template
            </button>
          </div>
        </div>

        {activeTab === 'template' ? (
          <div className="p-6">
            <p className="text-widget-text-secondary mb-4">
              Choose a template to quickly create a user story:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => applyTemplate('feature')}
                className="p-4 bg-widget-bg rounded-lg hover:bg-widget-border transition-colors text-left"
              >
                <h3 className="font-medium text-widget-text-primary mb-2">
                  Feature Story
                </h3>
                <p className="text-sm text-widget-text-secondary">
                  For new features and functionality
                </p>
              </button>
              <button
                onClick={() => applyTemplate('bug')}
                className="p-4 bg-widget-bg rounded-lg hover:bg-widget-border transition-colors text-left"
              >
                <h3 className="font-medium text-widget-text-primary mb-2">
                  Bug Fix
                </h3>
                <p className="text-sm text-widget-text-secondary">
                  For fixing issues and bugs
                </p>
              </button>
              <button
                onClick={() => applyTemplate('improvement')}
                className="p-4 bg-widget-bg rounded-lg hover:bg-widget-border transition-colors text-left"
              >
                <h3 className="font-medium text-widget-text-primary mb-2">
                  Improvement
                </h3>
                <p className="text-sm text-widget-text-secondary">
                  For enhancements and optimizations
                </p>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                Story Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
                placeholder="Brief, descriptive title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                User Story Statement *
              </label>
              <input
                type="text"
                value={formData.userStatement}
                onChange={(e) =>
                  setFormData({ ...formData, userStatement: e.target.value })
                }
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
                placeholder="As a [user type], I want [goal], so that [benefit]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start resize-none"
                placeholder="Detailed description of the story..."
                rows={4}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-widget-text-primary">
                  Acceptance Criteria
                </label>
                <button
                  type="button"
                  onClick={handleAddCriteria}
                  className="text-sm text-widget-accent-start hover:text-widget-accent-end flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Criteria
                </button>
              </div>
              <div className="space-y-2">
                {formData.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => handleCriteriaChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
                      placeholder="Enter acceptance criteria..."
                    />
                    {formData.acceptanceCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCriteria(index)}
                        className="p-2 text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'high' | 'medium' | 'low',
                  })
                }
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

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
                disabled={
                  isSubmitting ||
                  !formData.title.trim() ||
                  !formData.userStatement.trim()
                }
              >
                {isSubmitting ? 'Creating...' : 'Create Story'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}