import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'openai' | 'anthropic' | 'local';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface ImplementationRequest {
  prompt: string;
  context?: string;
  language?: string;
  framework?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AIService {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.initializeClients();
  }

  private initializeClients() {
    if (this.config.provider === 'openai' && this.config.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      });
    } else if (this.config.provider === 'anthropic' && this.config.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: this.config.apiKey,
      });
    }
  }

  async generateImplementation(request: ImplementationRequest): Promise<AIResponse> {
    const maxTokens = request.maxTokens || this.config.maxTokens || 4000;
    const temperature = request.temperature || this.config.temperature || 0.7;

    switch (this.config.provider) {
      case 'openai':
        return this.generateWithOpenAI(request, maxTokens, temperature);
      case 'anthropic':
        return this.generateWithAnthropic(request, maxTokens, temperature);
      case 'local':
        return this.generateWithLocal(request);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  private async generateWithOpenAI(
    request: ImplementationRequest,
    maxTokens: number,
    temperature: number
  ): Promise<AIResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    const completion = await this.openaiClient.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined,
      model: completion.model,
      provider: 'openai',
    };
  }

  private async generateWithAnthropic(
    request: ImplementationRequest,
    maxTokens: number,
    temperature: number
  ): Promise<AIResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    const completion = await this.anthropicClient.messages.create({
      model: this.config.model || 'claude-3-opus-20240229',
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
      max_tokens: maxTokens,
      temperature,
    });

    const content = completion.content[0];
    const textContent = content.type === 'text' ? content.text : '';

    return {
      content: textContent,
      usage: {
        promptTokens: completion.usage.input_tokens,
        completionTokens: completion.usage.output_tokens,
        totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
      },
      model: completion.model,
      provider: 'anthropic',
    };
  }

  private async generateWithLocal(request: ImplementationRequest): Promise<AIResponse> {
    // Placeholder for local model integration (e.g., Ollama)
    // This would connect to a local LLM instance

    const baseURL = this.config.baseURL || 'http://localhost:11434';
    const model = this.config.model || 'codellama';

    try {
      const response = await fetch(`${baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: this.buildFullPrompt(request),
          stream: false,
        }),
      });

      const data = await response.json();

      return {
        content: data.response,
        model,
        provider: 'local',
      };
    } catch (error) {
      throw new Error(`Failed to generate with local model: ${error}`);
    }
  }

  private buildSystemPrompt(request: ImplementationRequest): string {
    let prompt = 'You are an expert software developer tasked with implementing code based on specifications.';

    if (request.language) {
      prompt += ` You should write code in ${request.language}.`;
    }

    if (request.framework) {
      prompt += ` Use the ${request.framework} framework.`;
    }

    prompt += ' Provide clean, well-commented, production-ready code. Follow best practices and include proper error handling.';

    return prompt;
  }

  private buildUserPrompt(request: ImplementationRequest): string {
    let prompt = request.prompt;

    if (request.context) {
      prompt = `Context:\n${request.context}\n\n${prompt}`;
    }

    return prompt;
  }

  private buildFullPrompt(request: ImplementationRequest): string {
    return `${this.buildSystemPrompt(request)}\n\n${this.buildUserPrompt(request)}`;
  }

  // Stream implementation for real-time updates
  async *streamImplementation(request: ImplementationRequest): AsyncGenerator<string> {
    if (this.config.provider === 'openai' && this.openaiClient) {
      const stream = await this.openaiClient.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: this.buildSystemPrompt(request) },
          { role: 'user', content: this.buildUserPrompt(request) },
        ],
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } else if (this.config.provider === 'anthropic' && this.anthropicClient) {
      const stream = await this.anthropicClient.messages.create({
        model: this.config.model || 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: this.buildUserPrompt(request) },
        ],
        system: this.buildSystemPrompt(request),
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } else {
      // Fallback to non-streaming for local models
      const response = await this.generateImplementation(request);
      yield response.content;
    }
  }

  // Analyze code quality and suggest improvements
  async analyzeCode(code: string, language: string): Promise<{
    issues: Array<{ type: string; severity: string; message: string; line?: number }>;
    suggestions: string[];
    score: number;
  }> {
    const prompt = `Analyze the following ${language} code for quality issues, bugs, and improvements:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. List of issues with severity (error, warning, info)
2. Improvement suggestions
3. Overall quality score (0-100)

Format as JSON.`;

    const response = await this.generateImplementation({
      prompt,
      maxTokens: 2000,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        issues: [],
        suggestions: ['Unable to parse analysis results'],
        score: 0,
      };
    }
  }
}