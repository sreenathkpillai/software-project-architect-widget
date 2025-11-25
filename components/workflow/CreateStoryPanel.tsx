'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';
import StoryOptimizerChat from './StoryOptimizerChat';
import StoryPreview from './StoryPreview';
import parentComm from '../../lib/utils/parentCommunication';

interface CreateStoryPanelProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
  onExpand: (expanded: boolean) => void;
}

type OptimizationPhase = 'input' | 'chat' | 'preview';

interface StoryFormData {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  storyPoints: string;
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

export default function CreateStoryPanel({
  projectId,
  onClose,
  onCreated,
  onExpand,
}: CreateStoryPanelProps) {
  const { externalId } = useWorkflow();
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    description: '',
    acceptanceCriteria: '',
    priority: 'MEDIUM',
    storyPoints: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Optimization state
  const [optimizationPhase, setOptimizationPhase] = useState<OptimizationPhase>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [optimizedStory, setOptimizedStory] = useState<OptimizedStory | null>(null);
  const [selectedOptimizations, setSelectedOptimizations] = useState<Record<string, boolean>>({});

  // Notify parent about expansion state
  useEffect(() => {
    onExpand(optimizationPhase !== 'input');
  }, [optimizationPhase, onExpand]);

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
            title: formData.title,
            description: formData.description,
            acceptanceCriteria: formData.acceptanceCriteria,
            priority: formData.priority,
            storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : undefined,
          },
          externalId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze story');
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);

      // If there are gaps/questions, show chat. Otherwise, go straight to preview
      if (data.analysis.hasGaps && data.analysis.questions.length > 0) {
        setOptimizationPhase('chat');
      } else {
        // Generate preview directly
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
            title: formData.title,
            description: formData.description,
            acceptanceCriteria: formData.acceptanceCriteria,
            priority: formData.priority,
            storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : undefined,
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

      // Pre-select all optimizations by default
      const defaultSelections: Record<string, boolean> = {};
      data.optimizedStory.changes.forEach((change: any) => {
        defaultSelections[change.field] = true;
      });
      setSelectedOptimizations(defaultSelections);

      setOptimizationPhase('preview');
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

    // Apply selected optimizations to form data
    const newFormData = { ...formData };

    if (selectedOptimizations.title) {
      newFormData.title = optimizedStory.title;
    }
    if (selectedOptimizations.description) {
      newFormData.description = optimizedStory.description;
    }
    if (selectedOptimizations.acceptanceCriteria) {
      newFormData.acceptanceCriteria = optimizedStory.acceptanceCriteria;
    }
    if (selectedOptimizations.priority) {
      newFormData.priority = optimizedStory.priority;
    }
    if (selectedOptimizations.storyPoints && optimizedStory.storyPoints) {
      newFormData.storyPoints = optimizedStory.storyPoints.toString();
    }

    setFormData(newFormData);
    setOptimizationPhase('input');
    setOptimizedStory(null);
    setAnalysisResult(null);
    setConversation([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          externalId,
          storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create story');
      }

      const storyData = await response.json();

      // Save both original and optimized versions if we have optimized content
      if (optimizedStory && Object.values(selectedOptimizations).some(v => v)) {
        // Save original version
        await fetch(`/widget/api/workflow/stories/${storyData.story.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            externalId,
            storyData: {
              title: formData.title,
              description: formData.description,
              acceptanceCriteria: formData.acceptanceCriteria,
              priority: formData.priority,
              storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : null,
            },
            isOriginal: true,
            isActive: false,
            optimizationContext: null,
          }),
        });

        // Save optimized version as active
        await fetch(`/widget/api/workflow/stories/${storyData.story.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            externalId,
            storyData: {
              title: formData.title,
              description: formData.description,
              acceptanceCriteria: formData.acceptanceCriteria,
              priority: formData.priority,
              storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : null,
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

      // Deduct credits for successful story creation
      console.log('💳 Triggering credit deduction for story creation');
      parentComm.signalWorkComplete('story-creation', 1);

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOptimization = () => {
    setOptimizationPhase('input');
    setOptimizedStory(null);
    setAnalysisResult(null);
    setConversation([]);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {optimizationPhase === 'input' && 'Create New Story'}
          {optimizationPhase === 'chat' && 'Optimize Story'}
          {optimizationPhase === 'preview' && 'Review Optimizations'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Form Section */}
        <div className={`${optimizationPhase === 'input' ? 'w-full' : optimizationPhase === 'preview' ? 'w-1/3' : 'w-1/2'} p-4 overflow-y-auto transition-all duration-300`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="As a user, I want to..."
                disabled={optimizationPhase !== 'input'}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Detailed description of the story..."
                disabled={optimizationPhase !== 'input'}
              />
            </div>

            <div>
              <label htmlFor="acceptanceCriteria" className="block text-sm font-medium text-gray-300 mb-1">
                Acceptance Criteria
              </label>
              <textarea
                id="acceptanceCriteria"
                value={formData.acceptanceCriteria}
                onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="- Given... When... Then..."
                disabled={optimizationPhase !== 'input'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={optimizationPhase !== 'input'}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="storyPoints" className="block text-sm font-medium text-gray-300 mb-1">
                  Story Points
                </label>
                <input
                  id="storyPoints"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.storyPoints}
                  onChange={(e) => setFormData({ ...formData, storyPoints: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="1-100"
                  disabled={optimizationPhase !== 'input'}
                />
              </div>
            </div>

            {/* Analysis Score Display */}
            {analysisResult && optimizationPhase === 'input' && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Story Quality Score</div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Clarity</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${analysisResult.analysis.clarity}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Completeness</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${analysisResult.analysis.completeness}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Testability</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${analysisResult.analysis.testability}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            {optimizationPhase === 'input' && (
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={isSubmitting || isAnalyzing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={isSubmitting || isAnalyzing || (!formData.title && !formData.description)}
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
                  type="submit"
                  disabled={isSubmitting || isAnalyzing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Story'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Chat Section */}
        {optimizationPhase === 'chat' && analysisResult && (
          <div className="w-1/2 border-l border-gray-800 animate-slideIn">
            <StoryOptimizerChat
              projectId={projectId}
              storyInput={{
                title: formData.title,
                description: formData.description,
                acceptanceCriteria: formData.acceptanceCriteria,
                priority: formData.priority,
                storyPoints: formData.storyPoints ? parseInt(formData.storyPoints) : undefined,
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
        {optimizationPhase === 'preview' && optimizedStory && (
          <div className="w-2/3 border-l border-gray-800 animate-slideIn">
            <StoryPreview
              originalStory={{
                title: formData.title,
                description: formData.description,
                acceptanceCriteria: formData.acceptanceCriteria,
                priority: formData.priority,
                storyPoints: formData.storyPoints,
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
