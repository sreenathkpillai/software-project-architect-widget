'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';

interface GitHubAuthStatusProps {
  onSwitchAccount?: () => void;
  compact?: boolean; // For different display modes
  projectId?: string; // For triggering auth flow
}

export default function GitHubAuthStatus({ onSwitchAccount, compact = false, projectId }: GitHubAuthStatusProps) {
  const { externalId } = useWorkflow();
  const [githubAuth, setGithubAuth] = useState({
    isAuthenticated: false,
    username: '',
    token: ''
  });

  // Check for existing GitHub authentication
  useEffect(() => {
    const checkAuthStatus = () => {
      if (!externalId) return;

      try {
        // Check multiple possible auth keys
        const authKeys = [
          `github_auth_${externalId}`,
          'github_auth_global',
          'github_auth'
        ];

        for (const key of authKeys) {
          const storedAuth = localStorage.getItem(key);
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            const authAge = Date.now() - (authData.timestamp || 0);

            // Check if auth is still valid (within 24 hours)
            if (authAge < 24 * 60 * 60 * 1000) {
              setGithubAuth({
                isAuthenticated: true,
                username: authData.username || 'GitHub User',
                token: authData.token
              });
              return;
            }
          }
        }

        // No valid auth found
        setGithubAuth({
          isAuthenticated: false,
          username: '',
          token: ''
        });
      } catch (error) {
        console.error('Error checking GitHub auth status:', error);
        setGithubAuth({
          isAuthenticated: false,
          username: '',
          token: ''
        });
      }
    };

    checkAuthStatus();

    // Also check periodically in case auth changes in another tab
    const interval = setInterval(checkAuthStatus, 5000);
    return () => clearInterval(interval);
  }, [externalId]);

  const triggerGitHubAuth = () => {
    // Use GitHub OAuth flow
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('GitHub OAuth not configured');
      return;
    }

    const scope = 'repo';
    const redirectUri = `${window.location.origin}/widget/api/auth/github/callback`;
    const state = Math.random().toString(36).substring(7);

    // Store state for verification
    localStorage.setItem('github_oauth_state', state);
    if (projectId) {
      localStorage.setItem('github_oauth_project', projectId);
    }

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

        // Store auth data in localStorage for persistence
        try {
          const authDataToStore = {
            username: authData.username,
            token: authData.token,
            timestamp: Date.now()
          };

          // Store with external ID and as global fallback
          localStorage.setItem(`github_auth_${externalId}`, JSON.stringify(authDataToStore));
          localStorage.setItem('github_auth_global', JSON.stringify(authDataToStore));

          console.log('New GitHub account authenticated:', authData.username);
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
      }
    }, 500);
  };

  const handleSwitchAccount = () => {
    console.log('Switching GitHub account - clearing all auth storage');

    // Clear all GitHub auth storage
    try {
      const authKeys = [
        `github_auth_${externalId}`,
        'github_auth',
        'github_auth_global',
        'github_auth_result',
        'github_oauth_state',
        'github_oauth_project'
      ];

      authKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Cleared auth key: ${key}`);
      });

      // Update local state
      setGithubAuth({
        isAuthenticated: false,
        username: '',
        token: ''
      });

      console.log('All GitHub authentication data cleared - ready to switch accounts');

      // Trigger parent callback if provided
      if (onSwitchAccount) {
        onSwitchAccount();
      }

      // Automatically trigger new auth flow
      setTimeout(() => {
        console.log('Automatically starting new GitHub auth flow...');
        triggerGitHubAuth();
      }, 500);
    } catch (error) {
      console.error('Error clearing GitHub auth:', error);
    }
  };

  // Always render - show authentication status (connected/disconnected)

  if (compact) {
    // Compact version for project title area
    if (githubAuth.isAuthenticated) {
      return (
        <div className="flex items-center space-x-2 ml-4">
          <div className="flex items-center space-x-2 text-xs text-green-300 bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>GitHub: {githubAuth.username}</span>
            <button
              onClick={handleSwitchAccount}
              className="ml-2 px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      );
    } else {
      // Show disconnected state
      return (
        <div className="flex items-center space-x-2 ml-4">
          <div className="flex items-center space-x-2 text-xs text-red-300 bg-red-900/20 px-3 py-1 rounded-full border border-red-500/20">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span>GitHub: Disconnected</span>
            <button
              onClick={triggerGitHubAuth}
              className="ml-2 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      );
    }
  }

  // Full version for modal
  if (githubAuth.isAuthenticated) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-xs text-green-300 bg-green-900/20 px-2 py-1 rounded">
          🔒 Private repositories accessible as {githubAuth.username}
        </div>
        <button
          onClick={handleSwitchAccount}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
        >
          Switch Account
        </button>
      </div>
    );
  } else {
    return (
      <div className="flex items-center justify-between">
        <div className="text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded">
          ⚠️ GitHub disconnected - repository analysis limited
        </div>
        <button
          onClick={triggerGitHubAuth}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        >
          Connect GitHub
        </button>
      </div>
    );
  }
}