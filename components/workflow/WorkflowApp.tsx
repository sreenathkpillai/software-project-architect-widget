'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-store';
import { WorkflowMode, WorkflowProject } from '@/types/workflow';
import ProjectDashboard from './ProjectDashboard';
import ProjectDetail from './ProjectDetail';
import ArchitectImport from './ArchitectImport';
import { getApiUrl } from '@/lib/api-config';

interface WorkflowAppProps {
  mode: WorkflowMode;
  projectId?: string;
  storyId?: string;
  architectSessionId?: string;
  onModeChange: (mode: WorkflowMode) => void;
}

export default function WorkflowApp({
  mode,
  projectId,
  storyId,
  architectSessionId,
  onModeChange,
}: WorkflowAppProps) {
  const { externalId, widgetAuth, isAuthenticating, authError } = useAuth();
  const [projects, setProjects] = useState<WorkflowProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<WorkflowProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects when authenticated
  useEffect(() => {
    if (externalId && !isAuthenticating) {
      fetchProjects();
    }
  }, [externalId, isAuthenticating]);

  // Load specific project if projectId is provided
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projectId, projects]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/workflow/projects'), {
        headers: {
          'x-external-id': externalId || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: Partial<WorkflowProject>) => {
    try {
      const response = await fetch(getApiUrl('/api/workflow/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': externalId || '',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json();
      setProjects([...projects, newProject]);
      setSelectedProject(newProject);
      onModeChange('project');
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
    }
  };

  const handleSelectProject = (project: WorkflowProject) => {
    setSelectedProject(project);
    onModeChange('project');
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    onModeChange('dashboard');
  };

  // Handle authentication states
  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-widget-text-secondary">
          Authenticating...
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">
          Authentication failed: {authError}
        </div>
      </div>
    );
  }

  if (!externalId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-widget-text-secondary">
          Missing authentication credentials
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-widget-text-secondary">
          Loading workflow...
        </div>
      </div>
    );
  }

  // Render based on mode
  switch (mode) {
    case 'import':
      if (!architectSessionId) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="text-lg text-red-500">
              No Architect session specified for import
            </div>
          </div>
        );
      }
      return (
        <ArchitectImport
          architectSessionId={architectSessionId}
          externalId={externalId}
          onProjectCreated={(project) => {
            setProjects([...projects, project]);
            setSelectedProject(project);
            onModeChange('project');
          }}
          onCancel={handleBackToDashboard}
        />
      );

    case 'project':
      if (!selectedProject) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="text-lg text-red-500">
              No project selected
            </div>
          </div>
        );
      }
      return (
        <ProjectDetail
          project={selectedProject}
          externalId={externalId}
          onBack={handleBackToDashboard}
        />
      );

    case 'dashboard':
    default:
      return (
        <ProjectDashboard
          projects={projects}
          externalId={externalId}
          onCreateProject={handleCreateProject}
          onSelectProject={handleSelectProject}
          onRefresh={fetchProjects}
        />
      );
  }
}