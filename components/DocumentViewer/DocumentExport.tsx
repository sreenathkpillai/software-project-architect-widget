'use client';

import { Document } from './types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface DocumentExportProps {
  documents: Document[];
  sessionName: string;
}

export default function DocumentExport({ documents, sessionName }: DocumentExportProps) {
  const downloadAllDocuments = async () => {
    const zip = new JSZip();
    
    // Add each document to the zip
    documents.forEach(doc => {
      const filename = `${doc.order.toString().padStart(2, '0')}-${doc.type}.md`;
      zip.file(filename, doc.content);
    });

    // Add a README with instructions
    const readmeContent = `# ${sessionName} - Architecture Documents

This package contains all 13 architecture documents generated for your project.

## Documents Included:
${documents.map(doc => `- ${doc.order.toString().padStart(2, '0')}-${doc.type}.md: ${doc.title}`).join('\n')}

## How to Use These Documents:

### With AI Coding Assistants
1. **Upload to Claude/ChatGPT**: Share these documents with your preferred AI coding assistant
2. **Context Window**: Upload documents in order of priority (PRD first, then technical specs)
3. **Implementation Flow**: Use the documents as a blueprint for step-by-step development

### With Development Teams  
1. **Project Kickoff**: Share the PRD and user flow documents with stakeholders
2. **Technical Planning**: Use architecture documents for sprint planning
3. **Development**: Reference specific documents during implementation phases

### Recommended Implementation Order:
1. Database Schema & API Specifications
2. Backend Architecture
3. Frontend Architecture & State Management
4. Testing Strategy Implementation
5. DevOps & Deployment Setup

Generated with Software Project Architect
Date: ${new Date().toLocaleDateString()}
`;
    
    zip.file('README.md', readmeContent);

    // Generate and download the zip
    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${sessionName.replace(/[^a-zA-Z0-9]/g, '-')}-architecture-docs.zip`;
    saveAs(content, filename);
  };

  return (
    <button
      onClick={downloadAllDocuments}
      disabled={documents.length === 0}
      style={{
        background: documents.length > 0 
          ? 'linear-gradient(135deg, var(--widget-primary), var(--widget-secondary))'
          : 'var(--widget-disabled)',
        color: 'white',
        borderRadius: 'var(--widget-border-radius-medium)',
        opacity: documents.length > 0 ? 1 : 0.5
      }}
      className="px-6 py-3 hover:opacity-90 transition-opacity font-medium flex items-center gap-2"
    >
      <span>📦</span>
      Download All ({documents.length} docs)
    </button>
  );
}