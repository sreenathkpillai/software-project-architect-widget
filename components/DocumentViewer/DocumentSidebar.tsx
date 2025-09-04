'use client';

import { Document, documentTypes } from './types';

interface DocumentSidebarProps {
  documents: Document[];
  selectedDoc: string;
  onSelectDoc: (docType: string) => void;
}

export default function DocumentSidebar({ documents, selectedDoc, onSelectDoc }: DocumentSidebarProps) {
  return (
    <div style={{background: 'var(--widget-surface)', borderRightColor: 'var(--widget-border-color)'}} className="w-80 border-r h-full flex flex-col">
      <div className="p-6 border-b" style={{borderBottomColor: 'var(--widget-border-color)'}}>
        <h2 style={{color: 'var(--widget-text-primary)', fontSize: 'var(--widget-font-size-large)', fontWeight: 'var(--widget-font-weight-bold)'}}>
          Architecture Documents
        </h2>
        <p style={{color: 'var(--widget-text-secondary)'}} className="text-sm mt-1">
          {documents.length} of 13 documents generated
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {documentTypes.map((docType) => {
            const doc = documents.find(d => d.type === docType.type);
            const isSelected = selectedDoc === docType.type;
            const isAvailable = !!doc;

            return (
              <button
                key={docType.type}
                onClick={() => isAvailable && onSelectDoc(docType.type)}
                disabled={!isAvailable}
                style={{
                  background: isSelected 
                    ? 'linear-gradient(135deg, #10b981, #3b82f6)'
                    : isAvailable 
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'transparent',
                  color: isAvailable ? 'var(--widget-text-primary)' : 'var(--widget-text-muted)',
                  borderRadius: 'var(--widget-border-radius-medium)',
                  opacity: isAvailable ? 1 : 0.5
                }}
                className={`w-full text-left p-3 transition-all ${
                  isAvailable ? 'hover:bg-opacity-20 cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{docType.icon}</span>
                  <div className="flex-1">
                    <div style={{
                      fontWeight: isSelected ? 'var(--widget-font-weight-bold)' : 'var(--widget-font-weight-medium)'
                    }} className="text-sm">
                      {docType.title}
                    </div>
                    {isAvailable && (
                      <div style={{color: 'var(--widget-text-muted)'}} className="text-xs mt-0.5">
                        ✓ Generated
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}