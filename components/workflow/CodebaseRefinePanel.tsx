'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';

interface RefinementQuestion {
  id: string;
  question: string;
  type: 'text' | 'choice';
  choices?: string[];
}

interface CodebaseRefinePanelProps {
  projectId: string;
  project: any;
  analysis: any;
  onClose: () => void;
  onRefined: () => void;
}

export default function CodebaseRefinePanel({
  projectId,
  project,
  analysis,
  onClose,
  onRefined
}: CodebaseRefinePanelProps) {
  const { externalId } = useWorkflow();
  const [isLoading, setIsLoading] = useState(true);
  const [refinementQuestions, setRefinementQuestions] = useState<RefinementQuestion[]>([]);
  const [refinementAnswers, setRefinementAnswers] = useState<Record<string, string>>({});
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRefinementQuestions();
  }, [projectId, externalId]);

  const fetchRefinementQuestions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/analysis/refine?externalId=${externalId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.hasQuestions && data.questions.length > 0) {
          setRefinementQuestions(data.questions);
          setRefinementAnswers({});
        } else {
          setError('No refinement questions available for this analysis.');
        }
      } else {
        setError('Failed to get refinement questions.');
      }
    } catch (error) {
      console.error('Failed to get refinement questions:', error);
      setError('Failed to get refinement questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRefinement = async () => {
    setIsRefining(true);
    setError('');
    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/analysis/refine?externalId=${externalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: refinementAnswers }),
      });

      if (response.ok) {
        onRefined();
      } else {
        setError('Failed to refine analysis.');
      }
    } catch (error) {
      console.error('Failed to refine analysis:', error);
      setError('Failed to refine analysis.');
    } finally {
      setIsRefining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">Refine Analysis</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading refinement questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && refinementQuestions.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">Refine Analysis</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-white">Refine Analysis</h3>
          <p className="text-sm text-gray-400">Answer questions to improve the analysis</p>
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

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-6">
          {refinementQuestions.map((question, index) => (
            <div key={question.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                {index + 1}. {question.question}
              </label>
              {question.type === 'choice' && question.choices ? (
                <select
                  value={refinementAnswers[question.id] || ''}
                  onChange={(e) => setRefinementAnswers(prev => ({
                    ...prev,
                    [question.id]: e.target.value
                  }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select an option...</option>
                  {question.choices.map((choice: string) => (
                    <option key={choice} value={choice}>{choice}</option>
                  ))}
                  <option value="I don't know">I don't know</option>
                </select>
              ) : (
                <textarea
                  value={refinementAnswers[question.id] || ''}
                  onChange={(e) => setRefinementAnswers(prev => ({
                    ...prev,
                    [question.id]: e.target.value
                  }))}
                  placeholder="Your answer..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 text-red-400 text-sm">{error}</div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-end space-x-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitRefinement}
          disabled={isRefining}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors flex items-center gap-2"
        >
          {isRefining ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Refining...
            </>
          ) : (
            'Submit & Refine'
          )}
        </button>
      </div>
    </div>
  );
}
