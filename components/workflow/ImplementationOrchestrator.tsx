'use client';

import React, { useState, useEffect } from 'react';
import { UserStory, WorkflowProject } from '@/types/workflow';
import {
  Play,
  Pause,
  StopCircle,
  CheckCircle,
  AlertCircle,
  Code,
  TestTube,
  FileText,
  GitBranch,
  Zap,
  Settings,
  Download,
  Eye,
} from 'lucide-react';

interface ImplementationStatus {
  phase: 'idle' | 'planning' | 'implementing' | 'testing' | 'reviewing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  output: string;
  errors: string[];
  files: Array<{ path: string; content: string; language: string }>;
}

interface ImplementationOrchestratorProps {
  project: WorkflowProject;
  story: UserStory;
  promptPackId: string;
  externalId: string;
  onComplete?: (implementation: any) => void;
  onCancel?: () => void;
}

export default function ImplementationOrchestrator({
  project,
  story,
  promptPackId,
  externalId,
  onComplete,
  onCancel,
}: ImplementationOrchestratorProps) {
  const [status, setStatus] = useState<ImplementationStatus>({
    phase: 'idle',
    progress: 0,
    currentStep: 'Ready to start implementation',
    output: '',
    errors: [],
    files: [],
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    autoCommit: true,
    runTests: true,
    generateDocs: true,
  });
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [implementationId, setImplementationId] = useState<string | null>(null);

  const startImplementation = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setStatus({
      ...status,
      phase: 'planning',
      progress: 10,
      currentStep: 'Loading prompt pack...',
    });

    try {
      // Create implementation record
      const response = await fetch('/widget/api/workflow/implementations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': externalId,
        },
        body: JSON.stringify({
          projectId: project.id,
          storyId: story.id,
          promptPackId,
          type: 'platform',
          config: settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create implementation');
      }

      const implementation = await response.json();
      setImplementationId(implementation.id);

      // Start implementation stream
      await runImplementationStream(implementation.id);
    } catch (error) {
      console.error('Implementation error:', error);
      setStatus({
        ...status,
        phase: 'failed',
        errors: [`Implementation failed: ${error}`],
      });
      setIsRunning(false);
    }
  };

  const runImplementationStream = async (implId: string) => {
    const eventSource = new EventSource(
      `/widget/api/workflow/implementations/${implId}/stream?externalId=${externalId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleStreamUpdate(data);
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
      eventSource.close();
      setIsRunning(false);
      setStatus(prev => ({
        ...prev,
        phase: 'failed',
        errors: [...prev.errors, 'Connection lost'],
      }));
    };
  };

  const handleStreamUpdate = (data: any) => {
    switch (data.type) {
      case 'phase':
        setStatus(prev => ({
          ...prev,
          phase: data.phase,
          currentStep: data.message,
          progress: data.progress,
        }));
        break;

      case 'output':
        setStatus(prev => ({
          ...prev,
          output: prev.output + data.content,
        }));
        break;

      case 'file':
        setStatus(prev => ({
          ...prev,
          files: [...prev.files, data.file],
        }));
        break;

      case 'error':
        setStatus(prev => ({
          ...prev,
          errors: [...prev.errors, data.message],
        }));
        break;

      case 'complete':
        setStatus(prev => ({
          ...prev,
          phase: 'completed',
          progress: 100,
          currentStep: 'Implementation completed successfully',
        }));
        setIsRunning(false);
        onComplete?.(data.implementation);
        break;
    }
  };

  const pauseImplementation = () => {
    setIsPaused(true);
    // Would send pause signal to backend
  };

  const stopImplementation = async () => {
    if (implementationId) {
      await fetch(`/widget/api/workflow/implementations/${implementationId}/stop`, {
        method: 'POST',
        headers: {
          'x-external-id': externalId,
        },
      });
    }
    setIsRunning(false);
    setIsPaused(false);
    onCancel?.();
  };

  const downloadImplementation = () => {
    const files = status.files.map(f => ({
      path: f.path,
      content: f.content,
    }));

    const blob = new Blob([JSON.stringify(files, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}_implementation.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPhaseIcon = (phase: ImplementationStatus['phase']) => {
    switch (phase) {
      case 'planning':
        return <FileText className="w-5 h-5" />;
      case 'implementing':
        return <Code className="w-5 h-5" />;
      case 'testing':
        return <TestTube className="w-5 h-5" />;
      case 'reviewing':
        return <Eye className="w-5 h-5" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getPhaseColor = (phase: ImplementationStatus['phase']) => {
    switch (phase) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'implementing':
      case 'testing':
        return 'text-blue-400';
      default:
        return 'text-widget-text-primary';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-widget-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-widget-text-primary">
              AI Implementation Orchestrator
            </h2>
            <p className="text-sm text-widget-text-secondary">
              {story.title}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={startImplementation}
                className="px-4 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Implementation
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button
                    onClick={pauseImplementation}
                    className="p-2 bg-widget-surface text-widget-text-primary rounded hover:bg-widget-border transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsPaused(false)}
                    className="p-2 bg-widget-surface text-widget-text-primary rounded hover:bg-widget-border transition-colors"
                    title="Resume"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={stopImplementation}
                  className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  title="Stop"
                >
                  <StopCircle className="w-5 h-5" />
                </button>
              </>
            )}

            {status.files.length > 0 && (
              <button
                onClick={downloadImplementation}
                className="p-2 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
                title="Download Implementation"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <div className={`flex items-center gap-2 ${getPhaseColor(status.phase)}`}>
              {getPhaseIcon(status.phase)}
              <span className="capitalize">{status.phase}</span>
            </div>
            <span className="text-widget-text-secondary">{status.progress}%</span>
          </div>
          <div className="w-full bg-widget-bg rounded-full h-2">
            <div
              className="bg-gradient-to-r from-widget-accent-start to-widget-accent-end h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-xs text-widget-text-secondary mt-1">{status.currentStep}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Output Panel */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 bg-widget-surface border-b border-widget-border">
            <h3 className="text-sm font-medium text-widget-text-primary">
              Implementation Output
            </h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-widget-bg">
            {status.output ? (
              <pre className="font-mono text-xs text-widget-text-primary whitespace-pre-wrap">
                {status.output}
              </pre>
            ) : (
              <p className="text-widget-text-secondary text-center mt-8">
                Output will appear here when implementation starts...
              </p>
            )}

            {/* Errors */}
            {status.errors.length > 0 && (
              <div className="mt-4 space-y-2">
                {status.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Files Panel */}
        {status.files.length > 0 && (
          <div className="w-1/2 flex flex-col border-l border-widget-border">
            <div className="p-3 bg-widget-surface border-b border-widget-border">
              <h3 className="text-sm font-medium text-widget-text-primary">
                Generated Files ({status.files.length})
              </h3>
            </div>

            <div className="flex">
              {/* File List */}
              <div className="w-48 bg-widget-surface border-r border-widget-border">
                {status.files.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFile(idx)}
                    className={`w-full p-3 text-left hover:bg-widget-bg transition-colors border-b border-widget-border ${
                      selectedFile === idx ? 'bg-widget-bg' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-widget-text-secondary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono text-widget-text-primary truncate">
                          {file.path.split('/').pop()}
                        </p>
                        <p className="text-xs text-widget-text-secondary truncate">
                          {file.path}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* File Content */}
              <div className="flex-1 p-4 overflow-auto bg-widget-bg">
                {status.files[selectedFile] && (
                  <pre className="font-mono text-xs text-widget-text-primary">
                    <code>{status.files[selectedFile].content}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel (Collapsed) */}
      <details className="border-t border-widget-border">
        <summary className="p-3 cursor-pointer hover:bg-widget-surface transition-colors">
          <span className="text-sm font-medium text-widget-text-primary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Implementation Settings
          </span>
        </summary>
        <div className="p-4 bg-widget-surface grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-widget-text-primary mb-1">
              AI Provider
            </label>
            <select
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
              className="w-full px-2 py-1 bg-widget-bg border border-widget-border rounded text-sm"
              disabled={isRunning}
            >
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai">OpenAI GPT</option>
              <option value="local">Local Model</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-widget-text-primary mb-1">
              Model
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full px-2 py-1 bg-widget-bg border border-widget-border rounded text-sm"
              disabled={isRunning}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoCommit}
                onChange={(e) => setSettings({ ...settings, autoCommit: e.target.checked })}
                disabled={isRunning}
              />
              <span className="text-sm text-widget-text-primary">Auto-commit changes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.runTests}
                onChange={(e) => setSettings({ ...settings, runTests: e.target.checked })}
                disabled={isRunning}
              />
              <span className="text-sm text-widget-text-primary">Run tests after implementation</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.generateDocs}
                onChange={(e) => setSettings({ ...settings, generateDocs: e.target.checked })}
                disabled={isRunning}
              />
              <span className="text-sm text-widget-text-primary">Generate documentation</span>
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}