import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';

export interface StoryInput {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  storyPoints?: number;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
  category: 'scope' | 'technical' | 'acceptance' | 'dependencies' | 'user';
}

export interface OptimizationAnalysis {
  hasGaps: boolean;
  questions: ClarifyingQuestion[];
  initialSuggestions: {
    title?: string;
    description?: string;
    acceptanceCriteria?: string;
    priority?: string;
    storyPoints?: number;
  };
  analysis: {
    clarity: number; // 0-100
    completeness: number; // 0-100
    testability: number; // 0-100
    recommendations: string[];
  };
}

export interface OptimizedStory {
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

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class StoryOptimizerService {
  /**
   * Analyze a story and generate clarifying questions if needed
   */
  async analyzeStory(
    projectId: string,
    storyInput: StoryInput,
    externalId: string
  ): Promise<OptimizationAnalysis> {
    // Fetch project context: codebase analysis + existing stories
    const project = await prisma.workflowProject.findFirst({
      where: { id: projectId, externalId },
      include: {
        codebaseAnalysis: true,
        stories: {
          select: {
            title: true,
            description: true,
            acceptanceCriteria: true,
            priority: true,
          },
          take: 10, // Last 10 stories for context
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const codebaseContext = project.codebaseAnalysis?.content || 'No codebase analysis available';
    const existingStories = project.stories;

    const prompt = this.buildAnalysisPrompt(storyInput, codebaseContext, existingStories);

    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert software development coach and story writer. Your role is to analyze user stories and help developers write clear, actionable, and AI-development-agent-friendly stories.

You understand that these stories will be used by AI coding assistants (like Claude, Cursor, Copilot) to implement features. Stories need to be:
1. Specific and unambiguous
2. Include clear acceptance criteria in Given/When/Then format
3. Reference specific files, components, or patterns from the codebase when possible
4. Include technical context that helps AI understand the implementation approach

Respond ONLY with valid JSON matching the specified schema.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Extract JSON from response (handle markdown code blocks if present)
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      const result = JSON.parse(jsonContent);
      return this.validateAnalysisResult(result);
    } catch (error) {
      console.error('Story analysis failed:', error);
      // Return a basic analysis on failure
      return this.generateFallbackAnalysis(storyInput);
    }
  }

  /**
   * Generate optimized story based on conversation answers
   */
  async generateOptimizedStory(
    projectId: string,
    storyInput: StoryInput,
    conversation: ConversationMessage[],
    externalId: string
  ): Promise<OptimizedStory> {
    const project = await prisma.workflowProject.findFirst({
      where: { id: projectId, externalId },
      include: {
        codebaseAnalysis: true,
        stories: {
          select: {
            title: true,
            description: true,
            acceptanceCriteria: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const codebaseContext = project.codebaseAnalysis?.content || '';

    const prompt = this.buildOptimizationPrompt(storyInput, conversation, codebaseContext);

    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert at writing user stories optimized for AI development agents.

Transform the user's story into a format that AI coding assistants can easily understand and implement. Include:
1. Clear, specific title using action verbs
2. Detailed description with technical context
3. Comprehensive acceptance criteria in Given/When/Then format
4. Specific file references when known from codebase analysis
5. Edge cases and error handling requirements

Respond ONLY with valid JSON matching the specified schema.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Extract JSON from response (handle markdown code blocks if present)
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      const result = JSON.parse(jsonContent);
      return this.validateOptimizedStory(result, storyInput);
    } catch (error) {
      console.error('Story optimization failed:', error);
      // Return a basic optimized story as fallback
      return this.generateFallbackOptimizedStory(storyInput, conversation);
    }
  }

  /**
   * Generate fallback optimized story when AI fails
   */
  private generateFallbackOptimizedStory(
    storyInput: StoryInput,
    conversation: ConversationMessage[]
  ): OptimizedStory {
    // Extract any useful info from conversation
    const conversationContext = conversation
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');

    const enhancedDescription = storyInput.description +
      (conversationContext ? `\n\nAdditional Context:\n${conversationContext}` : '');

    const enhancedAcceptanceCriteria = storyInput.acceptanceCriteria ||
      `- Given the feature is implemented\n- When the user interacts with it\n- Then it should work as described`;

    return {
      title: storyInput.title,
      description: enhancedDescription,
      acceptanceCriteria: enhancedAcceptanceCriteria,
      priority: storyInput.priority,
      storyPoints: storyInput.storyPoints,
      changes: conversationContext ? [
        {
          field: 'description',
          original: storyInput.description,
          optimized: enhancedDescription,
          reason: 'Added context from clarifying questions',
        },
      ] : [],
    };
  }

  /**
   * Get additional clarifying questions
   */
  async getMoreQuestions(
    projectId: string,
    storyInput: StoryInput,
    previousQuestions: ClarifyingQuestion[],
    answers: Record<string, string>,
    externalId: string
  ): Promise<ClarifyingQuestion[]> {
    const project = await prisma.workflowProject.findFirst({
      where: { id: projectId, externalId },
      include: { codebaseAnalysis: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const prompt = `Based on the following story and previous Q&A, generate 3-5 additional clarifying questions to further improve the story.

STORY:
Title: ${storyInput.title}
Description: ${storyInput.description}
Acceptance Criteria: ${storyInput.acceptanceCriteria || 'None provided'}

PREVIOUS QUESTIONS AND ANSWERS:
${previousQuestions.map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[q.id] || 'Not answered'}`).join('\n\n')}

CODEBASE CONTEXT:
${(project.codebaseAnalysis?.content || '').substring(0, 2000)}

Generate additional questions that dig deeper into technical implementation, edge cases, or user experience details.

Respond with JSON:
{
  "questions": [
    {
      "id": "unique_id",
      "question": "The question text",
      "context": "Why this question matters",
      "priority": "high|medium|low",
      "category": "scope|technical|acceptance|dependencies|user"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a story refinement expert. Generate thoughtful follow-up questions. Respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      // Extract JSON from response (handle markdown code blocks if present)
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      const result = JSON.parse(jsonContent);
      return result.questions || [];
    } catch (error) {
      console.error('Failed to get more questions:', error);
      return [];
    }
  }

  /**
   * Save story version
   */
  async saveStoryVersion(
    storyId: string,
    storyData: StoryInput,
    isOriginal: boolean,
    isActive: boolean,
    optimizationContext?: any
  ): Promise<any> {
    // Get the highest version number for this story
    const lastVersion = await prisma.workflowStoryVersion.findFirst({
      where: { storyId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (lastVersion?.version || 0) + 1;

    // If setting as active, deactivate other versions
    if (isActive) {
      await prisma.workflowStoryVersion.updateMany({
        where: { storyId },
        data: { isActive: false },
      });
    }

    return prisma.workflowStoryVersion.create({
      data: {
        storyId,
        version: newVersion,
        title: storyData.title,
        description: storyData.description,
        acceptanceCriteria: storyData.acceptanceCriteria || null,
        priority: storyData.priority as any,
        storyPoints: storyData.storyPoints || null,
        isOriginal,
        isActive,
        optimizationContext: optimizationContext || null,
      },
    });
  }

  /**
   * Get story versions
   */
  async getStoryVersions(storyId: string, externalId: string): Promise<any[]> {
    const story = await prisma.workflowStory.findFirst({
      where: {
        id: storyId,
        project: { externalId },
      },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    return prisma.workflowStoryVersion.findMany({
      where: { storyId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Restore a story version
   */
  async restoreVersion(storyId: string, versionId: string, externalId: string): Promise<any> {
    const version = await prisma.workflowStoryVersion.findFirst({
      where: {
        id: versionId,
        storyId,
        story: { project: { externalId } },
      },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Update the story with version data
    const updatedStory = await prisma.workflowStory.update({
      where: { id: storyId },
      data: {
        title: version.title,
        description: version.description,
        acceptanceCriteria: version.acceptanceCriteria,
        priority: version.priority,
        storyPoints: version.storyPoints,
      },
    });

    // Mark this version as active
    await prisma.workflowStoryVersion.updateMany({
      where: { storyId },
      data: { isActive: false },
    });

    await prisma.workflowStoryVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    });

    return updatedStory;
  }

  // Private helper methods

  private buildAnalysisPrompt(
    storyInput: StoryInput,
    codebaseContext: string,
    existingStories: any[]
  ): string {
    return `Analyze this user story and identify gaps or areas that need clarification for AI development agents.

USER STORY:
Title: ${storyInput.title || '[Empty]'}
Description: ${storyInput.description || '[Empty]'}
Acceptance Criteria: ${storyInput.acceptanceCriteria || '[Empty]'}
Priority: ${storyInput.priority || 'MEDIUM'}
Story Points: ${storyInput.storyPoints || 'Not set'}

CODEBASE CONTEXT (for understanding the project):
${codebaseContext.substring(0, 3000)}

EXISTING STORIES (for consistency):
${existingStories.map(s => `- ${s.title}`).join('\n')}

Analyze the story and respond with this JSON structure:
{
  "hasGaps": boolean,
  "questions": [
    {
      "id": "q1",
      "question": "The clarifying question",
      "context": "Why this question is important",
      "priority": "high|medium|low",
      "category": "scope|technical|acceptance|dependencies|user"
    }
  ],
  "initialSuggestions": {
    "title": "Improved title if needed",
    "description": "Enhanced description",
    "acceptanceCriteria": "Better acceptance criteria in Given/When/Then format",
    "priority": "suggested priority",
    "storyPoints": suggested_points_number
  },
  "analysis": {
    "clarity": 0-100,
    "completeness": 0-100,
    "testability": 0-100,
    "recommendations": ["recommendation1", "recommendation2"]
  }
}

Rules:
- Generate 3-5 of the MOST IMPORTANT questions (high priority first)
- Questions should help fill in missing technical details
- Consider what an AI coding assistant would need to know
- Reference specific parts of the codebase when relevant
- Initial suggestions should be improvements, not complete rewrites`;
  }

  private buildOptimizationPrompt(
    storyInput: StoryInput,
    conversation: ConversationMessage[],
    codebaseContext: string
  ): string {
    const conversationText = conversation
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    return `Transform this user story into an optimized format for AI development agents.

ORIGINAL STORY:
Title: ${storyInput.title}
Description: ${storyInput.description}
Acceptance Criteria: ${storyInput.acceptanceCriteria || 'None'}
Priority: ${storyInput.priority}
Story Points: ${storyInput.storyPoints || 'Not set'}

CLARIFICATION CONVERSATION:
${conversationText || 'No additional context provided'}

CODEBASE CONTEXT:
${codebaseContext.substring(0, 2000)}

Generate an optimized story with this JSON structure:
{
  "title": "Clear, action-oriented title",
  "description": "Detailed description with technical context, including:\\n- User goal\\n- Technical approach\\n- Relevant files/components\\n- Dependencies",
  "acceptanceCriteria": "Given/When/Then format acceptance criteria, one per line:\\n- Given [context], When [action], Then [result]\\n- Include edge cases\\n- Include error scenarios",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "storyPoints": number_or_null,
  "changes": [
    {
      "field": "title|description|acceptanceCriteria|priority|storyPoints",
      "original": "original value",
      "optimized": "new value",
      "reason": "why this change improves the story"
    }
  ]
}

Requirements:
- Make the story specific and unambiguous
- Include file references from codebase when known
- Write acceptance criteria that can be verified
- Explain each significant change made`;
  }

  private validateAnalysisResult(result: any): OptimizationAnalysis {
    return {
      hasGaps: result.hasGaps ?? true,
      questions: (result.questions || []).map((q: any, i: number) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || 'Question unavailable',
        context: q.context || '',
        priority: q.priority || 'medium',
        category: q.category || 'scope',
      })),
      initialSuggestions: result.initialSuggestions || {},
      analysis: {
        clarity: result.analysis?.clarity ?? 50,
        completeness: result.analysis?.completeness ?? 50,
        testability: result.analysis?.testability ?? 50,
        recommendations: result.analysis?.recommendations || [],
      },
    };
  }

  private validateOptimizedStory(result: any, original: StoryInput): OptimizedStory {
    return {
      title: result.title || original.title,
      description: result.description || original.description,
      acceptanceCriteria: result.acceptanceCriteria || original.acceptanceCriteria,
      priority: result.priority || original.priority,
      storyPoints: result.storyPoints ?? original.storyPoints,
      changes: result.changes || [],
    };
  }

  private generateFallbackAnalysis(storyInput: StoryInput): OptimizationAnalysis {
    const questions: ClarifyingQuestion[] = [];

    if (!storyInput.title || storyInput.title.length < 10) {
      questions.push({
        id: 'q1',
        question: 'Can you provide a more descriptive title for this story?',
        context: 'A clear title helps developers understand the scope at a glance',
        priority: 'high',
        category: 'scope',
      });
    }

    if (!storyInput.description || storyInput.description.length < 50) {
      questions.push({
        id: 'q2',
        question: 'What specific functionality should this story implement?',
        context: 'Detailed descriptions help AI assistants understand the implementation requirements',
        priority: 'high',
        category: 'scope',
      });
    }

    if (!storyInput.acceptanceCriteria) {
      questions.push({
        id: 'q3',
        question: 'What are the acceptance criteria for this story?',
        context: 'Clear acceptance criteria in Given/When/Then format help verify completion',
        priority: 'high',
        category: 'acceptance',
      });
    }

    questions.push({
      id: 'q4',
      question: 'Are there any specific technical constraints or dependencies?',
      context: 'Understanding constraints helps plan the implementation approach',
      priority: 'medium',
      category: 'technical',
    });

    questions.push({
      id: 'q5',
      question: 'Who is the primary user for this feature?',
      context: 'User context helps write better acceptance criteria',
      priority: 'medium',
      category: 'user',
    });

    return {
      hasGaps: true,
      questions: questions.slice(0, 5),
      initialSuggestions: {},
      analysis: {
        clarity: storyInput.title ? 40 : 20,
        completeness: storyInput.description ? 40 : 20,
        testability: storyInput.acceptanceCriteria ? 60 : 20,
        recommendations: [
          'Add more detail to the description',
          'Include acceptance criteria in Given/When/Then format',
          'Consider edge cases and error scenarios',
        ],
      },
    };
  }
}
