'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';
import StoryOptimizerChat from './StoryOptimizerChat';
import StoryPreview from './StoryPreview';

interface StoryVersion {
  id: string;
  version: number;
  title: string;
  description: string;
  acceptanceCriteria: string | null;
  priority: string;
  storyPoints: number | null;
  isOriginal: boolean;
  isActive: boolean;
  createdAt: string;
}

interface OptimizedStory {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  storyPoints?: number;
  changes: {
    field: string;
    original: string;
    optimized: string;
    reason: string;
  }[];
}

interface EditStoryPanelProps {
  projectId: string;
  story: any;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
  onExpand?: (expanded: boolean) => void;
}

type EditPhase = 'edit' | 'chat' | 'preview' | 'history';

export default function EditStoryPanel({
  projectId,
  story,
  onClose,
  onSaved,
  onDelete,
  onExpand,
}: EditStoryPanelProps) {
  const { externalId } = useWorkflow();
  const [editForm, setEditForm] = useState({
    title: story.title || '',
    description: story.description || '',
    acceptanceCriteria: story.acceptanceCriteria || '',
    priority: story.priority || 'MEDIUM',
    storyPoints: story.storyPoints?.toString() || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [phase, setPhase] = useState<EditPhase>('edit');

  // Optimization state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [optimizedStory, setOptimizedStory] = useState<OptimizedStory | null>(null);
  const [selectedOptimizations, setSelectedOptimizations] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    setEditForm({
      title: story.title || '',
      description: story.description || '',
      acceptanceCriteria: story.acceptanceCriteria || '',
      priority: story.priority || 'MEDIUM',
      storyPoints: story.storyPoints?.toString() || '',
    });
  }, [story]);

  // Notify parent about expansion state
  useEffect(() => {
    onExpand?.(phase === 'chat' || phase === 'preview');
  }, [phase, onExpand]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/widget/api/workflow/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId,
          title: editForm.title,
          description: editForm.description,
          acceptanceCriteria: editForm.acceptanceCriteria,
          priority: editForm.priority,
          storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : null,
        }),
      });

      if (response.ok) {
        // Save version if we applied optimizations
        if (optimizedStory && Object.values(selectedOptimizations).some(v => v)) {
          await fetch(`/widget/api/workflow/stories/${story.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              externalId,
              storyData: {
                title: editForm.title,
                description: editForm.description,
                acceptanceCriteria: editForm.acceptanceCriteria,
                priority: editForm.priority,
                storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : null,
              },
              isOriginal: false,
              isActive: true,
              optimizationContext: {
                conversation,
                selectedOptimizations,
                analysisResult,
              },
            }),
          });
        }
        onSaved();
      }
    } catch (error) {
      console.error('Failed to update story:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptimize = async () => {
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/widget/api/workflow/stories/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          storyInput: {
            title: editForm.title,
            description: editForm.description,
            acceptanceCriteria: editForm.acceptanceCriteria,
            priority: editForm.priority,
            storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : undefined,
          },
          externalId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze story');
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);

      if (data.analysis.hasGaps && data.analysis.questions.length > 0) {
        setPhase('chat');
      } else {
        await generatePreview([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze story');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePreview = async (conversationMessages: { role: 'user' | 'assistant'; content: string }[]) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('/widget/api/workflow/stories/optimize/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          storyInput: {
            title: editForm.title,
            description: editForm.description,
            acceptanceCriteria: editForm.acceptanceCriteria,
            priority: editForm.priority,
            storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : undefined,
          },
          conversation: conversationMessages,
          externalId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate optimized story');
      }

      const data = await response.json();
      setOptimizedStory(data.optimizedStory);

      const defaultSelections: Record<string, boolean> = {};
      data.optimizedStory.changes.forEach((change: any) => {
        defaultSelections[change.field] = true;
      });
      setSelectedOptimizations(defaultSelections);

      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatComplete = (messages: { role: 'user' | 'assistant'; content: string }[]) => {
    setConversation(messages);
    generatePreview(messages);
  };

  const handleApplyOptimizations = () => {
    if (!optimizedStory) return;

    const newForm = { ...editForm };

    if (selectedOptimizations.title) {
      newForm.title = optimizedStory.title;
    }
    if (selectedOptimizations.description) {
      newForm.description = optimizedStory.description;
    }
    if (selectedOptimizations.acceptanceCriteria) {
      newForm.acceptanceCriteria = optimizedStory.acceptanceCriteria;
    }
    if (selectedOptimizations.priority) {
      newForm.priority = optimizedStory.priority;
    }
    if (selectedOptimizations.storyPoints && optimizedStory.storyPoints) {
      newForm.storyPoints = optimizedStory.storyPoints.toString();
    }

    setEditForm(newForm);
    setPhase('edit');
    setOptimizedStory(null);
    setAnalysisResult(null);
    setConversation([]);
  };

  const handleCancelOptimization = () => {
    setPhase('edit');
    setOptimizedStory(null);
    setAnalysisResult(null);
    setConversation([]);
  };

  const handleVersionRestore = (version: StoryVersion) => {
    setEditForm({
      title: version.title,
      description: version.description || '',
      acceptanceCriteria: version.acceptanceCriteria || '',
      priority: version.priority,
      storyPoints: version.storyPoints?.toString() || '',
    });
    setPhase('edit');
    onSaved();
  };

  if (phase === 'history') {
    return (
      <StoryVersionHistoryPanel
        storyId={story.id}
        onRestore={handleVersionRestore}
        onClose={() => setPhase('edit')}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">
          {phase === 'edit' && 'Edit Story'}
          {phase === 'chat' && 'Optimize Story'}
          {phase === 'preview' && 'Review Optimizations'}
        </h3>
        <div className="flex items-center gap-2">
          {phase === 'edit' && (
            <button
              onClick={() => setPhase('history')}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded transition-colors flex items-center gap-1"
              title="View version history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* Form Section */}
        <div className={`${phase === 'edit' ? 'w-full' : phase === 'preview' ? 'w-1/3' : 'w-1/2'} p-4 overflow-y-auto transition-all duration-300`}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={phase !== 'edit'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={phase !== 'edit'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Acceptance Criteria</label>
              <textarea
                value={editForm.acceptanceCriteria}
                onChange={(e) => setEditForm({ ...editForm, acceptanceCriteria: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter acceptance criteria..."
                disabled={phase !== 'edit'}
              />
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={phase !== 'edit'}
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
                  value={editForm.storyPoints}
                  onChange={(e) => setEditForm({ ...editForm, storyPoints: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1, 2, 3, 5, 8..."
                  disabled={phase !== 'edit'}
                />
              </div>
            </div>

            {/* Analysis Score Display */}
            {analysisResult && phase === 'edit' && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Story Quality Score</div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Clarity</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${analysisResult.analysis?.clarity || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Completeness</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${analysisResult.analysis?.completeness || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Testability</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${analysisResult.analysis?.testability || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            {phase === 'edit' && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <button
                  onClick={onDelete}
                  className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                >
                  Delete Story
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    disabled={isSaving || isAnalyzing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOptimize}
                    disabled={isSaving || isAnalyzing || (!editForm.title && !editForm.description)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Optimize with AI
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || isAnalyzing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        {phase === 'chat' && analysisResult && (
          <div className="w-1/2 border-l border-gray-800 animate-slideIn">
            <StoryOptimizerChat
              projectId={projectId}
              storyInput={{
                title: editForm.title,
                description: editForm.description,
                acceptanceCriteria: editForm.acceptanceCriteria,
                priority: editForm.priority,
                storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : undefined,
              }}
              initialQuestions={analysisResult.questions}
              initialSuggestions={analysisResult.initialSuggestions}
              onComplete={handleChatComplete}
              onCancel={handleCancelOptimization}
              isGeneratingPreview={isAnalyzing}
            />
          </div>
        )}

        {/* Preview Section */}
        {phase === 'preview' && optimizedStory && (
          <div className="w-2/3 border-l border-gray-800 animate-slideIn">
            <StoryPreview
              originalStory={{
                title: editForm.title,
                description: editForm.description,
                acceptanceCriteria: editForm.acceptanceCriteria,
                priority: editForm.priority,
                storyPoints: editForm.storyPoints,
              }}
              optimizedStory={optimizedStory}
              selectedOptimizations={selectedOptimizations}
              onSelectionChange={setSelectedOptimizations}
              onApply={handleApplyOptimizations}
              onCancel={handleCancelOptimization}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Inline version history panel
function StoryVersionHistoryPanel({
  storyId,
  onRestore,
  onClose,
}: {
  storyId: string;
  onRestore: (version: StoryVersion) => void;
  onClose: () => void;
}) {
  const { externalId } = useWorkflow();
  const [versions, setVersions] = useState<StoryVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<StoryVersion | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [storyId, externalId]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(
        `/widget/api/workflow/stories/${storyId}/versions?externalId=${externalId}`
      );
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (version: StoryVersion) => {
    setIsRestoring(true);
    try {
      const response = await fetch(
        `/widget/api/workflow/stories/${storyId}/versions/${version.id}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ externalId }),
        }
      );

      if (response.ok) {
        onRestore(version);
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-white">Version History</h3>
          <p className="text-sm text-gray-400">
            {versions.length} version{versions.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Version List */}
          <div className="w-1/3 border-r border-gray-800 overflow-y-auto">
            {versions.length === 0 ? (
              <div className="p-6 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-400">No version history yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-800/50 transition-colors ${
                      selectedVersion?.id === version.id ? 'bg-purple-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        Version {version.version}
                      </span>
                      <div className="flex items-center gap-2">
                        {version.isOriginal && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                            Original
                          </span>
                        )}
                        {version.isActive && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(version.createdAt)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1 truncate">
                      {version.title}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version Detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedVersion ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Title
                  </label>
                  <p className="text-white">{selectedVersion.title}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <p className="text-gray-300 whitespace-pre-wrap text-sm">
                    {selectedVersion.description}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Acceptance Criteria
                  </label>
                  <p className="text-gray-300 whitespace-pre-wrap text-sm">
                    {selectedVersion.acceptanceCriteria || 'None specified'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Priority
                    </label>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        selectedVersion.priority === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400'
                          : selectedVersion.priority === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-400'
                          : selectedVersion.priority === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {selectedVersion.priority}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Story Points
                    </label>
                    <p className="text-gray-300">
                      {selectedVersion.storyPoints || 'Not set'}
                    </p>
                  </div>
                </div>

                {!selectedVersion.isActive && (
                  <button
                    onClick={() => handleRestore(selectedVersion)}
                    disabled={isRestoring}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isRestoring ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Restoring...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restore this version
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-400">
                    Select a version to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
