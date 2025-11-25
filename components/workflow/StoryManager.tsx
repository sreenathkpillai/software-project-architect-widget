'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';
import CreateStoryPanel from './CreateStoryPanel';
import StoryCard from './StoryCard';
import EditStoryPanel from './EditStoryPanel';
import PromptPackGeneratorPanel from './PromptPackGeneratorPanel';
import PromptPackViewerPanel from './PromptPackViewerPanel';
import DeleteConfirmModal from './DeleteConfirmModal';

type ViewState = 'list' | 'create' | 'edit' | 'generate-prompt' | 'view-prompt';

interface StoryManagerProps {
  projectId: string;
  stories: any[];
  analysis: any;
  onStoriesChange: () => void;
  onPanelExpand?: (expanded: boolean) => void;
}

export default function StoryManager({
  projectId,
  stories,
  analysis,
  onStoriesChange,
  onPanelExpand
}: StoryManagerProps) {
  const { externalId } = useWorkflow();
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [storyPromptPacks, setStoryPromptPacks] = useState<Record<string, boolean>>({});
  const [deleteStoryModal, setDeleteStoryModal] = useState<{ show: boolean; story: any | null }>({
    show: false,
    story: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Check for existing prompt packs when stories change
  useEffect(() => {
    checkPromptPacks();
  }, [stories, externalId]);

  // Notify parent about expansion state (handled by individual panels via onExpand callback)
  // This effect is no longer needed as each panel handles its own expansion

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
        // If we were viewing this story, go back to list
        if (selectedStory?.id === deleteStoryModal.story.id) {
          setViewState('list');
          setSelectedStory(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditStory = (story: any) => {
    setSelectedStory(story);
    setViewState('edit');
  };

  const handleGeneratePrompt = (story: any) => {
    setSelectedStory(story);
    setViewState('generate-prompt');
  };

  const handleViewPromptPack = (story: any) => {
    setSelectedStory(story);
    setViewState('view-prompt');
  };

  const handleBackToList = () => {
    setViewState('list');
    setSelectedStory(null);
  };

  const handleCreatePanel = () => {
    setViewState('create');
    setSelectedStory(null);
  };

  const handlePanelExpand = (expanded: boolean) => {
    onPanelExpand?.(expanded);
  };

  // Render based on view state
  if (viewState === 'create') {
    return (
      <CreateStoryPanel
        projectId={projectId}
        onClose={handleBackToList}
        onCreated={() => {
          handleBackToList();
          onStoriesChange();
        }}
        onExpand={handlePanelExpand}
      />
    );
  }

  if (viewState === 'edit' && selectedStory) {
    return (
      <EditStoryPanel
        projectId={projectId}
        story={selectedStory}
        onClose={handleBackToList}
        onSaved={() => {
          handleBackToList();
          onStoriesChange();
        }}
        onDelete={() => {
          setDeleteStoryModal({ show: true, story: selectedStory });
        }}
        onExpand={handlePanelExpand}
      />
    );
  }

  if (viewState === 'generate-prompt' && selectedStory) {
    return (
      <PromptPackGeneratorPanel
        story={selectedStory}
        analysis={analysis}
        onClose={handleBackToList}
        onGenerated={() => {
          onStoriesChange();
          checkPromptPacks();
        }}
      />
    );
  }

  if (viewState === 'view-prompt' && selectedStory) {
    return (
      <PromptPackViewerPanel
        story={selectedStory}
        analysis={analysis}
        onClose={handleBackToList}
        onRegenerated={() => {
          onStoriesChange();
          checkPromptPacks();
        }}
        onExpand={handlePanelExpand}
      />
    );
  }

  // Default: List view
  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">Stories</h3>
        <button
          onClick={handleCreatePanel}
          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          Add Story
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 min-h-0">
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
              onClick={handleCreatePanel}
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
                onClick={() => handleEditStory(story)}
              />
            ))}
          </div>
        )}
      </div>

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
