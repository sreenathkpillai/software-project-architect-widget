'use client';

import React, { useState } from 'react';
import { UserStory, WorkflowProject } from '@/types/workflow';
import { Wand2, Code, FileText, Download, Sparkles, Settings } from 'lucide-react';

interface PromptPackGeneratorProps {
  project: WorkflowProject;
  story: UserStory;
  onGenerated: (promptPack: any) => void;
  onClose: () => void;
}

export default function PromptPackGenerator({
  project,
  story,
  onGenerated,
  onClose,
}: PromptPackGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [customizations, setCustomizations] = useState({
    includeContext: true,
    includeTests: true,
    includeDocumentation: true,
    codeStyle: 'typescript',
    framework: 'react',
    testingFramework: 'jest',
    architecture: 'clean',
  });
  const [generatedPack, setGeneratedPack] = useState<any>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/workflow/prompt-packs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-external-id': project.externalId,
        },
        body: JSON.stringify({
          projectId: project.id,
          storyId: story.id,
          customizations,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate prompt pack');
      }

      const promptPack = await response.json();
      setGeneratedPack(promptPack);
      onGenerated(promptPack);
    } catch (error) {
      console.error('Error generating prompt pack:', error);
      alert('Failed to generate prompt pack');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (format: 'json' | 'markdown' | 'txt') => {
    if (!generatedPack) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'json':
        content = JSON.stringify(generatedPack, null, 2);
        filename = `${story.title.replace(/\s+/g, '_')}_prompts.json`;
        mimeType = 'application/json';
        break;
      case 'markdown':
        content = formatAsMarkdown(generatedPack);
        filename = `${story.title.replace(/\s+/g, '_')}_prompts.md`;
        mimeType = 'text/markdown';
        break;
      case 'txt':
        content = formatAsPlainText(generatedPack);
        filename = `${story.title.replace(/\s+/g, '_')}_prompts.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatAsMarkdown = (pack: any) => {
    let md = `# Prompt Pack: ${pack.name}\n\n`;
    md += `**Project:** ${project.name}\n`;
    md += `**User Story:** ${story.title}\n`;
    md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    md += `## Story Context\n\n`;
    md += `${pack.context}\n\n`;

    pack.prompts.forEach((prompt: any, index: number) => {
      md += `## ${index + 1}. ${prompt.title}\n\n`;
      md += `**Type:** ${prompt.type}\n`;
      md += `**Purpose:** ${prompt.purpose}\n\n`;
      md += `### Prompt\n\n`;
      md += `\`\`\`\n${prompt.content}\n\`\`\`\n\n`;
      if (prompt.expectedOutput) {
        md += `### Expected Output\n\n${prompt.expectedOutput}\n\n`;
      }
      md += '---\n\n';
    });

    return md;
  };

  const formatAsPlainText = (pack: any) => {
    let txt = `PROMPT PACK: ${pack.name}\n`;
    txt += `PROJECT: ${project.name}\n`;
    txt += `USER STORY: ${story.title}\n`;
    txt += `GENERATED: ${new Date().toLocaleDateString()}\n\n`;

    txt += `STORY CONTEXT:\n${pack.context}\n\n`;

    pack.prompts.forEach((prompt: any, index: number) => {
      txt += `${index + 1}. ${prompt.title.toUpperCase()}\n`;
      txt += `Type: ${prompt.type}\n`;
      txt += `Purpose: ${prompt.purpose}\n\n`;
      txt += `PROMPT:\n${prompt.content}\n\n`;
      if (prompt.expectedOutput) {
        txt += `EXPECTED OUTPUT:\n${prompt.expectedOutput}\n\n`;
      }
      txt += '='.repeat(50) + '\n\n';
    });

    return txt;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-widget-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-widget-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wand2 className="w-6 h-6 text-widget-accent-start" />
              <div>
                <h2 className="text-xl font-semibold text-widget-text-primary">
                  Generate Prompt Pack
                </h2>
                <p className="text-widget-text-secondary text-sm">
                  AI-powered development prompts for: {story.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-widget-text-secondary hover:text-widget-text-primary"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* Customization Panel */}
          <div className="w-80 p-6 border-r border-widget-border overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-widget-accent-start" />
              <h3 className="font-semibold text-widget-text-primary">Customization</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Include Options
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'includeContext', label: 'Project Context' },
                    { key: 'includeTests', label: 'Test Generation' },
                    { key: 'includeDocumentation', label: 'Documentation' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={customizations[key as keyof typeof customizations] as boolean}
                        onChange={(e) =>
                          setCustomizations({
                            ...customizations,
                            [key]: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-widget-text-secondary">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Code Style
                </label>
                <select
                  value={customizations.codeStyle}
                  onChange={(e) =>
                    setCustomizations({ ...customizations, codeStyle: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Framework
                </label>
                <select
                  value={customizations.framework}
                  onChange={(e) =>
                    setCustomizations({ ...customizations, framework: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                >
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="angular">Angular</option>
                  <option value="nextjs">Next.js</option>
                  <option value="express">Express</option>
                  <option value="fastapi">FastAPI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Testing Framework
                </label>
                <select
                  value={customizations.testingFramework}
                  onChange={(e) =>
                    setCustomizations({ ...customizations, testingFramework: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                >
                  <option value="jest">Jest</option>
                  <option value="vitest">Vitest</option>
                  <option value="pytest">Pytest</option>
                  <option value="junit">JUnit</option>
                  <option value="go-test">Go Test</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-widget-text-primary mb-2">
                  Architecture
                </label>
                <select
                  value={customizations.architecture}
                  onChange={(e) =>
                    setCustomizations({ ...customizations, architecture: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-widget-bg border border-widget-border rounded-lg text-widget-text-primary"
                >
                  <option value="clean">Clean Architecture</option>
                  <option value="mvc">MVC</option>
                  <option value="microservices">Microservices</option>
                  <option value="layered">Layered</option>
                  <option value="hexagonal">Hexagonal</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-widget-accent-start to-widget-accent-end text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate Prompts'}
            </button>
          </div>

          {/* Results Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!generatedPack && !generating && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Wand2 className="w-16 h-16 text-widget-text-secondary opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-widget-text-primary mb-2">
                  Ready to Generate Prompts
                </h3>
                <p className="text-widget-text-secondary mb-6">
                  Configure your preferences and click "Generate Prompts" to create AI-powered
                  development prompts for this user story.
                </p>
                <div className="text-sm text-widget-text-secondary space-y-1">
                  <p>• Implementation prompts for code generation</p>
                  <p>• Testing prompts for comprehensive coverage</p>
                  <p>• Documentation prompts for clear explanations</p>
                  <p>• Review prompts for quality assurance</p>
                </div>
              </div>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-widget-accent-start border-t-transparent rounded-full mb-4"></div>
                <p className="text-widget-text-primary">Generating AI prompts...</p>
                <p className="text-widget-text-secondary text-sm mt-2">
                  Analyzing story context and creating tailored prompts
                </p>
              </div>
            )}

            {generatedPack && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-widget-text-primary">
                      {generatedPack.name}
                    </h3>
                    <p className="text-widget-text-secondary text-sm">
                      {generatedPack.prompts?.length || 0} prompts generated
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload('json')}
                      className="px-3 py-1 text-xs bg-widget-bg border border-widget-border rounded hover:bg-widget-surface transition-colors"
                      title="Download as JSON"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => handleDownload('markdown')}
                      className="px-3 py-1 text-xs bg-widget-bg border border-widget-border rounded hover:bg-widget-surface transition-colors"
                      title="Download as Markdown"
                    >
                      MD
                    </button>
                    <button
                      onClick={() => handleDownload('txt')}
                      className="px-3 py-1 text-xs bg-widget-bg border border-widget-border rounded hover:bg-widget-surface transition-colors"
                      title="Download as Text"
                    >
                      TXT
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedPack.prompts?.map((prompt: any, index: number) => (
                    <div key={index} className="bg-widget-bg rounded-lg p-4 border border-widget-border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-widget-accent-start" />
                          <h4 className="font-medium text-widget-text-primary">{prompt.title}</h4>
                        </div>
                        <span className="text-xs px-2 py-1 bg-widget-surface rounded text-widget-text-secondary">
                          {prompt.type}
                        </span>
                      </div>

                      <p className="text-widget-text-secondary text-sm mb-3">{prompt.purpose}</p>

                      <div className="bg-widget-surface rounded p-3">
                        <pre className="text-sm text-widget-text-primary whitespace-pre-wrap">
                          {prompt.content}
                        </pre>
                      </div>

                      {prompt.expectedOutput && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-widget-text-secondary mb-2">
                            Expected Output:
                          </p>
                          <p className="text-sm text-widget-text-secondary">{prompt.expectedOutput}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}