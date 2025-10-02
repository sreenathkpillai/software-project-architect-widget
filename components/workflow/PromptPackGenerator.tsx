'use client';

import React, { useState } from 'react';
import { useWorkflow } from './WorkflowApp';
import parentComm from '../../lib/utils/parentCommunication';

interface PromptPackGeneratorProps {
  story: any;
  analysis: any;
  onClose: () => void;
  onGenerated: () => void;
}

export default function PromptPackGenerator({
  story,
  analysis,
  onClose,
  onGenerated
}: PromptPackGeneratorProps) {
  const { externalId } = useWorkflow();
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptPack, setPromptPack] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch(`/widget/api/workflow/stories/${story.id}/prompt-packs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate prompt pack');
      }

      const data = await response.json();
      setPromptPack(data.promptPack);

      // Deduct credits for successful prompt pack generation
      console.log('💳 Triggering credit deduction for prompt pack generation');
      parentComm.signalWorkComplete('prompt-pack-generation', 1);

      onGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!promptPack) return;

    const blob = new Blob([JSON.stringify(promptPack.content, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-pack-${story.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Prompt Pack Generator</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-white font-medium mb-2">{story.title}</h3>
          <p className="text-sm text-gray-400">{story.description}</p>
          {story.acceptanceCriteria && (
            <div className="mt-2 text-sm text-gray-500">
              <strong>Acceptance Criteria:</strong> {story.acceptanceCriteria}
            </div>
          )}
        </div>

        {!promptPack ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            {!analysis ? (
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Codebase analysis is required to generate prompt packs
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-6">
                  Generate an AI-ready prompt pack for this story based on your codebase analysis
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    'Generate Prompt Pack'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Generated Prompt Pack</h3>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors text-sm"
              >
                Download JSON
              </button>
            </div>

            <div className="space-y-4">
              {promptPack.content.prompts && promptPack.content.prompts.map((prompt: any, index: number) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-medium capitalize">{prompt.phase} Phase</h4>
                    <button
                      onClick={() => copyToClipboard(prompt.prompt)}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">{prompt.prompt}</pre>
                </div>
              ))}
            </div>

            {promptPack.content.implementation && (
              <div className="mt-4 bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Implementation Steps</h4>
                <ol className="list-decimal list-inside space-y-2">
                  {promptPack.content.implementation.steps.map((step: any, index: number) => (
                    <li key={index} className="text-sm text-gray-300">
                      <strong>{step.task}</strong>
                      {step.location && <span className="text-gray-500"> - {step.location}</span>}
                      {step.details && <p className="mt-1 ml-6 text-gray-400">{step.details}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}