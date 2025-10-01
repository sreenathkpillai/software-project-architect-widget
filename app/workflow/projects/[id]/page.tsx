'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import WorkflowApp from '@/components/workflow/WorkflowApp';
import ProjectDashboard from '@/components/workflow/ProjectDashboard';

function ProjectPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const externalId = searchParams.get('externalId');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (externalId && projectId) {
      setIsLoading(false);
    }
  }, [externalId, projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!externalId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Missing external ID parameter</div>
      </div>
    );
  }

  return (
    <WorkflowApp externalId={externalId}>
      <ProjectDashboard projectId={projectId} />
    </WorkflowApp>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ProjectPageContent />
    </Suspense>
  );
}