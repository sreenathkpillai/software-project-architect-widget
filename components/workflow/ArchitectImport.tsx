'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowProject } from '@/types/workflow';
import { ArrowLeft, FileText, Import } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

interface ArchitectImportProps {
  architectSessionId: string;
  externalId: string;
  onProjectCreated: (project: WorkflowProject) => void;
  onCancel: () => void;
}

export default function ArchitectImport({
  architectSessionId,
  externalId,
  onProjectCreated,
  onCancel,
}: ArchitectImportProps) {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchitectSession();
  }, [architectSessionId]);

  const fetchArchitectSession = async () => {
    try {
      setLoading(true);

      // First try to get session documents to check if session has specifications
      try {
        const documentsResponse = await fetch(
          getApiUrl(`/api/sessions/${architectSessionId}/documents?externalId=${externalId}`),
          {
            headers: {
              'x-external-id': externalId,
            },
          }
        );

        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          setSessionData({
            ...documentsData,
            hasDocuments: documentsData.documents && documentsData.documents.length > 0,
            documentCount: documentsData.documents ? documentsData.documents.length : 0,
          });

          // Auto-fill project name from session
          if (documentsData.sessionName) {
            setProjectName(`${documentsData.sessionName} - Workflow`);
            setDescription(
              documentsData.documents && documentsData.documents.length > 0
                ? `Imported from Architect session with ${documentsData.documents.length} specifications`
                : `Imported from Architect session: ${documentsData.sessionName}`
            );
          }
        } else {
          // Fallback: try to get basic session info
          const sessionResponse = await fetch(
            getApiUrl(`/api/sessions/completed?externalId=${externalId}`),
            {
              headers: {
                'x-external-id': externalId,
              },
            }
          );

          if (sessionResponse.ok) {
            const sessionsData = await sessionResponse.json();
            const session = sessionsData.sessions?.find((s: any) => s.userSession === architectSessionId);

            if (session) {
              setSessionData({
                sessionId: architectSessionId,
                sessionName: session.sessionName,
                isComplete: session.isComplete,
                hasDocuments: false,
                documentCount: 0,
              });

              setProjectName(`${session.sessionName} - Workflow`);
              setDescription(`Imported from Architect session: ${session.sessionName} (no specifications found)`);
            } else {
              throw new Error('Session not found');
            }
          } else {
            throw new Error('Session not accessible');
          }
        }
      } catch (docError) {
        console.error('Error fetching session documents:', docError);
        // Create minimal session data
        setSessionData({
          sessionId: architectSessionId,
          sessionName: `Session ${architectSessionId.slice(-8)}`,
          isComplete: false,
          hasDocuments: false,
          documentCount: 0,
        });

        setProjectName(`Architect Import - ${architectSessionId.slice(-8)}`);
        setDescription(`Import from Architect session (session details not available)`);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Failed to load Architect session. You can still create a project.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!projectName.trim()) {
      setError('Please provide a project name');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch(
        getApiUrl('/api/workflow/projects/from-architect'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-external-id': externalId,
          },
          body: JSON.stringify({
            architectSessionId,
            name: projectName,
            description,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create project from Architect');
      }

      const project = await response.json();
      onProjectCreated(project);
    } catch (err) {
      console.error('Error importing:', err);
      setError('Failed to import from Architect');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-widget-bg flex items-center justify-center">
        <div className="text-widget-text-secondary">
          Loading Architect session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-widget-bg p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-widget-surface rounded-lg transition-colors"
            disabled={importing}
          >
            <ArrowLeft className="w-5 h-5 text-widget-text-secondary" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-widget-text-primary">
              Import from Architect
            </h1>
            <p className="text-widget-text-secondary mt-1">
              Create a Workflow project from your Architect specifications
            </p>
          </div>
        </div>

        {/* Import Form */}
        <div className="bg-widget-surface rounded-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {sessionData && (
            <div className="mb-6 p-4 bg-widget-bg rounded-lg border border-widget-border">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-widget-accent-start" />
                <span className="font-medium text-widget-text-primary">
                  Architect Session Details
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-widget-text-secondary">Session Name: </span>
                  <span className="text-widget-text-primary font-medium">
                    {sessionData.sessionName || architectSessionId}
                  </span>
                </div>

                <div>
                  <span className="text-widget-text-secondary">Status: </span>
                  <span className={`font-medium ${sessionData.isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                    {sessionData.isComplete ? 'Complete' : 'In Progress'}
                  </span>
                </div>

                <div>
                  <span className="text-widget-text-secondary">Specifications: </span>
                  <span className="text-widget-text-primary font-medium">
                    {sessionData.documentCount || 0} documents
                  </span>
                </div>

                <div>
                  <span className="text-widget-text-secondary">Session ID: </span>
                  <span className="text-widget-text-primary font-mono text-xs">
                    {architectSessionId.slice(-12)}...
                  </span>
                </div>
              </div>

              {/* Import Preview */}
              <div className="mt-4 p-3 bg-widget-surface rounded border-l-4 border-widget-accent-start">
                <h4 className="text-sm font-medium text-widget-text-primary mb-2">
                  What will be imported:
                </h4>
                <ul className="text-xs text-widget-text-secondary space-y-1">
                  {sessionData.hasDocuments ? (
                    <>
                      <li>✅ Working documentation from {sessionData.documentCount} specifications</li>
                      <li>✅ User stories extracted from requirements</li>
                      <li>✅ Project structure based on architecture docs</li>
                    </>
                  ) : (
                    <>
                      <li>⚠️  Basic project structure (no specifications found)</li>
                      <li>✅ Default implementation user story</li>
                      <li>✅ Session reference for future updates</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start"
                placeholder="My Workflow Project"
                disabled={importing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-widget-text-primary mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary focus:outline-none focus:border-widget-accent-start resize-none"
                placeholder="Project description..."
                rows={3}
                disabled={importing}
              />
            </div>

            <div className="pt-4">
              <p className="text-sm text-widget-text-secondary mb-4">
                This will create a new Workflow project and:
              </p>
              <ul className="text-sm text-widget-text-secondary space-y-1 mb-6">
                <li>• Import all specifications as working documentation</li>
                <li>• Extract user stories from requirements</li>
                <li>• Set up the project structure for implementation</li>
              </ul>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  disabled={importing || !projectName.trim()}
                >
                  <Import className="w-4 h-4" />
                  {importing ? 'Importing...' : 'Import Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}