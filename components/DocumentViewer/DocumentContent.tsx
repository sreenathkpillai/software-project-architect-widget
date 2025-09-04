'use client';

import { Document, documentTypes } from './types';
import { saveAs } from 'file-saver';

interface DocumentContentProps {
  document: Document | null;
  sessionName: string;
}

export default function DocumentContent({ document, sessionName }: DocumentContentProps) {
  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{color: 'var(--widget-text-muted)'}} className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <div className="text-lg font-medium mb-2">Select a document to view</div>
          <div className="text-sm">Choose a document from the sidebar to get started</div>
        </div>
      </div>
    );
  }

  const docMeta = documentTypes.find(d => d.type === document.type);

  const downloadDocument = () => {
    const filename = `${sessionName.replace(/[^a-zA-Z0-9]/g, '-')}-${document.type}.md`;
    const blob = new Blob([document.content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div style={{background: 'var(--widget-surface)', borderBottomColor: 'var(--widget-border-color)'}} className="border-b p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{docMeta?.icon}</span>
          <div>
            <h1 style={{color: 'var(--widget-text-primary)', fontSize: 'var(--widget-font-size-xlarge)', fontWeight: 'var(--widget-font-weight-bold)'}}>
              {document.title}
            </h1>
            {document.description && (
              <p style={{color: 'var(--widget-text-secondary)'}} className="text-sm mt-1">
                {document.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={downloadDocument}
          style={{
            background: 'var(--widget-accent)',
            color: 'white',
            borderRadius: 'var(--widget-border-radius-medium)'
          }}
          className="px-4 py-2 hover:opacity-90 transition-opacity font-medium text-sm"
        >
          Download
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div 
          style={{
            color: 'var(--widget-text-primary)',
            lineHeight: '1.7'
          }}
          className="prose prose-invert max-w-none"
        >
          <pre 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--widget-border-radius-medium)',
              padding: '1.5rem',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '14px'
            }}
            className="border border-opacity-20"
          >
            {document.content}
          </pre>
        </div>
      </div>
    </div>
  );
}