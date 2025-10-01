'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import WorkflowApp from '@/components/workflow/WorkflowApp';
import ProjectList from '@/components/workflow/ProjectList';

function WorkflowPageContent() {
  const searchParams = useSearchParams();
  const externalId = searchParams.get('externalId');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (externalId) {
      setIsLoading(false);
    }
  }, [externalId]);

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
      <ProjectList />
    </WorkflowApp>
  );
}

export default function WorkflowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <WorkflowPageContent />
    </Suspense>
  );
}