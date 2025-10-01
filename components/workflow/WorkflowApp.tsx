'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WorkflowContextType {
  externalId: string;
  projects: any[];
  selectedProject: any;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowApp');
  }
  return context;
};

interface WorkflowAppProps {
  children: React.ReactNode;
  externalId: string;
}

export default function WorkflowApp({ children, externalId }: WorkflowAppProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshProjects = async () => {
    try {
      const response = await fetch(`/widget/api/workflow/projects?externalId=${externalId}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, [externalId]);

  return (
    <WorkflowContext.Provider
      value={{
        externalId,
        projects,
        selectedProject,
        isLoading,
        refreshProjects,
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100">
        {!externalId && (
          <header className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-white">
                    Workflow Manager
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push(`/workflow?externalId=${externalId}`)}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Projects
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}
        <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${externalId ? 'py-4' : 'py-8'}`}>
          {children}
        </main>
      </div>
    </WorkflowContext.Provider>
  );
}