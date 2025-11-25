'use client';

import React, { useState } from 'react';

interface StoryData {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  storyPoints?: string | number;
}

interface OptimizedStory {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  storyPoints?: number;
  changes: {
    field: string;
    original: string;
    optimized: string;
    reason: string;
  }[];
}

interface StoryPreviewProps {
  originalStory: StoryData;
  optimizedStory: OptimizedStory;
  selectedOptimizations: Record<string, boolean>;
  onSelectionChange: (selections: Record<string, boolean>) => void;
  onApply: () => void;
  onCancel: () => void;
}

type ViewMode = 'changes' | 'side-by-side' | 'unified';

export default function StoryPreview({
  originalStory,
  optimizedStory,
  selectedOptimizations,
  onSelectionChange,
  onApply,
  onCancel,
}: StoryPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('changes');
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const fields = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'acceptanceCriteria', label: 'Acceptance Criteria' },
    { key: 'priority', label: 'Priority' },
    { key: 'storyPoints', label: 'Story Points' },
  ];

  const hasChanges = optimizedStory.changes.length > 0;

  const toggleSelection = (field: string) => {
    onSelectionChange({
      ...selectedOptimizations,
      [field]: !selectedOptimizations[field],
    });
  };

  const selectAll = () => {
    const allSelected: Record<string, boolean> = {};
    optimizedStory.changes.forEach((change) => {
      allSelected[change.field] = true;
    });
    onSelectionChange(allSelected);
  };

  const selectNone = () => {
    onSelectionChange({});
  };

  const getFieldValue = (story: StoryData | OptimizedStory, field: string): string => {
    const value = (story as any)[field];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const renderDiff = (original: string, optimized: string) => {
    // Simple line-by-line diff visualization
    const originalLines = original.split('\n');
    const optimizedLines = optimized.split('\n');

    return (
      <div className="space-y-1 text-sm">
        <div className="text-red-400/70">
          {originalLines.map((line, i) => (
            <div key={`orig-${i}`} className="flex">
              <span className="text-red-500 mr-2">-</span>
              <span className="line-through opacity-60">{line || '(empty)'}</span>
            </div>
          ))}
        </div>
        <div className="text-green-400">
          {optimizedLines.map((line, i) => (
            <div key={`opt-${i}`} className="flex">
              <span className="text-green-500 mr-2">+</span>
              <span>{line || '(empty)'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Story Preview</h4>
            <p className="text-xs text-gray-400">
              {hasChanges
                ? `${optimizedStory.changes.length} optimization${optimizedStory.changes.length > 1 ? 's' : ''} suggested`
                : 'No changes suggested'}
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('changes')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'changes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Changes
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'side-by-side' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === 'unified' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Unified
              </button>
            </div>
          )}
        </div>

        {/* Select all/none */}
        {hasChanges && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Select all
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={selectNone}
              className="text-xs text-gray-400 hover:text-gray-300"
            >
              Select none
            </button>
          </div>
        )}
      </div>

      {/* Changes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasChanges ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-400">
              Your story looks good! No optimizations needed.
            </p>
          </div>
        ) : viewMode === 'changes' ? (
          // Changes view - show each change with toggle
          optimizedStory.changes.map((change) => (
            <div
              key={change.field}
              className={`rounded-lg border transition-colors ${
                selectedOptimizations[change.field]
                  ? 'border-purple-500/50 bg-purple-900/20'
                  : 'border-gray-700 bg-gray-800/30'
              }`}
            >
              <div
                className="px-4 py-3 cursor-pointer flex items-center justify-between"
                onClick={() => toggleSelection(change.field)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedOptimizations[change.field] || false}
                    onChange={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 pointer-events-none"
                  />
                  <div>
                    <span className="text-sm font-medium text-white capitalize">
                      {change.field.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{change.reason}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedField(expandedField === change.field ? null : change.field);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      expandedField === change.field ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {expandedField === change.field && (
                <div className="px-4 pb-4 border-t border-gray-700/50 mt-2 pt-3">
                  {renderDiff(change.original, change.optimized)}
                </div>
              )}
            </div>
          ))
        ) : viewMode === 'side-by-side' ? (
          // Side by side comparison
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Original</h5>
              <div className="space-y-4">
                {fields.map((field) => {
                  const originalValue = getFieldValue(originalStory, field.key);
                  const hasChange = optimizedStory.changes.some((c) => c.field === field.key);
                  return (
                    <div
                      key={field.key}
                      className={`p-3 rounded-lg ${hasChange ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800/30'}`}
                    >
                      <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        {originalValue || <span className="text-gray-500 italic">Empty</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h5 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Optimized</h5>
              <div className="space-y-4">
                {fields.map((field) => {
                  const optimizedValue = getFieldValue(optimizedStory, field.key);
                  const hasChange = optimizedStory.changes.some((c) => c.field === field.key);
                  return (
                    <div
                      key={field.key}
                      className={`p-3 rounded-lg ${hasChange ? 'bg-green-900/20 border border-green-500/30' : 'bg-gray-800/30'}`}
                    >
                      <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        {optimizedValue || <span className="text-gray-500 italic">Empty</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Unified view - show final result with highlights
          <div className="space-y-4">
            {fields.map((field) => {
              const change = optimizedStory.changes.find((c) => c.field === field.key);
              const isSelected = selectedOptimizations[field.key];
              const displayValue = isSelected && change
                ? change.optimized
                : getFieldValue(originalStory, field.key);

              return (
                <div
                  key={field.key}
                  className={`p-3 rounded-lg ${
                    change
                      ? isSelected
                        ? 'bg-green-900/20 border border-green-500/30'
                        : 'bg-gray-800/30 border border-gray-700'
                      : 'bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-500">{field.label}</div>
                    {change && (
                      <button
                        onClick={() => toggleSelection(field.key)}
                        className={`text-xs ${
                          isSelected ? 'text-green-400' : 'text-gray-500'
                        } hover:text-white transition-colors`}
                      >
                        {isSelected ? '✓ Using optimized' : 'Use optimized'}
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">
                    {displayValue || <span className="text-gray-500 italic">Empty</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <button
          onClick={onApply}
          disabled={hasChanges && Object.values(selectedOptimizations).every((v) => !v)}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Apply {hasChanges ? `${Object.values(selectedOptimizations).filter(Boolean).length} Selection${Object.values(selectedOptimizations).filter(Boolean).length !== 1 ? 's' : ''}` : 'Changes'}
        </button>
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
