'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkflow } from './WorkflowApp';
import parentComm from '../../lib/utils/parentCommunication';

interface PromptPackViewerProps {
  story: any;
  analysis: any;
  onClose: () => void;
  onRegenerated: () => void;
}

export default function PromptPackViewer({
  story,
  analysis,
  onClose,
  onRegenerated
}: PromptPackViewerProps) {
  const { externalId } = useWorkflow();
  const [promptPacks, setPromptPacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'implementation' | 'prompts' | 'raw'>('overview');

  React.useEffect(() => {
    fetchPromptPacks();
  }, []);

  const fetchPromptPacks = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/widget/api/workflow/stories/${story.id}/prompt-packs?externalId=${externalId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch prompt packs');
      }

      const data = await response.json();
      setPromptPacks(data.promptPacks);

      if (data.promptPacks.length > 0) {
        setSelectedPack(data.promptPacks[0]); // Select most recent
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompt packs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError('');

    try {
      const response = await fetch(`/widget/api/workflow/stories/${story.id}/prompt-packs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate prompt pack');
      }

      const data = await response.json();

      // Deduct credits for successful prompt pack generation
      console.log('💳 Triggering credit deduction for prompt pack regeneration');
      parentComm.signalWorkComplete('prompt-pack-generation', 1);

      // Refresh the list and select the new pack
      await fetchPromptPacks();
      onRegenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (!selectedPack) return;

    const blob = new Blob([JSON.stringify(selectedPack.content, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-pack-${story.id}-${selectedPack.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const modalContent = (
    <>
      {isLoading ? (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center">
          <div className="bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading prompt packs...</p>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999]">
          <div className="bg-gray-900/95 backdrop-blur-md h-screen w-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-white">Prompt Pack Viewer</h2>
            <p className="text-sm text-gray-400 mt-1">{story.title}</p>
          </div>
          <div className="flex items-center space-x-3">
            {promptPacks.length > 0 && (
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm flex items-center"
              >
                {isRegenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {promptPacks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-white font-medium mb-2">No prompt packs found</h3>
            <p className="text-gray-400 text-center mb-6">
              Generate a prompt pack to get AI-ready implementation guidance for this story.
            </p>
            {!analysis ? (
              <p className="text-gray-500 text-sm text-center">
                Codebase analysis is required to generate prompt packs
              </p>
            ) : (
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {isRegenerating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate First Prompt Pack'
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar - Pack List */}
            <div className="w-64 border-r border-gray-800 bg-gray-900/50">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-medium text-gray-300">Prompt Packs ({promptPacks.length})</h3>
              </div>
              <div className="overflow-auto max-h-full">
                {promptPacks.map((pack: any, index: number) => (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`p-4 cursor-pointer border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${
                      selectedPack?.id === pack.id ? 'bg-purple-900/30 border-l-4 border-l-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-purple-400">#{index + 1}</span>
                      <span className="text-xs text-gray-500">
                        v{pack.content?.metadata?.version || '1.0'}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium mb-1">{pack.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(pack.createdAt).toLocaleString()}
                    </p>
                    {pack.content?.metadata?.platformSpecificNotes && (
                      <div className="mt-2 text-xs text-blue-400 bg-blue-900/20 rounded px-2 py-1">
                        Platform notes available
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {selectedPack && (
                <>
                  {/* Tabs */}
                  <div className="flex border-b border-gray-800 bg-gray-900/50">
                    {[
                      { id: 'overview', label: 'Overview', icon: '📋' },
                      { id: 'implementation', label: 'Implementation', icon: '⚙️' },
                      { id: 'prompts', label: 'AI Prompts', icon: '🤖' },
                      { id: 'raw', label: 'Raw Data', icon: '🔍' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                          activeTab === tab.id
                            ? 'text-purple-400 border-purple-500'
                            : 'text-gray-400 border-transparent hover:text-white'
                        }`}
                      >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                    <div className="flex-1"></div>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
                      title="Download JSON"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'overview' && (
                      <OverviewTab promptPack={selectedPack} />
                    )}
                    {activeTab === 'implementation' && (
                      <ImplementationTab promptPack={selectedPack} />
                    )}
                    {activeTab === 'prompts' && (
                      <PromptsTab promptPack={selectedPack} copyToClipboard={copyToClipboard} />
                    )}
                    {activeTab === 'raw' && (
                      <RawDataTab promptPack={selectedPack} copyToClipboard={copyToClipboard} />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 border-t border-gray-800 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}
          </div>
        </div>
      )}
    </>
  );

  // Use portal to render modal at document body level
  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// Tab Components
function OverviewTab({ promptPack }: { promptPack: any }) {
  const content = promptPack.content;

  return (
    <div className="space-y-6">
      {/* Story Info */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Story Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-400">Title:</label>
            <p className="text-white">{content.story?.title}</p>
          </div>
          <div>
            <label className="text-gray-400">Priority:</label>
            <p className="text-white">{content.story?.priority}</p>
          </div>
          <div className="col-span-2">
            <label className="text-gray-400">Description:</label>
            <p className="text-white">{content.story?.description}</p>
          </div>
        </div>
      </div>

      {/* Tech Context */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Technical Context</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-400">Tech Stack:</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {content.context?.techStack?.map((tech: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400">Patterns:</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {content.context?.patterns?.map((pattern: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs">
                  {pattern}
                </span>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-gray-400">Architecture:</label>
            <p className="text-white text-sm">{content.context?.architecture}</p>
          </div>
        </div>
      </div>

      {/* Platform Notes */}
      {content.metadata?.platformSpecificNotes && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-purple-300 font-medium mb-2">Platform-Specific Notes</h3>
          <p className="text-gray-300 text-sm">{content.metadata.platformSpecificNotes}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Generation Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-400">Generated:</label>
            <p className="text-white">{new Date(content.metadata?.generatedAt).toLocaleString()}</p>
          </div>
          <div>
            <label className="text-gray-400">Version:</label>
            <p className="text-white">{content.metadata?.version || '1.0'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImplementationTab({ promptPack }: { promptPack: any }) {
  const content = promptPack.content;

  return (
    <div className="space-y-6">
      {/* Implementation Steps */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Implementation Steps</h3>
        <div className="space-y-3">
          {content.implementation?.steps?.map((step: any, index: number) => (
            <div key={index} className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">
                    {step.order}
                  </span>
                  <h4 className="text-white font-medium">{step.task}</h4>
                </div>
                {step.estimatedTime && (
                  <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    {step.estimatedTime}
                  </span>
                )}
              </div>
              <div className="ml-9">
                <p className="text-sm text-purple-300 mb-1">📁 {step.location}</p>
                <p className="text-sm text-gray-300">{step.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testing Requirements */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Testing Requirements</h3>
        <ul className="space-y-2">
          {content.implementation?.testingRequirements?.map((req: string, index: number) => (
            <li key={index} className="flex items-start text-sm">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-gray-300">{req}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Acceptance Criteria */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Acceptance Criteria</h3>
        <ul className="space-y-2">
          {content.implementation?.acceptanceCriteria?.map((criteria: string, index: number) => (
            <li key={index} className="flex items-start text-sm">
              <span className="text-blue-400 mr-2">□</span>
              <span className="text-gray-300">{criteria}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PromptsTab({ promptPack, copyToClipboard }: { promptPack: any, copyToClipboard: (text: string) => void }) {
  const content = promptPack.content;

  return (
    <div className="space-y-4">
      {content.prompts?.map((prompt: any, index: number) => (
        <div key={index} className="bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h4 className="text-white font-medium capitalize flex items-center">
              <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">
                {index + 1}
              </span>
              {prompt.phase} Phase
            </h4>
            <button
              onClick={() => copyToClipboard(prompt.prompt)}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              Copy Prompt
            </button>
          </div>
          <div className="p-4">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 rounded p-3 overflow-auto">
              {prompt.prompt}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function RawDataTab({ promptPack, copyToClipboard }: { promptPack: any, copyToClipboard: (text: string) => void }) {
  const jsonString = JSON.stringify(promptPack.content, null, 2);

  return (
    <div className="bg-gray-800/50 rounded-lg">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h4 className="text-white font-medium">Raw JSON Data</h4>
        <button
          onClick={() => copyToClipboard(jsonString)}
          className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          Copy JSON
        </button>
      </div>
      <div className="p-4">
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 rounded p-3 overflow-auto max-h-96">
          {jsonString}
        </pre>
      </div>
    </div>
  );
}