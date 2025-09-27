'use client';

import React, { useState, useEffect } from 'react';
import { UserStory, WorkflowProject } from '@/types/workflow';
import { Plus, LayoutGrid, List, Kanban, ChevronRight } from 'lucide-react';
import CreateStoryModal from './CreateStoryModal';
import StoryCard from './StoryCard';
import StoryDetail from './StoryDetail';
import { getApiUrl } from '@/lib/api-config';

interface StoryManagerProps {
  project: WorkflowProject;
  externalId: string;
}

type ViewMode = 'backlog' | 'board' | 'list';

export default function StoryManager({ project, externalId }: StoryManagerProps) {
  const [stories, setStories] = useState<UserStory[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('backlog');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null);

  useEffect(() => {
    fetchStories();
  }, [project.id]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        getApiUrl(`/api/workflow/stories?projectId=${project.id}`),
        {
          headers: {
            'x-external-id': externalId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const data = await response.json();
      setStories(data.stories || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async (storyData: Partial<UserStory>) => {
    try {
      const response = await fetch(getApiUrl('/api/workflow/stories'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': externalId,
        },
        body: JSON.stringify({
          ...storyData,
          projectId: project.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create story');
      }

      const newStory = await response.json();
      setStories([...stories, newStory]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating story:', error);
    }
  };

  const handleUpdateStory = async (storyId: string, updates: Partial<UserStory>) => {
    try {
      const response = await fetch(
        getApiUrl(`/api/workflow/stories/${storyId}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-external-id': externalId,
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update story');
      }

      const updatedStory = await response.json();
      setStories(stories.map(s => (s.id === storyId ? updatedStory : s)));
    } catch (error) {
      console.error('Error updating story:', error);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const response = await fetch(
        getApiUrl(`/api/workflow/stories/${storyId}`),
        {
          method: 'DELETE',
          headers: {
            'x-external-id': externalId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete story');
      }

      setStories(stories.filter(s => s.id !== storyId));
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  const groupedStories = {
    backlog: stories.filter(s => s.status === 'backlog'),
    in_progress: stories.filter(s => s.status === 'in_progress'),
    completed: stories.filter(s => s.status === 'completed'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-widget-text-secondary">Loading stories...</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-widget-text-primary">
            User Stories
          </h2>
          <span className="px-2 py-1 bg-widget-surface rounded text-sm text-widget-text-secondary">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-widget-surface rounded-lg p-1">
            <button
              onClick={() => setViewMode('backlog')}
              className={`p-2 rounded ${
                viewMode === 'backlog'
                  ? 'bg-widget-accent-start text-white'
                  : 'text-widget-text-secondary hover:text-widget-text-primary'
              }`}
              title="Backlog View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded ${
                viewMode === 'board'
                  ? 'bg-widget-accent-start text-white'
                  : 'text-widget-text-secondary hover:text-widget-text-primary'
              }`}
              title="Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-widget-accent-start text-white'
                  : 'text-widget-text-secondary hover:text-widget-text-primary'
              }`}
              title="List View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Story
          </button>
        </div>
      </div>

      {/* Stories Display */}
      {stories.length === 0 ? (
        <div className="bg-widget-surface rounded-lg p-12 text-center">
          <h3 className="text-lg font-semibold text-widget-text-primary mb-2">
            No stories yet
          </h3>
          <p className="text-widget-text-secondary mb-6">
            Create your first user story to start planning your implementation
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Create First Story
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'backlog' && (
            <BacklogView
              stories={stories}
              onSelectStory={setSelectedStory}
              onUpdateStory={handleUpdateStory}
              onDeleteStory={handleDeleteStory}
            />
          )}

          {viewMode === 'board' && (
            <BoardView
              groupedStories={groupedStories}
              onSelectStory={setSelectedStory}
              onUpdateStory={handleUpdateStory}
              onDeleteStory={handleDeleteStory}
            />
          )}

          {viewMode === 'list' && (
            <ListView
              stories={stories}
              onSelectStory={setSelectedStory}
              onUpdateStory={handleUpdateStory}
              onDeleteStory={handleDeleteStory}
            />
          )}
        </>
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <CreateStoryModal
          projectId={project.id}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateStory}
        />
      )}

      {/* Story Detail Modal */}
      {selectedStory && (
        <StoryDetail
          story={selectedStory}
          project={project}
          onClose={() => setSelectedStory(null)}
          onUpdate={(updates) => {
            handleUpdateStory(selectedStory.id, updates);
            setSelectedStory({ ...selectedStory, ...updates });
          }}
        />
      )}
    </div>
  );
}

// Backlog View Component
function BacklogView({
  stories,
  onSelectStory,
  onUpdateStory,
  onDeleteStory,
}: {
  stories: UserStory[];
  onSelectStory: (story: UserStory) => void;
  onUpdateStory: (id: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {stories.map((story, index) => (
        <div
          key={story.id}
          className="bg-widget-surface rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
          onClick={() => onSelectStory(story)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-widget-text-secondary text-sm">
                  #{index + 1}
                </span>
                <h3 className="font-medium text-widget-text-primary">
                  {story.title}
                </h3>
                {story.priority && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      story.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : story.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {story.priority}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    story.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : story.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {story.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-widget-text-secondary text-sm line-clamp-1">
                {story.userStatement}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-widget-text-secondary mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Board View Component
function BoardView({
  groupedStories,
  onSelectStory,
  onUpdateStory,
  onDeleteStory,
}: {
  groupedStories: Record<string, UserStory[]>;
  onSelectStory: (story: UserStory) => void;
  onUpdateStory: (id: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (id: string) => void;
}) {
  const columns = [
    { key: 'backlog', title: 'Backlog', color: 'gray' },
    { key: 'in_progress', title: 'In Progress', color: 'blue' },
    { key: 'completed', title: 'Completed', color: 'green' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {columns.map(column => (
        <div key={column.key} className="bg-widget-surface rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-widget-text-primary">
              {column.title}
            </h3>
            <span className="text-sm text-widget-text-secondary">
              {groupedStories[column.key].length}
            </span>
          </div>

          <div className="space-y-2">
            {groupedStories[column.key].map(story => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => onSelectStory(story)}
                onStatusChange={(status) =>
                  onUpdateStory(story.id, { status })
                }
                onDelete={() => onDeleteStory(story.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// List View Component
function ListView({
  stories,
  onSelectStory,
  onUpdateStory,
  onDeleteStory,
}: {
  stories: UserStory[];
  onSelectStory: (story: UserStory) => void;
  onUpdateStory: (id: string, updates: Partial<UserStory>) => void;
  onDeleteStory: (id: string) => void;
}) {
  return (
    <div className="bg-widget-surface rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-widget-bg">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-widget-text-secondary">
              Title
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-widget-text-secondary">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-widget-text-secondary">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-widget-text-secondary">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {stories.map(story => (
            <tr
              key={story.id}
              className="border-t border-widget-border hover:bg-widget-bg cursor-pointer"
              onClick={() => onSelectStory(story)}
            >
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-widget-text-primary">
                    {story.title}
                  </p>
                  <p className="text-sm text-widget-text-secondary line-clamp-1">
                    {story.userStatement}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    story.priority === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : story.priority === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {story.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    story.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : story.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {story.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-widget-text-secondary">
                {new Date(story.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}