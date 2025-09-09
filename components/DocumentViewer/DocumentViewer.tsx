'use client';

import { useState, useEffect } from 'react';
import { Document, DocumentViewerProps } from './types';
import { getApiUrl } from '@/lib/api-config';
import DocumentSidebar from './DocumentSidebar';
import DocumentContent from './DocumentContent';
import DocumentExport from './DocumentExport';

export default function DocumentViewer({ sessionId, externalId, sessionName = 'Project' }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('prd'); // Default to PRD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [sessionId, externalId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl(`sessions/${sessionId}/documents`)}?externalId=${externalId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents);
      
      // If PRD doesn't exist, select the first available document
      if (!data.documents.find((d: Document) => d.type === 'prd') && data.documents.length > 0) {
        setSelectedDoc(data.documents[0].type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{background: 'var(--widget-background)'}} className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
          <p className="text-white">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{background: 'var(--widget-background)'}} className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 style={{color: 'var(--widget-text-primary)'}} className="text-xl font-semibold mb-2">
            Error Loading Documents
          </h2>
          <p style={{color: 'var(--widget-text-secondary)'}} className="mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--widget-primary)',
              color: 'white',
              borderRadius: 'var(--widget-border-radius-medium)'
            }}
            className="px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedDocument = documents.find(d => d.type === selectedDoc);

  return (
    <div style={{background: 'var(--widget-background)'}} className="h-screen flex flex-col">
      {/* Header with export */}
      <div style={{background: 'var(--widget-surface)', borderBottomColor: 'var(--widget-border-color)'}} className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 style={{color: 'var(--widget-text-primary)', fontSize: 'var(--widget-font-size-large)', fontWeight: 'var(--widget-font-weight-bold)'}}>
            {sessionName} - Documents
          </h1>
          <p style={{color: 'var(--widget-text-secondary)'}} className="text-sm">
            Generated architecture specifications
          </p>
        </div>
        <DocumentExport documents={documents} sessionName={sessionName} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <DocumentSidebar 
          documents={documents}
          selectedDoc={selectedDoc}
          onSelectDoc={setSelectedDoc}
        />
        <DocumentContent 
          document={selectedDocument || null}
          sessionName={sessionName}
        />
      </div>
    </div>
  );
}