'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowProject } from '@/types/workflow';
import {
  GitBranch,
  Settings,
  Plus,
  Download,
  Upload,
  Link,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
} from 'lucide-react';
import CodeDiffViewer from './CodeDiffViewer';
import CommitHistory from './CommitHistory';

interface RepositorySettingsProps {
  project: WorkflowProject;
  externalId: string;
  onUpdate: (updates: Partial<WorkflowProject>) => void;
}

interface RepositoryStatus {
  initialized: boolean;
  url: string | null;
  type: string | null;
  currentBranch?: string;
  status?: {
    branch: string;
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  };
  branches?: Array<{
    name: string;
    current: boolean;
    lastCommit?: any;
  }>;
  needsClone?: boolean;
}

export default function RepositorySettings({
  project,
  externalId,
  onUpdate,
}: RepositorySettingsProps) {
  const [repoStatus, setRepoStatus] = useState<RepositoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'status' | 'history' | 'diff'>('settings');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupForm, setSetupForm] = useState({
    action: 'connect' as 'init' | 'clone' | 'connect',
    repositoryUrl: project.repositoryUrl || '',
    repositoryType: project.repositoryType || 'github',
  });

  useEffect(() => {
    fetchRepositoryStatus();
  }, [project.id]);

  const fetchRepositoryStatus = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/widget/api/workflow/repositories?projectId=${project.id}`,
        {
          headers: {
            'x-external-id': externalId,
          },
        }
      );

      if (response.ok) {
        const status = await response.json();
        setRepoStatus(status);
      }
    } catch (error) {
      console.error('Error fetching repository status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupRepository = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/widget/api/workflow/repositories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-external-id': externalId,
          },
          body: JSON.stringify({
            projectId: project.id,
            ...setupForm,
          }),
        }
      );

      if (response.ok) {
        await fetchRepositoryStatus();
        setShowSetupModal(false);

        // Update project with new repository info
        onUpdate({
          repositoryUrl: setupForm.repositoryUrl,
          repositoryType: setupForm.repositoryType,
        });
      } else {
        throw new Error('Failed to setup repository');
      }
    } catch (error) {
      console.error('Error setting up repository:', error);
      alert('Failed to setup repository');
    } finally {
      setLoading(false);
    }
  };

  const createBranch = async (branchName: string) => {
    try {
      const response = await fetch(
        `/widget/api/workflow/repositories/branches`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-external-id': externalId,
          },
          body: JSON.stringify({
            projectId: project.id,
            branchName,
            checkout: true,
          }),
        }
      );

      if (response.ok) {
        await fetchRepositoryStatus();
      } else {
        throw new Error('Failed to create branch');
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      alert('Failed to create branch');
    }
  };

  const getRepositoryIcon = (type: string) => {
    switch (type) {
      case 'github':
        return '🐙';
      case 'gitlab':
        return '🦊';
      case 'bitbucket':
        return '🪣';
      default:
        return '📁';
    }
  };

  const getStatusColor = (status: string[]) => {
    if (status.length === 0) return 'text-green-400';
    return 'text-yellow-400';
  };

  if (loading && !repoStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-widget-accent-start border-t-transparent rounded-full"></div>
        <span className="ml-2 text-widget-text-secondary">Loading repository...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-widget-accent-start" />
          <div>
            <h2 className="text-xl font-semibold text-widget-text-primary">
              Repository Settings
            </h2>
            <p className="text-widget-text-secondary text-sm">
              Manage version control and code repository
            </p>
          </div>
        </div>

        {repoStatus?.initialized && (
          <button
            onClick={fetchRepositoryStatus}
            className="p-2 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Repository Status Card */}
      <div className="bg-widget-surface rounded-lg p-6 border border-widget-border">
        {!repoStatus?.initialized ? (
          <div className="text-center py-8">
            <GitBranch className="w-12 h-12 mx-auto mb-4 text-widget-text-secondary opacity-50" />
            <h3 className="text-lg font-medium text-widget-text-primary mb-2">
              No Repository Connected
            </h3>
            <p className="text-widget-text-secondary mb-6">
              Connect or initialize a repository to enable version control features
            </p>
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Setup Repository
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Repository Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {getRepositoryIcon(repoStatus.type || 'git')}
                </span>
                <div>
                  <h3 className="font-medium text-widget-text-primary">
                    {repoStatus.type || 'Local Repository'}
                  </h3>
                  <p className="text-sm text-widget-text-secondary font-mono">
                    {repoStatus.url}
                  </p>
                </div>
              </div>

              {repoStatus.url && !repoStatus.url.startsWith('/') && (
                <button
                  onClick={() => window.open(repoStatus.url!, '_blank')}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-widget-accent-start hover:text-widget-accent-end transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Repository
                </button>
              )}
            </div>

            {/* Status Summary */}
            {repoStatus.status && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-widget-bg rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-widget-text-primary">
                    {repoStatus.currentBranch}
                  </div>
                  <div className="text-xs text-widget-text-secondary">Current Branch</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${getStatusColor(repoStatus.status.modified)}`}>
                    {repoStatus.status.modified.length}
                  </div>
                  <div className="text-xs text-widget-text-secondary">Modified</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${getStatusColor(repoStatus.status.added)}`}>
                    {repoStatus.status.added.length}
                  </div>
                  <div className="text-xs text-widget-text-secondary">Staged</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${getStatusColor(repoStatus.status.untracked)}`}>
                    {repoStatus.status.untracked.length}
                  </div>
                  <div className="text-xs text-widget-text-secondary">Untracked</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      {repoStatus?.initialized && (
        <>
          <div className="flex gap-1 bg-widget-surface p-1 rounded-lg">
            {[
              { key: 'settings', label: 'Settings', icon: Settings },
              { key: 'status', label: 'Status', icon: CheckCircle },
              { key: 'history', label: 'History', icon: GitBranch },
              { key: 'diff', label: 'Changes', icon: Copy },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === key
                    ? 'bg-widget-accent-start text-white'
                    : 'text-widget-text-secondary hover:text-widget-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-widget-surface rounded-lg p-6">
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-widget-text-primary">
                  Repository Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-widget-text-primary mb-2">
                      Repository URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={repoStatus.url || ''}
                        className="flex-1 px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                        readOnly
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(repoStatus.url || '')}
                        className="p-2 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-widget-text-primary mb-2">
                      Repository Type
                    </label>
                    <input
                      type="text"
                      value={repoStatus.type || ''}
                      className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                      readOnly
                    />
                  </div>
                </div>

                {/* Branch Management */}
                <div>
                  <h4 className="text-md font-medium text-widget-text-primary mb-3">
                    Branch Management
                  </h4>
                  <div className="space-y-2">
                    {repoStatus.branches?.map((branch) => (
                      <div
                        key={branch.name}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          branch.current
                            ? 'bg-widget-accent-start/10 border border-widget-accent-start/30'
                            : 'bg-widget-bg border border-widget-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-widget-text-secondary" />
                          <span className="font-mono text-sm text-widget-text-primary">
                            {branch.name}
                          </span>
                          {branch.current && (
                            <span className="text-xs bg-widget-accent-start/20 text-widget-accent-start px-2 py-1 rounded">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'status' && repoStatus.status && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-widget-text-primary">
                  Working Directory Status
                </h3>

                {['modified', 'added', 'deleted', 'untracked'].map((statusType) => {
                  const files = repoStatus.status![statusType as keyof typeof repoStatus.status] as string[];
                  if (files.length === 0) return null;

                  return (
                    <div key={statusType} className="space-y-2">
                      <h4 className="text-sm font-medium text-widget-text-primary capitalize">
                        {statusType} Files ({files.length})
                      </h4>
                      <div className="space-y-1">
                        {files.map((file) => (
                          <div
                            key={file}
                            className="flex items-center gap-2 p-2 bg-widget-bg rounded border border-widget-border"
                          >
                            <span className="font-mono text-sm text-widget-text-primary">
                              {file}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {Object.values(repoStatus.status).every((files) => files.length === 0) && (
                  <div className="text-center py-8 text-widget-text-secondary">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
                    <p>Working directory is clean</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <CommitHistory
                projectId={project.id}
                externalId={externalId}
                limit={10}
              />
            )}

            {activeTab === 'diff' && (
              <div className="space-y-4">
                <CodeDiffViewer
                  projectId={project.id}
                  externalId={externalId}
                  staged={false}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-widget-surface rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-widget-text-primary mb-4">
              Setup Repository
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Action
                </label>
                <select
                  value={setupForm.action}
                  onChange={(e) => setSetupForm({ ...setupForm, action: e.target.value as any })}
                  className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                >
                  <option value="connect">Connect Existing Repository</option>
                  <option value="clone">Clone Remote Repository</option>
                  <option value="init">Initialize New Repository</option>
                </select>
              </div>

              {setupForm.action !== 'init' && (
                <div>
                  <label className="block text-sm font-medium text-widget-text-primary mb-2">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={setupForm.repositoryUrl}
                    onChange={(e) => setSetupForm({ ...setupForm, repositoryUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                    placeholder="https://github.com/user/repo.git"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Repository Type
                </label>
                <select
                  value={setupForm.repositoryType}
                  onChange={(e) => setSetupForm({ ...setupForm, repositoryType: e.target.value })}
                  className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                >
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                  <option value="bitbucket">Bitbucket</option>
                  <option value="git">Generic Git</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 text-widget-text-secondary hover:text-widget-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetupRepository}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Setup Repository'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}