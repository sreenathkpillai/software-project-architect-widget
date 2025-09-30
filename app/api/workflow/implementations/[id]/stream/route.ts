import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AIService, AIConfig } from '@/lib/ai-service';
import { GitService } from '@/lib/git-service';

interface StreamData {
  type: 'phase' | 'output' | 'file' | 'error' | 'complete';
  phase?: string;
  message?: string;
  progress?: number;
  content?: string;
  file?: { path: string; content: string; language: string };
  implementation?: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.headers.get('x-external-id') || request.nextUrl.searchParams.get('externalId');
    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 401 });
    }

    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid external ID' }, { status: 401 });
    }

    const implementation = await prisma.implementation.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        story: true,
        promptPack: true,
      }
    });

    if (!implementation) {
      return NextResponse.json({ error: 'Implementation not found' }, { status: 404 });
    }

    if (implementation.externalId !== externalId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: StreamData) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Update implementation status to running
          await prisma.implementation.update({
            where: { id: params.id },
            data: { status: 'running', startedAt: new Date() }
          });

          // Parse config
          const config: AIConfig = JSON.parse(implementation.config as string);

          // Initialize AI service
          const aiService = new AIService({
            provider: config.provider,
            apiKey: process.env[`${config.provider.toUpperCase()}_API_KEY`],
            model: config.model,
          });

          // Initialize Git service if repository is configured
          let gitService: GitService | null = null;
          if (implementation.project.repositoryPath) {
            gitService = new GitService(implementation.project.repositoryPath);
          }

          sendEvent({
            type: 'phase',
            phase: 'planning',
            message: 'Analyzing user story and generating implementation plan...',
            progress: 10
          });

          // Parse prompt pack
          const prompts = JSON.parse(implementation.promptPack.prompts);
          const context = implementation.promptPack.context;

          // Phase 1: Planning
          const planningPrompt = prompts.planning || prompts.implementation;
          const planningResponse = await aiService.generateImplementation({
            prompt: planningPrompt,
            context: context,
            language: implementation.story.acceptanceCriteria?.includes('TypeScript') ? 'typescript' : 'javascript',
            framework: implementation.story.acceptanceCriteria?.includes('React') ? 'react' : undefined,
          });

          sendEvent({
            type: 'output',
            content: `Planning Phase:\n${planningResponse.content}\n\n`
          });

          sendEvent({
            type: 'phase',
            phase: 'implementing',
            message: 'Generating code implementation...',
            progress: 30
          });

          // Phase 2: Implementation
          const implementationPrompt = prompts.implementation;
          const files: Array<{ path: string; content: string; language: string }> = [];

          // Stream implementation
          let currentFile = '';
          let currentContent = '';
          let inCodeBlock = false;
          let language = 'typescript';

          for await (const chunk of aiService.streamImplementation({
            prompt: implementationPrompt,
            context: `${context}\n\nPlanning:\n${planningResponse.content}`,
            language: implementation.story.acceptanceCriteria?.includes('TypeScript') ? 'typescript' : 'javascript',
            framework: implementation.story.acceptanceCriteria?.includes('React') ? 'react' : undefined,
          })) {
            sendEvent({
              type: 'output',
              content: chunk
            });

            // Parse file outputs from the stream
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.includes('```') && line.includes('/')) {
                if (inCodeBlock && currentFile && currentContent) {
                  files.push({
                    path: currentFile,
                    content: currentContent.trim(),
                    language
                  });

                  sendEvent({
                    type: 'file',
                    file: {
                      path: currentFile,
                      content: currentContent.trim(),
                      language
                    }
                  });

                  currentContent = '';
                }

                const pathMatch = line.match(/```(\w+)?\s*(.+)/);
                if (pathMatch && pathMatch[2]) {
                  currentFile = pathMatch[2];
                  language = pathMatch[1] || 'typescript';
                  inCodeBlock = true;
                } else {
                  inCodeBlock = false;
                }
              } else if (line.includes('```') && !line.includes('/')) {
                if (inCodeBlock && currentFile && currentContent) {
                  files.push({
                    path: currentFile,
                    content: currentContent.trim(),
                    language
                  });

                  sendEvent({
                    type: 'file',
                    file: {
                      path: currentFile,
                      content: currentContent.trim(),
                      language
                    }
                  });
                }
                inCodeBlock = false;
                currentFile = '';
                currentContent = '';
              } else if (inCodeBlock) {
                currentContent += line + '\n';
              }
            }
          }

          // Handle any remaining file
          if (inCodeBlock && currentFile && currentContent) {
            files.push({
              path: currentFile,
              content: currentContent.trim(),
              language
            });

            sendEvent({
              type: 'file',
              file: {
                path: currentFile,
                content: currentContent.trim(),
                language
              }
            });
          }

          sendEvent({
            type: 'phase',
            phase: 'reviewing',
            message: 'Reviewing and validating implementation...',
            progress: 70
          });

          // Phase 3: Review (if enabled)
          if (config.generateDocs && prompts.review) {
            const reviewResponse = await aiService.generateImplementation({
              prompt: prompts.review,
              context: `${context}\n\nFiles generated:\n${files.map(f => `${f.path}:\n${f.content}`).join('\n\n')}`,
            });

            sendEvent({
              type: 'output',
              content: `\nReview Phase:\n${reviewResponse.content}\n\n`
            });
          }

          // Phase 4: Git operations (if configured)
          if (gitService && config.autoCommit) {
            sendEvent({
              type: 'phase',
              phase: 'committing',
              message: 'Committing changes to repository...',
              progress: 85
            });

            try {
              // Create branch for this story
              const branchName = `feature/${implementation.story.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
              await gitService.createBranch(branchName);

              // Write files to repository
              const fs = await import('fs/promises');
              const path = await import('path');

              for (const file of files) {
                const fullPath = path.join(implementation.project.repositoryPath!, file.path);
                const dir = path.dirname(fullPath);

                // Ensure directory exists
                await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(fullPath, file.content);
              }

              // Commit changes
              const commitMessage = `feat: ${implementation.story.title}\n\n${implementation.story.description}`;
              const commitHash = await gitService.commit(commitMessage);

              sendEvent({
                type: 'output',
                content: `\nGit Operations:\nCreated branch: ${branchName}\nCommitted changes: ${commitHash}\n\n`
              });
            } catch (gitError) {
              sendEvent({
                type: 'error',
                message: `Git operation failed: ${gitError}`
              });
            }
          }

          sendEvent({
            type: 'phase',
            phase: 'completed',
            message: 'Implementation completed successfully',
            progress: 100
          });

          // Update implementation record
          const updatedImplementation = await prisma.implementation.update({
            where: { id: params.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              output: JSON.stringify({
                files: files.map(f => ({ path: f.path, content: f.content })),
                planning: planningResponse.content,
              })
            },
            include: {
              project: true,
              story: true,
              promptPack: true,
            }
          });

          sendEvent({
            type: 'complete',
            implementation: updatedImplementation
          });

        } catch (error) {
          console.error('Implementation stream error:', error);

          // Update implementation status to failed
          await prisma.implementation.update({
            where: { id: params.id },
            data: { status: 'failed', completedAt: new Date() }
          });

          sendEvent({
            type: 'error',
            message: `Implementation failed: ${error}`
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'x-external-id',
      },
    });

  } catch (error) {
    console.error('Implementation stream error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}