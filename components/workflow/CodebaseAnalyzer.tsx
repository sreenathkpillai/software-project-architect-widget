'use client';

import React from 'react';

interface CodebaseAnalyzerProps {
  projectId: string;
  project: any;
  analysis: any;
  analysisStatus?: string;
  onAnalyze: () => void;
  onUpdate: (content: string) => void;
  onConnectRepository: () => void;
  onViewAnalysis?: () => void;
  onEditAnalysis?: () => void;
  onRefineAnalysis?: () => void;
}

export default function CodebaseAnalyzer({
  projectId,
  project,
  analysis,
  analysisStatus = 'PENDING',
  onAnalyze,
  onUpdate,
  onConnectRepository,
  onViewAnalysis,
  onEditAnalysis,
  onRefineAnalysis
}: CodebaseAnalyzerProps) {
  const isRepositoryConnected = project && (project.repositoryUrl || project.repositoryPath);

  const handleDownload = () => {
    if (!analysis?.content) return;

    const blob = new Blob([analysis.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'codebase'}-analysis.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white mb-3">Codebase Analysis</h3>
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {analysis && (
            <>
              {onViewAnalysis && (
                <button
                  onClick={onViewAnalysis}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  View
                </button>
              )}
              {onRefineAnalysis && (
                <button
                  onClick={onRefineAnalysis}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Refine
                </button>
              )}
              {onEditAnalysis && (
                <button
                  onClick={onEditAnalysis}
                  className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={handleDownload}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download</span>
              </button>
              <button
                onClick={onAnalyze}
                className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
              >
                Re-analyze
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 min-h-0">
        {analysisStatus === 'ANALYZING' ? (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">Regenerating Analysis...</h3>
            <p className="text-gray-400">This may take a few minutes</p>
            <p className="text-xs text-gray-500 mt-2">Reading README, analyzing code structure, and generating insights...</p>
          </div>
        ) : !analysis ? (
          <div className="text-center py-12">
            {!isRepositoryConnected ? (
              <>
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-200">No repository connected</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Connect a repository to analyze your codebase
                </p>
                <button
                  onClick={onConnectRepository}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Connect Repository
                </button>
              </>
            ) : (
              <>
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-200">No analysis yet</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Analyze your codebase to get started
                </p>
                <button
                  onClick={onAnalyze}
                  className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  Analyze Codebase
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <div
              className="text-gray-300 text-sm"
              dangerouslySetInnerHTML={{
                __html: analysis.content
                  .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">$1</h1>')
                  .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-purple-200 mb-3 mt-5">$1</h2>')
                  .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-blue-200 mb-2 mt-4">$1</h3>')
                  .replace(/^- (.*$)/gm, '<li class="text-gray-300 mb-1">$1</li>')
                  .replace(/^(\*.+)$/gm, '<strong class="text-white">$1</strong>')
                  .replace(/\n\n/g, '</p><p class="mb-3">')
                  .replace(/\n/g, '<br/>')
              }}
            />
            {analysis.analyzedAt && (
              <div className="mt-4 text-xs text-gray-500">
                Last analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
