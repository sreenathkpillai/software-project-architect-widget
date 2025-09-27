'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/lib/auth-store';
import WorkflowApp from '@/components/workflow/WorkflowApp';
import { WidgetAuth } from '@/lib/auth';
import { WorkflowMode } from '@/types/workflow';

export default function WorkflowPage() {
  const [mode, setMode] = useState<WorkflowMode>('dashboard');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [storyId, setStoryId] = useState<string | undefined>();
  const [architectSessionId, setArchitectSessionId] = useState<string | undefined>();
  const [authConfig, setAuthConfig] = useState(WidgetAuth.extractAuthFromParams());

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);

    // Set mode from URL
    const urlMode = params.get('mode');
    if (urlMode && ['dashboard', 'project', 'story', 'implementation'].includes(urlMode)) {
      setMode(urlMode as WorkflowMode);
    }

    // Set IDs from URL
    const urlProjectId = params.get('projectId');
    if (urlProjectId) setProjectId(urlProjectId);

    const urlStoryId = params.get('storyId');
    if (urlStoryId) setStoryId(urlStoryId);

    // Check for Architect import
    const urlArchitectSessionId = params.get('architectSessionId');
    if (urlArchitectSessionId) {
      setArchitectSessionId(urlArchitectSessionId);
      setMode('import'); // Special mode for importing from Architect
    }

    // Update auth config with URL params
    const updatedConfig = WidgetAuth.extractAuthFromParams();
    setAuthConfig(updatedConfig);
  }, []);

  return (
    <AuthProvider config={authConfig}>
      <div className="workflow-container min-h-screen bg-widget-bg">
        <WorkflowApp
          mode={mode}
          projectId={projectId}
          storyId={storyId}
          architectSessionId={architectSessionId}
          onModeChange={setMode}
        />
      </div>
    </AuthProvider>
  );
}