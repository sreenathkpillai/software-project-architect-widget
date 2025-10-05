'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkflow } from './WorkflowApp';
import GitHubAuthStatus from './GitHubAuthStatus';

interface RepositoryConnectorProps {
  projectId: string;
  project?: any;
  onClose: () => void;
  onConnected: () => void;
}

export default function RepositoryConnector({ projectId, project, onClose, onConnected }: RepositoryConnectorProps) {
  const { externalId } = useWorkflow();
  const [formData, setFormData] = useState({
    repositoryUrl: '',
    repositoryPath: '',
    branch: 'main',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [githubAuth, setGithubAuth] = useState({
    isAuthenticated: false,
    username: '',
    token: ''
  });
  const [showTokenModal, setShowTokenModal] = useState(false);
  const repositoryUrlRef = useRef<HTMLInputElement>(null);

  // Pre-populate repository URL and branch from project data
  useEffect(() => {
    if (project?.repositoryUrl || project?.branch) {
      setFormData(prev => ({
        ...prev,
        ...(project.repositoryUrl && { repositoryUrl: project.repositoryUrl }),
        ...(project.branch && { branch: project.branch })
      }));
    }
  }, [project]);

  // Check for existing GitHub authentication
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        const storedAuth = localStorage.getItem(`github_auth_${externalId}`);
        console.log('Checking GitHub auth for externalId:', externalId, 'Found:', !!storedAuth);

        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          console.log('Auth data:', { ...authData, token: authData.token ? '[REDACTED]' : 'none' });

          // Validate that the auth data is recent (within 24 hours)
          const authAge = Date.now() - (authData.timestamp || 0);
          if (authAge < 24 * 60 * 60 * 1000) { // 24 hours
            console.log('Setting authenticated state for user:', authData.username);
            setGithubAuth({
              isAuthenticated: true,
              username: authData.username || 'GitHub User',
              token: authData.token
            });
          } else {
            console.log('Auth expired, clearing');
            // Clear expired auth
            localStorage.removeItem(`github_auth_${externalId}`);
          }
        } else {
          console.log('No stored auth found');
        }
      } catch (error) {
        console.error('Error checking GitHub auth:', error);
        localStorage.removeItem(`github_auth_${externalId}`);
      }
    };

    if (externalId) {
      checkExistingAuth();
    }
  }, [externalId]);

  // Additional check when component mounts or when the modal becomes visible
  useEffect(() => {
    // More aggressive auth checking with multiple fallback keys
    const checkAllAuthKeys = () => {
      if (!externalId) return;

      // Check multiple possible auth keys
      const authKeys = [
        `github_auth_${externalId}`,
        'github_auth', // fallback without external id
        'github_auth_global' // global fallback
      ];

      for (const key of authKeys) {
        try {
          const storedAuth = localStorage.getItem(key);
          console.log(`Checking auth key: ${key}`, !!storedAuth);

          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            console.log(`Found auth data for key ${key}:`, { ...authData, token: authData.token ? '[REDACTED]' : 'none' });

            const authAge = Date.now() - (authData.timestamp || 0);
            if (authAge < 24 * 60 * 60 * 1000) {
              console.log(`Setting auth from key: ${key}`);
              setGithubAuth({
                isAuthenticated: true,
                username: authData.username || 'GitHub User',
                token: authData.token
              });
              return; // Stop checking once we find valid auth
            } else {
              console.log(`Auth expired for key: ${key}`);
            }
          }
        } catch (error) {
          console.error(`Error checking auth key ${key}:`, error);
        }
      }
    };

    // Check immediately
    checkAllAuthKeys();

    // Also check after a delay in case of timing issues
    const timer = setTimeout(checkAllAuthKeys, 200);

    return () => clearTimeout(timer);
  }, [externalId, githubAuth.isAuthenticated]);

  // Auto-focus repository URL field when GitHub is authenticated
  useEffect(() => {
    if (githubAuth.isAuthenticated && repositoryUrlRef.current) {
      repositoryUrlRef.current.focus();
    }
  }, [githubAuth.isAuthenticated]);

  const handleGithubAuth = () => {
    // Don't initiate auth if already authenticated
    if (githubAuth.isAuthenticated) {
      console.log('Already authenticated, skipping auth flow');
      return;
    }

    // Use GitHub OAuth flow
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError('GitHub OAuth not configured. Contact support.');
      return;
    }

    const scope = 'repo';
    const redirectUri = `${window.location.origin}/widget/api/auth/github/callback`;
    const state = Math.random().toString(36).substring(7);

    // Store state for verification
    localStorage.setItem('github_oauth_state', state);
    localStorage.setItem('github_oauth_project', projectId);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Listen for postMessage from popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'github-auth-success') {
        const authData = event.data.data;
        setGithubAuth({
          isAuthenticated: true,
          username: authData.username,
          token: authData.token
        });
        setError('');

        // Store auth data in localStorage for persistence (multiple keys for reliability)
        try {
          const authDataToStore = {
            username: authData.username,
            token: authData.token,
            timestamp: Date.now()
          };

          // Store with external ID
          localStorage.setItem(`github_auth_${externalId}`, JSON.stringify(authDataToStore));

          // Also store as global fallback
          localStorage.setItem('github_auth_global', JSON.stringify(authDataToStore));

          console.log('Auth data stored with keys:', [`github_auth_${externalId}`, 'github_auth_global']);
        } catch (error) {
          console.error('Error storing GitHub auth:', error);
        }

        // Clean up
        localStorage.removeItem('github_auth_result');
        localStorage.removeItem('github_oauth_state');
        localStorage.removeItem('github_oauth_project');
        window.removeEventListener('message', messageHandler);
      }
    };

    window.addEventListener('message', messageHandler);

    // Open popup window for OAuth
    const popup = window.open(
      authUrl,
      'github-oauth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    // Also check localStorage periodically as a fallback
    const checkAuth = setInterval(() => {
      const authResult = localStorage.getItem('github_auth_result');
      if (authResult) {
        try {
          const authData = JSON.parse(authResult);
          setGithubAuth({
            isAuthenticated: true,
            username: authData.username,
            token: authData.token
          });
          setError('');

          // Store auth data in localStorage for persistence
          try {
            localStorage.setItem(`github_auth_${externalId}`, JSON.stringify({
              username: authData.username,
              token: authData.token,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error storing GitHub auth:', error);
          }

          // Clean up
          localStorage.removeItem('github_auth_result');
          localStorage.removeItem('github_oauth_state');
          localStorage.removeItem('github_oauth_project');
          clearInterval(checkAuth);
          window.removeEventListener('message', messageHandler);
        } catch (err) {
          console.error('Failed to parse auth result:', err);
        }
      }

      // Also stop checking if popup is closed
      if (popup?.closed) {
        clearInterval(checkAuth);
        // Give it one more check after popup closes
        setTimeout(checkAuthStatus, 500);
      }
    }, 500);
  };

  const checkAuthStatus = async () => {
    try {
      // Check localStorage for auth result from popup
      const authResult = localStorage.getItem('github_auth_result');
      if (authResult) {
        const authData = JSON.parse(authResult);
        setGithubAuth({
          isAuthenticated: true,
          username: authData.username,
          token: authData.token
        });
        setError('');

        // Clean up localStorage
        localStorage.removeItem('github_auth_result');
        localStorage.removeItem('github_oauth_state');
        localStorage.removeItem('github_oauth_project');
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    }
  };

  const handleTokenSubmit = async (token: string) => {
    try {
      // Verify token by fetching user info
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setGithubAuth({
          isAuthenticated: true,
          username: userData.login,
          token: token
        });
        setShowTokenModal(false);
        setError('');
      } else {
        throw new Error('Invalid GitHub token');
      }
    } catch (err) {
      setError('Failed to authenticate with GitHub. Please check your token.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Only warn about GitHub auth, don't block - let backend handle if repo is actually private
      if (formData.repositoryUrl.includes('github.com') && !githubAuth.isAuthenticated) {
        console.warn('GitHub authentication not provided - will fail for private repositories');
      }

      const connectionData = {
        repositoryUrl: formData.repositoryUrl,
        branch: formData.branch,
        githubToken: githubAuth.isAuthenticated ? githubAuth.token : undefined
      };

      const response = await fetch(`/widget/api/workflow/projects/${projectId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...connectionData, externalId }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect repository');
      }

      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/90 backdrop-blur-md border border-purple-500/20 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Connect Repository</h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label htmlFor="repositoryUrl" className="block text-sm font-medium text-gray-300 mb-1">
              Repository URL
            </label>
            <input
              ref={repositoryUrlRef}
              id="repositoryUrl"
              type="url"
              required
              value={formData.repositoryUrl}
              onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://github.com/username/repo.git"
            />
          </div>

          {formData.repositoryUrl.includes('github.com') && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-300">GitHub Authentication</h4>
                {githubAuth.isAuthenticated ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-400 font-medium">Connected as {githubAuth.username}</span>
                  </div>
                ) : (
                  <span className="text-xs text-orange-400">⚠ Required for private repos</span>
                )}
              </div>
              {!githubAuth.isAuthenticated ? (
                <div>
                  <p className="text-xs text-gray-400 mb-3">
                    One-click authentication to access your private repositories securely.
                  </p>
                  <button
                    type="button"
                    onClick={handleGithubAuth}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>Connect with GitHub (Recommended)</span>
                  </button>
                  <div className="mt-2 text-xs text-gray-500">
                    Opens a secure popup - no manual tokens needed
                  </div>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowTokenModal(true)}
                      className="text-xs text-gray-400 hover:text-gray-300 underline"
                    >
                      Use Personal Access Token instead
                    </button>
                  </div>
                </div>
              ) : (
                <GitHubAuthStatus
                  projectId={projectId}
                  onSwitchAccount={() => {
                    // Reset local state after switching
                    setGithubAuth({ isAuthenticated: false, username: '', token: '' });
                  }}
                />
              )}
            </div>
          )}

          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-gray-300 mb-1">
              Branch
            </label>
            <input
              id="branch"
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="main"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Connecting...' : 'Connect Repository'}
            </button>
          </div>
        </form>
      </div>

      {showTokenModal && <GitHubTokenModal onSubmit={handleTokenSubmit} onClose={() => setShowTokenModal(false)} />}
    </div>
  );
}

function GitHubTokenModal({ onSubmit, onClose }: { onSubmit: (token: string) => void; onClose: () => void }) {
  const [token, setToken] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    await onSubmit(token.trim());
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg w-full max-w-lg mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Connect to GitHub</h3>
                <p className="text-sm text-gray-400">Authenticate to access private repositories</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2">📋 How to create a GitHub Personal Access Token:</h4>
              <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                <li>Go to <strong>GitHub.com → Settings → Developer settings</strong></li>
                <li>Click <strong>"Personal access tokens → Tokens (classic)"</strong></li>
                <li>Click <strong>"Generate new token (classic)"</strong></li>
                <li>Give it a name like <strong>"Workflow Manager"</strong></li>
                <li>Select <strong>"repo"</strong> scope for repository access</li>
                <li>Click <strong>"Generate token"</strong> and copy it</li>
              </ol>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="github-token" className="block text-sm font-medium text-gray-300 mb-2">
                  Personal Access Token
                </label>
                <input
                  id="github-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your token is stored securely and only used for repository access
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !token.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Authenticating...' : 'Authenticate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}