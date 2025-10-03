'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflow } from './WorkflowApp';
import CodebaseAnalyzer from './CodebaseAnalyzer';
import StoryManager from './StoryManager';
import RepositoryConnector from './RepositoryConnector';
import parentComm from '../../lib/utils/parentCommunication';

interface ProjectDashboardProps {
  projectId: string;
}

export default function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const { externalId } = useWorkflow();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'stories'>('analysis');
  const [showRepositoryConnector, setShowRepositoryConnector] = useState(false);
  const [showAnalysisViewer, setShowAnalysisViewer] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('PENDING');
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const fetchErrorDetails = async () => {
    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/debug?externalId=${externalId}`);
      if (response.ok) {
        const debugData = await response.json();
        setErrorDetails(debugData);

        // Log comprehensive error details to console for debugging
        console.group('🚨 ANALYSIS FAILURE DEBUG INFORMATION');
        console.error('Project:', debugData.project);
        console.error('Error Info:', debugData.errorInfo);
        console.error('Debug Info:', debugData.debugInfo);

        if (debugData.errorInfo) {
          console.error('❌ ERROR CODE:', debugData.errorInfo.code);
          console.error('❌ ERROR MESSAGE:', debugData.errorInfo.message);
          console.error('❌ ERROR DETAILS:', debugData.errorInfo.details);
          console.error('❌ TIMESTAMP:', debugData.errorInfo.timestamp);
          console.error('❌ REPOSITORY URL:', debugData.errorInfo.repositoryUrl);
          console.error('❌ HAS GITHUB TOKEN:', debugData.errorInfo.hasGithubToken);
        }

        console.groupEnd();
      }
    } catch (error) {
      console.error('Failed to fetch error details:', error);
    }
  };

  const fetchProjectData = async (skipLoadingUpdate = false) => {
    try {
      const [projectRes, analysisRes, storiesRes] = await Promise.all([
        fetch(`/widget/api/workflow/projects/${projectId}?externalId=${externalId}`),
        fetch(`/widget/api/workflow/projects/${projectId}/analysis?externalId=${externalId}`),
        fetch(`/widget/api/workflow/projects/${projectId}/stories?externalId=${externalId}`),
      ]);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData.project);
        const newStatus = projectData.project.analysisStatus || 'PENDING';
        setAnalysisStatus(newStatus);

        // Log status changes for debugging
        console.log('Analysis status updated to:', newStatus);

        // If analysis failed, fetch detailed error information for debugging
        if (newStatus === 'FAILED') {
          fetchErrorDetails();
        }
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData.analysis);
      }

      if (storiesRes.ok) {
        const storiesData = await storiesRes.json();
        setStories(storiesData.stories || []);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      // Only update loading state if not during analysis polling
      if (!skipLoadingUpdate && analysisStatus !== 'ANALYZING') {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId, externalId]);

  // Poll for analysis completion when status is ANALYZING
  useEffect(() => {
    if (analysisStatus === 'ANALYZING') {
      console.log('Starting analysis polling...');
      const pollInterval = setInterval(() => {
        console.log('Polling for analysis status...');
        fetchProjectData(true); // Skip loading update during polling
      }, 3000); // Poll every 3 seconds

      return () => {
        console.log('Stopping analysis polling');
        clearInterval(pollInterval);
      };
    }
  }, [analysisStatus]);

  // Turn off loading when analysis completes
  useEffect(() => {
    if (analysisStatus === 'COMPLETED' || analysisStatus === 'FAILED') {
      console.log('Analysis completed with status:', analysisStatus);
      setIsLoading(false);
    }
  }, [analysisStatus]);

  const handleAnalyze = async () => {
    console.log('Starting analysis request...');
    setIsLoading(true);
    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId }),
      });

      if (response.ok) {
        console.log('Analysis request successful, fetching updated status...');

        // Deduct credits for analysis CREATION (not completion)
        console.log('💳 Triggering credit deduction for codebase analysis creation');
        parentComm.signalWorkComplete('codebase-analysis', 1);

        await fetchProjectData(true); // Skip loading update, let status control it

        // Only turn off loading if analysis didn't start
        if (analysisStatus !== 'ANALYZING') {
          setIsLoading(false);
        }
      } else {
        throw new Error('Failed to start analysis');
      }
    } catch (error) {
      console.error('Failed to analyze:', error);
      setIsLoading(false); // Only turn off loading on error
    }
  };

  const handleAnalysisUpdate = async (newContent: string) => {
    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/analysis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId, content: newContent }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Failed to update analysis:', error);
    }
  };

  const handleRepositoryConnected = () => {
    setShowRepositoryConnector(false);
    fetchProjectData();
  };

  const isRepositoryConnected = project && (project.repositoryUrl || project.repositoryPath);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-gray-300">Project not found</h2>
        <button
          onClick={() => router.push(`/workflow?externalId=${externalId}`)}
          className="mt-4 text-blue-400 hover:text-blue-300"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className={`${externalId ? 'h-[calc(100vh-2rem)]' : 'h-[calc(100vh-8rem)]'}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => router.push(`/workflow?externalId=${externalId}`)}
            className="mt-1 p-1 text-gray-400 hover:text-white transition-colors"
            title="Back to Projects"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">{project.name}</h2>
            {project.description && (
              <p className="text-gray-400 mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          {!isRepositoryConnected && (
            <button
              onClick={() => setShowRepositoryConnector(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Connect Repository
            </button>
          )}
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden mb-4">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'stories'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Stories
          </button>
        </div>
      </div>

      {/* Split view for desktop, single view for mobile */}
      <div className="flex gap-4 h-[calc(100%-4rem)]">
        <div className={`${activeTab === 'analysis' ? 'block' : 'hidden'} md:block md:w-1/2 h-full`}>
          <CodebaseAnalyzer
            projectId={projectId}
            project={project}
            analysis={analysis}
            analysisStatus={analysisStatus}
            onAnalyze={handleAnalyze}
            onUpdate={handleAnalysisUpdate}
            onConnectRepository={() => setShowRepositoryConnector(true)}
            onViewAnalysis={() => setShowAnalysisViewer(true)}
          />
        </div>
        <div className={`${activeTab === 'stories' ? 'block' : 'hidden'} md:block md:w-1/2 h-full`}>
          <StoryManager
            projectId={projectId}
            stories={stories}
            analysis={analysis}
            onStoriesChange={fetchProjectData}
          />
        </div>
      </div>

      {showRepositoryConnector && (
        <RepositoryConnector
          projectId={projectId}
          project={project}
          onClose={() => setShowRepositoryConnector(false)}
          onConnected={handleRepositoryConnected}
        />
      )}

      {showAnalysisViewer && analysis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/90 backdrop-blur-md border border-purple-500/20 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Codebase Analysis</h2>
              <button
                onClick={() => setShowAnalysisViewer(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="prose prose-invert max-w-none">
                <div
                  className="text-gray-300 text-sm bg-gray-800/50 p-4 rounded-lg"
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}