'use client';

import React, { useState, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';

interface CodebaseEditPanelProps {
  projectId: string;
  project: any;
  analysis: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function CodebaseEditPanel({
  projectId,
  project,
  analysis,
  onClose,
  onSaved
}: CodebaseEditPanelProps) {
  const { externalId } = useWorkflow();
  const [editContent, setEditContent] = useState(analysis?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (analysis) {
      setEditContent(analysis.content || '');
    }
  }, [analysis]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/widget/api/workflow/projects/${projectId}/analysis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId, content: editContent }),
      });

      if (response.ok) {
        onSaved();
      }
    } catch (error) {
      console.error('Failed to update analysis:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(analysis?.content || '');
    onClose();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/60 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">Edit Codebase Analysis</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 min-h-0">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-full bg-gray-800 text-gray-100 p-3 rounded border border-gray-700 focus:outline-none focus:border-purple-500 font-mono text-sm resize-none"
          placeholder="Enter your codebase analysis in markdown format..."
        />
      </div>

      <div className="px-4 py-2 border-t border-gray-800 flex-shrink-0">
        <p className="text-xs text-gray-500">
          Tip: Use markdown formatting for headings (# ## ###), lists (- or *), and code blocks (```)
        </p>
      </div>
    </div>
  );
}
