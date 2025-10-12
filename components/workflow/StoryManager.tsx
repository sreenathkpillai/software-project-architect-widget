'use client';

import React, { useState } from 'react';
import { useWorkflow } from './WorkflowApp';
import CreateStoryModal from './CreateStoryModal';
import StoryCard from './StoryCard';
import PromptPackGenerator from './PromptPackGenerator';
import PromptPackViewer from './PromptPackViewer';
import DeleteConfirmModal from './DeleteConfirmModal';

interface StoryManagerProps {
  projectId: string;
  stories: any[];
  analysis: any;
  onStoriesChange: () => void;
}

export default function StoryManager({
  projectId,
  stories,
  analysis,
  onStoriesChange
}: StoryManagerProps) {
  const { externalId } = useWorkflow();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [storyPromptPacks, setStoryPromptPacks] = useState<Record<string, boolean>>({});
  const [editingStory, setEditingStory] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteStoryModal, setDeleteStoryModal] = useState<{ show: boolean; story: any | null }>({
    show: false,
    story: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Check for existing prompt packs when stories change
  React.useEffect(() => {
    checkPromptPacks();
  }, [stories, externalId]);

  const checkPromptPacks = async () => {
    const promptPackStatus: Record<string, boolean> = {};

    await Promise.all(stories.map(async (story) => {
      try {
        const response = await fetch(`/widget/api/workflow/stories/${story.id}/prompt-packs?externalId=${externalId}`);
        if (response.ok) {
          const data = await response.json();
          promptPackStatus[story.id] = data.promptPacks.length > 0;
        }
      } catch (error) {
        console.error(`Failed to check prompt packs for story ${story.id}:`, error);
        promptPackStatus[story.id] = false;
      }
    }));

    setStoryPromptPacks(promptPackStatus);
  };

  const handleDeleteStory = async () => {
    if (!deleteStoryModal.story) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/widget/api/workflow/stories/${deleteStoryModal.story.id}?externalId=${externalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onStoriesChange();
        setDeleteStoryModal({ show: false, story: null });
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePrompt = (story: any) => {
    setSelectedStory(story);
    setShowPromptGenerator(true);
  };

  const handleViewPromptPack = (story: any) => {
    setSelectedStory(story);
    setShowPromptViewer(true);
  };

  const handleSaveStory = async () => {
    if (!editingStory) return;

    try {
      const response = await fetch(`/widget/api/workflow/stories/${editingStory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId,
          title: editForm.title,
          description: editForm.description,
          acceptanceCriteria: editForm.acceptanceCriteria,
          priority: editForm.priority,
          storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : null
        }),
      });

      if (response.ok) {
        setEditingStory(null);
        setEditForm({});
        onStoriesChange();
      }
    } catch (error) {
      console.error('Failed to update story:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Stories</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          Add Story
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {stories.length === 0 ? (
          <div className="text-center py-12">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-200">No stories yet</h3>
            <p className="mt-1 text-sm text-gray-400">
              Create your first story to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Create Story
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onDelete={() => setDeleteStoryModal({ show: true, story })}
                onGeneratePrompt={() => handleGeneratePrompt(story)}
                onViewPromptPack={() => handleViewPromptPack(story)}
                hasPromptPack={storyPromptPacks[story.id] || false}
                onClick={() => {
                  setEditingStory(story);
                  setEditForm({
                    title: story.title,
                    description: story.description || '',
                    acceptanceCriteria: story.acceptanceCriteria || '',
                    priority: story.priority,
                    storyPoints: story.storyPoints || ''
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateStoryModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            onStoriesChange();
          }}
        />
      )}

      {showPromptGenerator && selectedStory && (
        <PromptPackGenerator
          story={selectedStory}
          analysis={analysis}
          onClose={() => {
            setShowPromptGenerator(false);
            setSelectedStory(null);
          }}
          onGenerated={() => {
            onStoriesChange();
            checkPromptPacks(); // Refresh prompt pack status
          }}
        />
      )}

      {showPromptViewer && selectedStory && (
        <PromptPackViewer
          story={selectedStory}
          analysis={analysis}
          onClose={() => {
            setShowPromptViewer(false);
            setSelectedStory(null);
          }}
          onRegenerated={() => {
            onStoriesChange();
            checkPromptPacks(); // Refresh prompt pack status
          }}
        />
      )}

      {editingStory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Edit Story</h2>
              <button
                onClick={() => {
                  setEditingStory(null);
                  setEditForm({});
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Acceptance Criteria</label>
                <textarea
                  value={editForm.acceptanceCriteria || ''}
                  onChange={(e) => setEditForm({ ...editForm, acceptanceCriteria: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter acceptance criteria..."
                />
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                  <select
                    value={editForm.priority || 'MEDIUM'}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Story Points</label>
                  <input
                    type="number"
                    value={editForm.storyPoints || ''}
                    onChange={(e) => setEditForm({ ...editForm, storyPoints: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="1, 2, 3, 5, 8..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setEditingStory(null);
                    setEditForm({});
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveStory}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteStoryModal.show}
        onClose={() => setDeleteStoryModal({ show: false, story: null })}
        onConfirm={handleDeleteStory}
        title="Delete Story"
        message="Are you sure you want to delete this story? Any associated prompt packs will also be deleted."
        itemName={deleteStoryModal.story?.title}
        isDeleting={isDeleting}
      />
    </div>
  );
}