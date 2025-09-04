import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_KEY,
});

// Feature switch - set to 'openai' or 'claude'
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

// Define available functions
const tools = [
  {
    type: "function" as const,
    function: {
      name: "save_specification_document",
      description: "Save software architecture specifications and documentation as markdown files to the user's project",
      parameters: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "The filename with .md extension (e.g., 'technical-requirements.md', 'api-specification.md', 'database-schema.md')"
          },
          content: {
            type: "string", 
            description: "The complete markdown document content with proper formatting"
          },
          document_type: {
            type: "string",
            enum: [
              "prd", 
              "frontend", 
              "backend", 
              "state_management", 
              "database_schema", 
              "api",
              "devops",
              "testing_plan",
              "code_documentation",
              "performance_optimization",
              "user_flow",
              "third_party_libraries",
              "readme"
            ],
            description: "Type of specification document being created (matches CSA workflow steps)"
          },
          description: {
            type: "string",
            description: "Brief summary of what this document covers"
          },
          next_steps: {
            type: "string",
            description: "What should be done next or what questions to ask the user for the following document/phase"
          },
          skip_technical_summary: {
            type: "boolean",
            description: "Set to true to skip mentioning what document was created (for non-technical users who don't need to know about PRDs, APIs, etc.)"
          }
        },
        required: ["filename", "content", "document_type", "description"]
      }
    }
  }
];

const SYSTEM_PROMPT = `# Unified Project Planning Assistant (CSA + SPA)

## Role
You are a **Technical Project Planning Assistant & Senior Developer** (20+ yrs experience). Guide the user through 13 specific document steps, one at a time, to produce actionable project specifications.

## CRITICAL WORKFLOW REQUIREMENTS:
1. **MANDATORY DOCUMENT CREATION**: When you have sufficient information for a document type, you MUST create the specification document using save_specification_document tool call BEFORE moving to next phase
2. **SEQUENTIAL PROCESSING**: Ask questions to gather info → Create document → Move to next document type
3. **NO SKIPPING**: Never move to next document type without first creating and saving the current document
4. **COMPLETION TRIGGER**: Create document when you have enough details to write a comprehensive specification (aim for 3 questions, max 5)

## Scope Rules & Timeline Context
- Use the timeline parameter to inform scope and technology choices
- Timeline values: 1=2 days, 2=1 week, 3=2 weeks, 4=1 month, 5=6 weeks, 6=2 months, 7=10 weeks, 8=3 months, 9=4 months, 10=12 weeks
- Adjust complexity, features, and technology choices based on timeline without mentioning specific timeframes to users
- Shorter timelines (1-3): Simple MVP, proven tech, minimal features
- Medium timelines (4-6): Feature-complete product, some advanced features
- Longer timelines (7-10): Full platform, enterprise features, custom solutions

## Interaction Style
- **Ask ONE question at a time** (maximum 2 if closely related to bundle and save time)
- **Always provide A-C options** (or A-B if only 2 good options) based on context + "Or specify something different if you'd like"
- **Reason out best options** for each question based on project context and industry standards
- **Aim for 3 questions per document, never exceed 5 questions**
- If user is **decisive** → ask follow-ups efficiently, bundle related questions when possible
- If user is **unsure** → give clear contextual A-C options to help them choose
- When you have sufficient information for current document type → create document + move to next phase
- Use concrete, actionable wording
- Never mention document types, PRDs, or internal workflow to users

## Technical Decisions Mode
- **When techDecisions=true**: Only ask product/business uncertainty questions, auto-decide all tech stack
- **When techDecisions=false**: Balance tech + product questions based on uncertainty
- **Technical defaults to use when techDecisions=true**: React Native + Expo, Node.js + TypeScript, PostgreSQL + Prisma, Zustand + React Query, JWT auth, Vercel/Fly.io deployment

## Fast Mode & Question Selection

### Question Selection Algorithm:
1. **Generate ALL potential questions** for current document type
2. **Score uncertainty** (1-10 scale) where 10 = most uncertain, requires user input
3. **Sort by uncertainty DESC** and take exactly top N questions based on document type
4. **Tie-breaking**: Simple truncation - if multiple questions have same score, take first N in sorted list
5. **Ask selected questions** to user
6. **Make background decisions** for all remaining questions using project context
7. **Generate complete document** incorporating both user answers AND background decisions

### Mode Behaviors & Question Limits:
- **Fast Mode ON**: Variable limits per document type - PRD(5), Frontend(3), Backend(3), State Management(1), Database(3), API(2), DevOps(2), User Flow(3), README(2), Testing/Docs/Performance/Libraries(1 each)
- **Fast Mode OFF**: Hard limit of 6 questions per document, background decisions for rest

### Uncertainty Scoring Criteria:
- **High (9-10)**: Core product features, target audience, monetization, unique value prop
- **Medium (6-8)**: Platform choice, architectural patterns, UI frameworks
- **Low (1-5)**: Code style, file structure, deployment details, testing tools

### Background Decision Making (Fast Mode):
When you reach question limits, make intelligent defaults for remaining decisions:

#### Decision Sources (in priority order):
1. **User context**: Answers from previous questions in this session
2. **Project type**: Mobile game → mobile-optimized choices
3. **Audience**: Casual gamers → simple, accessible options  
4. **Timeline**: 2-day MVP → proven, simple technology choices
5. **Industry standards**: Well-established patterns for similar projects

#### Examples:
- If building mobile game for casual audience → choose simple UI patterns, single-finger controls
- If 2-day timeline → choose proven tech stack (React Native + Expo, not experimental frameworks)
- If target is "quick matches" → choose fast loading, minimal setup options

### Question Categories:
**Product Questions**: Target audience, features, user flows, monetization, design style
**Tech Questions**: Frameworks, databases, deployment, testing tools, code organization

## Internal Document Flow (13 steps - DO NOT MENTION TO USERS):
1. **prd.md** — Name, audience, goals, features (MSC), risks, out-of-scope
2. **frontend.md** — UI stack, nav, styling, components, state usage
3. **backend.md** — Architecture, DB schema, auth, API, integrations
4. **state-management.md** — Local/global rules, persistence, invalidations
5. **database-schema.md** — ERD, tables/fields, indexes, migrations
6. **api.md** — Endpoints, payloads, error handling, rate limits
7. **devops.md** — Environments, pipelines, infra, scaling
8. **testingplan.md** — Test types, tools, coverage targets
9. **codedocumentation.md** — Repo structure, style, API docs
10. **performanceoptimization.md** — Frontend budgets, backend SLAs, caching
11. **userflow.md** — Mermaid diagrams for core flows, roles
12. **thirdpartylibraries.md** — Libs/services, licenses, integration
13. **readme.md** — Project summary, stack, quickstart

## Response Pattern:
- **One Question**: Ask ONE focused question with A-C options (+ "or specify something different")
- **Gather Info**: Continue asking single questions until you have complete information for current document
- **Create Document**: Call save_specification_document tool when you have sufficient details
- **Next Phase**: Move to next document type with single focused question
- **CRITICAL**: NEVER output JSON or tool parameters in your response text
- **CRITICAL**: Use proper tool calling mechanism, not text output
- Always use skip_technical_summary=true 
- Never mention what documents were created or saved
- Keep responses concise and focused on getting information needed

## Tech Defaults (suggest when user is unsure):
Mobile: React Native + TS + Expo
Backend: Node.js + TS, REST first  
DB: Postgres + Prisma
Auth: JWT + refresh tokens
State: Zustand, React Query
CI/CD: GitHub Actions, Vercel

Keep responses concise, use bullets over paragraphs.`;

// Convert OpenAI tools format to Claude format
const claudeTools = [
  {
    name: "save_specification_document",
    description: "Save software architecture specifications and documentation as markdown files to the user's project",
    input_schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "The filename with .md extension (e.g., 'technical-requirements.md', 'api-specification.md', 'database-schema.md')"
        },
        content: {
          type: "string", 
          description: "The complete markdown document content with proper formatting"
        },
        document_type: {
          type: "string",
          enum: [
            "prd", 
            "frontend", 
            "backend", 
            "state_management", 
            "database_schema", 
            "api",
            "devops",
            "testing_plan",
            "code_documentation",
            "performance_optimization",
            "user_flow",
            "third_party_libraries",
            "readme"
          ],
          description: "Type of specification document being created (matches CSA workflow steps)"
        },
        description: {
          type: "string",
          description: "Brief summary of what this document covers"
        },
        next_steps: {
          type: "string",
          description: "What should be done next or what questions to ask the user for the following document/phase"
        },
        skip_technical_summary: {
          type: "boolean",
          description: "Set to true to skip mentioning what document was created (for non-technical users who don't need to know about PRDs, APIs, etc.)"
        }
      },
      required: ["filename", "content", "document_type", "description"]
    }
  }
];

// Helper function to call OpenAI
async function callOpenAI(messages: any[], contextualPrompt: string) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-5',
    messages: [
      { role: 'system', content: contextualPrompt },
      ...messages,
    ],
    tools: tools,
    tool_choice: "auto",
    temperature: 1,
  });
  return response;
}

// Helper function to call Claude with error handling and retries
async function callClaude(messages: any[], contextualPrompt: string, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds base delay

  try {
    // Filter out empty messages and clean up the message array
    const claudeMessages = messages
      .map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content?.trim() || ''
      }))
      .filter((msg: any) => msg.content.length > 0); // Remove empty messages

    // Ensure we don't have consecutive messages from the same role
    const cleanMessages = [];
    for (let i = 0; i < claudeMessages.length; i++) {
      const currentMsg = claudeMessages[i];
      const lastMsg = cleanMessages[cleanMessages.length - 1];
      
      if (!lastMsg || lastMsg.role !== currentMsg.role) {
        cleanMessages.push(currentMsg);
      } else {
        // Merge consecutive messages from same role
        lastMsg.content += '\n\n' + currentMsg.content;
      }
    }

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-1-20250805',
      max_tokens: 4096,
      system: contextualPrompt,
      messages: cleanMessages as any,
      tools: claudeTools as any,
      temperature: 1,
    });
    
    return response;
    
  } catch (error: any) {
    console.error(`Claude API error (attempt ${retryCount + 1}):`, error?.message);
    
    // Check if it's a retryable error
    const isRetryable = 
      error?.status === 529 || // Overloaded
      error?.status === 503 || // Service unavailable
      error?.status === 502 || // Bad gateway
      error?.message?.includes('overloaded') ||
      error?.message?.includes('rate limit') ||
      error?.message?.includes('timeout');
    
    if (isRetryable && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Retrying Claude API call in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return callClaude(messages, contextualPrompt, retryCount + 1);
    }
    
    // If not retryable or max retries reached, throw the error
    throw error;
  }
}

// Helper function to handle tool calls for OpenAI
async function handleOpenAIToolCalls(toolCalls: any[], userSession: string, externalId: string) {
  const functionResults = [];
  
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === 'save_specification_document') {
      const args = JSON.parse(toolCall.function.arguments);
      
      const result = await saveSpecificationDocument(
        args.filename, 
        args.content, 
        args.description,
        args.document_type,
        args.next_steps,
        args.skip_technical_summary,
        userSession,
        externalId
      );
      
      functionResults.push({
        tool_call_id: toolCall.id,
        role: 'tool' as const,
        content: JSON.stringify({ 
          success: true, 
          message: `Specification document ${args.filename} saved successfully`,
          document_type: result.document_type,
          documentId: result.id,
          filename: result.filename
        })
      });
    }
  }
  return functionResults;
}

// Helper function to handle tool calls for Claude
async function handleClaudeToolCalls(toolUses: any[], userSession: string, externalId: string) {
  const functionResults = [];
  
  for (const toolUse of toolUses) {
    if (toolUse.name === 'save_specification_document') {
      const args = toolUse.input;
      
      const result = await saveSpecificationDocument(
        args.filename, 
        args.content, 
        args.description,
        args.document_type,
        args.next_steps,
        args.skip_technical_summary,
        userSession,
        externalId
      );
      
      functionResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify({ 
          success: true, 
          message: `Specification document ${args.filename} saved successfully`,
          document_type: result.document_type,
          documentId: result.id,
          filename: result.filename
        })
      });
    }
  }
  return functionResults;
}

// Track questions asked per document type
async function incrementQuestionCount(userSession: string, documentType: string, externalId: string) {
  await prisma.questionCount.upsert({
    where: { userSession_documentType: { userSession, documentType } },
    update: { questionsAsked: { increment: 1 } },
    create: { userSession, documentType, questionsAsked: 1, externalId }
  });
}

// Get current question count for document type
async function getQuestionCount(userSession: string, documentType: string): Promise<number> {
  const record = await prisma.questionCount.findUnique({
    where: { userSession_documentType: { userSession, documentType } }
  });
  return record?.questionsAsked || 0;
}

// Get question limits per document type
function getQuestionLimits(documentType: string, fastMode: boolean): number {
  if (fastMode) {
    const fastModeLimits: Record<string, number> = {
      'prd': 5,
      'frontend': 3,
      'backend': 3,
      'state_management': 1,
      'database_schema': 3,
      'api': 2,
      'devops': 2,
      'user_flow': 3,
      'readme': 2,
      'testing_plan': 1,
      'code_documentation': 1,
      'performance_optimization': 1,
      'third_party_libraries': 1
    };
    return fastModeLimits[documentType] || 3;
  } else {
    // Slow mode: hard limit of 6 questions per document with background decisions for rest
    return 6;
  }
}

// Helper function to get specific questions for each document type
function getSpecificQuestionForDocType(docType: string): string {
  const specificQuestions = {
    'prd': "What product do you want to build?",
    
    'frontend': "What platform do you want to target?\n- A) Mobile app (React Native + Expo)\n- B) Web app (React + Next.js)\n- C) Desktop app (Electron)\n\nOr specify something different if you'd like.",
    
    'backend': "What backend architecture do you prefer?\n- A) Node.js + TypeScript REST API\n- B) Python FastAPI\n- C) Serverless (AWS Lambda/Vercel)\n\nOr specify something different if you'd like.",
    
    'state_management': "How do you want to handle state management?\n- A) Zustand + React Query\n- B) Redux Toolkit + RTK Query\n- C) Context API + useState\n\nOr specify something different if you'd like.",
    
    'database_schema': "What database setup do you prefer?\n- A) PostgreSQL + Prisma ORM\n- B) MongoDB + Mongoose\n- C) Supabase (PostgreSQL + auth)\n\nOr specify something different if you'd like.",
    
    'api': "What API approach do you want?\n- A) REST with OpenAPI/Swagger docs\n- B) GraphQL with Apollo\n- C) tRPC for type-safe APIs\n\nOr specify something different if you'd like.",
    
    'devops': "What deployment setup do you prefer?\n- A) Vercel + PlanetScale (simple)\n- B) AWS with Docker containers\n- C) Google Cloud Run\n\nOr specify something different if you'd like.",
    
    'testing_plan': "What testing approach do you want?\n- A) Jest + React Testing Library\n- B) Vitest + Testing Library\n- C) Cypress for E2E + unit tests\n\nOr specify something different if you'd like.",
    
    'code_documentation': "How do you want to structure code documentation?\n- A) TypeScript + JSDoc comments\n- B) Storybook for components\n- C) API docs with Swagger/OpenAPI\n\nOr specify something different if you'd like.",
    
    'performance_optimization': "What performance priorities do you have?\n- A) Mobile-first optimization\n- B) Database query optimization\n- C) Bundle size and loading speed\n\nOr specify something different if you'd like.",
    
    'user_flow': "What are the core user flows to document?\n- A) Onboarding and authentication\n- B) Main feature workflows\n- C) Admin/management flows\n\nOr specify something different if you'd like.",
    
    'third_party_libraries': "What external services do you need?\n- A) Authentication (Auth0, Clerk)\n- B) Payments (Stripe, PayPal)\n- C) Analytics (PostHog, Mixpanel)\n\nOr specify something different if you'd like.",
    
    'readme': "What should be emphasized in the README?\n- A) Quick start guide\n- B) Architecture overview\n- C) Deployment instructions\n\nOr specify something different if you'd like."
  };
  
  return (specificQuestions as any)[docType] || specificQuestions['frontend']; // Should never happen with proper session context
}

// Handler for OpenAI requests
async function handleOpenAIRequest(messages: any[], contextualPrompt: string, userSession: string, techDecisions = false, fastMode = false, timeline = 1, externalId = 'sreeveTest123', contextualIntroBrief?: any) {
  const response = await callOpenAI(messages, contextualPrompt);
  const responseMessage = response.choices[0].message;

  // Check if OpenAI wants to call a function
  if (responseMessage.tool_calls) {
    const functionResults = await handleOpenAIToolCalls(responseMessage.tool_calls, userSession, externalId);

    try {
      // Re-generate contextual prompt after tool calls to point to NEXT document type
      const updatedDocs = userSession ? await prisma.specification.findMany({
        where: { userSession },
        select: { documentType: true },
        orderBy: { createdAt: 'asc' }
      }) : [];
      
      const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                               'api', 'devops', 'testing_plan', 'code_documentation', 
                               'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
      
      const updatedCompletedTypes = updatedDocs.map(doc => doc.documentType as string);
      const updatedNextDocType = documentSequence.find(type => !updatedCompletedTypes.includes(type));
      
      // Regenerate mode prompts 
      const techModePrompt = techDecisions 
        ? `\n\n## TECHNICAL DECISIONS MODE ACTIVE:\nThe user wants you to make technical decisions. Skip detailed technical questions and use sensible defaults. Focus on product/business questions only.`
        : '';
        
      const fastModePrompt = fastMode 
        ? `\n\n## FAST MODE ACTIVE:\nUse reduced question limits per document type. Ask only the most uncertain questions where you need user input.`
        : `\n\n## NORMAL MODE ACTIVE:\nUse standard question limits (6 max per document). Focus on thorough requirement gathering.`;
      
      // Create UPDATED contextual prompt pointing to next document
      const timelinePrompt = `\n\n## TIMELINE CONTEXT:\nProject timeline setting: ${timeline}/10. Use this to inform scope and technology recommendations without mentioning specific timeframes to users.`;
      const introBriefPromptLocal = contextualIntroBrief 
        ? `\n\n## PROJECT CONTEXT FROM INTRO:\n- What they're creating: ${contextualIntroBrief.whatTheyreDoing}\n- Project type: ${contextualIntroBrief.projectType}\n- Target audience: ${contextualIntroBrief.audience}\n- Problem solving: ${contextualIntroBrief.problem}\n- Timeline: ${contextualIntroBrief.timeline}\n- Team size: ${contextualIntroBrief.teamSize}\n\n**MANDATORY FIRST MESSAGE BEHAVIOR**: If this is the first message in architect phase (messages.length === 1), you MUST respond with EXACTLY this format:\n\n"Great! I understand you're building [brief natural summary]. Let me ask you a few more details to create the perfect architecture.\n\n[IMMEDIATELY ask your first PRD question here - no bullet points, no summaries, no meta questions about what to focus on]"\n\nEXAMPLE:\n"Great! I understand you're building a mobile pickleball app for the public. Let me ask you a few more details to create the perfect architecture.\n\nWhat are the core features players will use most? For example, will they primarily be booking courts, tracking games, finding opponents, or something else?"\n\n**CRITICAL RULES:**\n- NO bullet point lists or summaries in your response\n- NO asking "what would you like to focus on" or similar meta questions\n- IMMEDIATELY ask a specific PRD question after the opener\n- Use intro context to avoid redundant basic questions\n- Focus on product details and user experience questions first`
        : '';
      
      const updatedContextualPrompt = updatedDocs.length > 0 && updatedNextDocType
        ? `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefPromptLocal}\n\n## SESSION CONTEXT:\nCompleted documents: ${updatedCompletedTypes.join(', ')}\nNEXT DOCUMENT TO CREATE: ${updatedNextDocType}\n\nDo NOT create documents that already exist. When you have sufficient information about ${updatedNextDocType}, call save_specification_document tool to create the ${updatedNextDocType} document, then move to the next phase.`
        : `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefPromptLocal}`;

      // Send function results back to OpenAI to get final response
      const finalResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          { role: 'system', content: updatedContextualPrompt },
          ...messages,
          responseMessage, // Include the assistant's function call
          ...functionResults // Include function results
        ],
        temperature: 1,
      });

      const finalText = finalResponse.choices[0]?.message?.content || '';
      
      // If OpenAI returns empty response after tool use, move to next document
      if (!finalText.trim()) {
        // Re-query to get UPDATED completion state after tool call
        const updatedDocs = userSession ? await prisma.specification.findMany({
          where: { userSession },
          select: { documentType: true },
          orderBy: { createdAt: 'asc' }
        }) : [];

        const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                                 'api', 'devops', 'testing_plan', 'code_documentation', 
                                 'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
        
        const completedTypes = updatedDocs.map(doc => doc.documentType as string);
        const nextDocType = documentSequence.find(type => !completedTypes.includes(type));
        
        if (!nextDocType) {
          console.log('All 13 documents completed for session:', userSession);
          return NextResponse.json({ 
            text: "🎉 **Project Complete!** All 13 architecture documents have been generated.\n\n**Next Steps:**\n• View your complete specifications in the Dashboard\n• Download your project files\n• Start building!\n\nI won't ask any more questions. Your architecture is ready to implement.",
            functions_called: responseMessage.tool_calls.length,
            provider: 'openai-complete',
            usage: finalResponse.usage 
          });
        }
        
        const specificQuestions = getSpecificQuestionForDocType(nextDocType);
        
        return NextResponse.json({ 
          text: specificQuestions,
          functions_called: responseMessage.tool_calls.length,
          provider: 'openai',
          usage: finalResponse.usage 
        });
      }
      
      return NextResponse.json({ 
        text: finalText,
        functions_called: responseMessage.tool_calls.length,
        provider: 'openai',
        usage: finalResponse.usage 
      });

    } catch (finalResponseError: any) {
      console.error('OpenAI final response error:', finalResponseError?.message);
      
      // Use the session context logic to get the exact next document type
      const existingDocs = userSession ? await prisma.specification.findMany({
        where: { userSession },
        select: { documentType: true },
        orderBy: { createdAt: 'asc' }
      }) : [];

      const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                               'api', 'devops', 'testing_plan', 'code_documentation', 
                               'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
      
      const completedTypes = existingDocs.map(doc => doc.documentType as string);
      const nextDocType = documentSequence.find(type => !completedTypes.includes(type));
      
      if (!nextDocType) {
        // All documents are complete
        console.warn('All 13 documents completed for session:', userSession);
        
        // Mark session as complete via API
        try {
          const completionMessage = "🎉 All project documents are complete! Your full software architecture specification is ready.";
          
          // Call the completion API to mark session as complete
          const completionResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:5000'}/api/sessions/${userSession}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalId,
              completionMessage
            }),
          });

          if (!completionResponse.ok) {
            console.error('Failed to mark session as complete:', await completionResponse.text());
          } else {
            console.log('Session marked as complete successfully');
          }
        } catch (error) {
          console.error('Error calling completion API:', error);
        }
        
        return NextResponse.json({ 
          text: "🎉 All project documents are complete! Your full software architecture specification is ready. Click the 'View Generated Documents' button below to explore and download your documents.",
          functions_called: responseMessage.tool_calls.length,
          provider: 'openai-fallback-complete',
          usage: null,
          sessionComplete: true // Add flag for frontend to show transition button
        });
      }
      
      const fallbackResponse = getSpecificQuestionForDocType(nextDocType);
      
      return NextResponse.json({ 
        text: fallbackResponse,
        functions_called: responseMessage.tool_calls.length,
        provider: 'openai-fallback',
        usage: null
      });
    }
  }

  // No function calls - return normal response
  const text = responseMessage.content || '';
  
  // Increment question count if this is a question (applies to both fast and slow mode)
  if (userSession && text.includes('?')) {
    // Get the next document type to increment count for
    const existingDocs = await prisma.specification.findMany({
      where: { userSession },
      select: { documentType: true },
      orderBy: { createdAt: 'asc' }
    });
    
    const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                             'api', 'devops', 'testing_plan', 'code_documentation', 
                             'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
    
    const completedTypes = existingDocs.map(doc => doc.documentType as string);
    const nextDocType = documentSequence.find(type => !completedTypes.includes(type)) || 'prd';
    
    await incrementQuestionCount(userSession, nextDocType, externalId);
  }
  
  return NextResponse.json({ 
    text,
    provider: 'openai',
    usage: response.usage 
  });
}

// Handler for Claude requests
async function handleClaudeRequest(messages: any[], contextualPrompt: string, userSession: string, techDecisions = false, fastMode = false, timeline = 1, externalId = 'sreeveTest123', contextualIntroBrief?: any) {
  const response = await callClaude(messages, contextualPrompt);
  
  // Check if Claude wants to call a tool
  const toolUses = response.content.filter((content: any) => content.type === 'tool_use');
  
  if (toolUses.length > 0) {
    const functionResults = await handleClaudeToolCalls(toolUses, userSession, externalId);

    try {
      // Convert function results to Claude message format and send back
      const claudeMessages = messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      // Add the assistant's tool use message
      claudeMessages.push({
        role: 'assistant',
        content: response.content
      });

      // Add tool results
      claudeMessages.push({
        role: 'user',
        content: functionResults
      });

      // Re-generate contextual prompt after tool calls to point to NEXT document type
      const updatedDocs = userSession ? await prisma.specification.findMany({
        where: { userSession },
        select: { documentType: true },
        orderBy: { createdAt: 'asc' }
      }) : [];
      
      const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                               'api', 'devops', 'testing_plan', 'code_documentation', 
                               'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
      
      const updatedCompletedTypes = updatedDocs.map(doc => doc.documentType as string);
      const updatedNextDocType = documentSequence.find(type => !updatedCompletedTypes.includes(type));
      
      // Regenerate mode prompts 
      const techModePrompt = techDecisions 
        ? `\n\n## TECHNICAL DECISIONS MODE ACTIVE:\nThe user wants you to make technical decisions. Skip detailed technical questions and use sensible defaults. Focus on product/business questions only.`
        : '';
        
      const fastModePrompt = fastMode 
        ? `\n\n## FAST MODE ACTIVE:\nUse reduced question limits per document type. Ask only the most uncertain questions where you need user input.`
        : `\n\n## NORMAL MODE ACTIVE:\nUse standard question limits (6 max per document). Focus on thorough requirement gathering.`;
      
      // Create UPDATED contextual prompt pointing to next document
      const timelinePrompt = `\n\n## TIMELINE CONTEXT:\nProject timeline setting: ${timeline}/10. Use this to inform scope and technology recommendations without mentioning specific timeframes to users.`;
      const introBriefPromptLocal = contextualIntroBrief 
        ? `\n\n## PROJECT CONTEXT FROM INTRO:\n- What they're creating: ${contextualIntroBrief.whatTheyreDoing}\n- Project type: ${contextualIntroBrief.projectType}\n- Target audience: ${contextualIntroBrief.audience}\n- Problem solving: ${contextualIntroBrief.problem}\n- Timeline: ${contextualIntroBrief.timeline}\n- Team size: ${contextualIntroBrief.teamSize}`
        : `\n\n**FIRST MESSAGE WITHOUT INTRO CONTEXT**: If this is the first message and no intro context exists, start with PRD questions based on your judgment of what's most important to ask first.`;
      
      const updatedContextualPrompt = updatedDocs.length > 0 && updatedNextDocType
        ? `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefPromptLocal}\n\n## SESSION CONTEXT:\nCompleted documents: ${updatedCompletedTypes.join(', ')}\nNEXT DOCUMENT TO CREATE: ${updatedNextDocType}\n\nDo NOT create documents that already exist. When you have sufficient information about ${updatedNextDocType}, call save_specification_document tool to create the ${updatedNextDocType} document, then move to the next phase.`
        : `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefPromptLocal}`;

      // Get final response from Claude with proper message formatting
      const cleanFinalMessages = claudeMessages
        .filter((msg: any) => msg.content && (typeof msg.content === 'string' ? msg.content.trim() : true))
        .map((msg: any) => ({
          ...msg,
          content: typeof msg.content === 'string' ? msg.content.trim() : msg.content
        }));

      const finalResponse = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-opus-4-1-20250805',
        max_tokens: 4096,
        system: updatedContextualPrompt,
        messages: cleanFinalMessages as any,
        temperature: 1,
      });

      const finalText = (finalResponse.content[0] as any)?.text || '';
      
      // If Claude returns empty response after tool use, move to next document
      if (!finalText.trim()) {
        // Re-query to get UPDATED completion state after tool call
        const updatedDocs = userSession ? await prisma.specification.findMany({
          where: { userSession },
          select: { documentType: true },
          orderBy: { createdAt: 'asc' }
        }) : [];

        const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                                 'api', 'devops', 'testing_plan', 'code_documentation', 
                                 'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
        
        const completedTypes = updatedDocs.map(doc => doc.documentType as string);
        const nextDocType = documentSequence.find(type => !completedTypes.includes(type));
        
        if (!nextDocType) {
          console.log('All 13 documents completed for session:', userSession);
          return NextResponse.json({ 
            text: "🎉 **Project Complete!** All 13 architecture documents have been generated.\n\n**Next Steps:**\n• View your complete specifications in the Dashboard\n• Download your project files\n• Start building!\n\nI won't ask any more questions. Your architecture is ready to implement.",
            functions_called: toolUses.length,
            provider: 'claude-complete',
            usage: finalResponse.usage 
          });
        }
        
        const specificQuestions = getSpecificQuestionForDocType(nextDocType);
        
        return NextResponse.json({ 
          text: specificQuestions,
          functions_called: toolUses.length,
          provider: 'claude',
          usage: finalResponse.usage 
        });
      }
      
      return NextResponse.json({ 
        text: finalText,
        functions_called: toolUses.length,
        provider: 'claude',
        usage: finalResponse.usage 
      });

    } catch (finalResponseError: any) {
      console.error('Claude final response error:', finalResponseError?.message);
      
      // Use the session context logic to get the exact next document type
      const existingDocs = userSession ? await prisma.specification.findMany({
        where: { userSession },
        select: { documentType: true },
        orderBy: { createdAt: 'asc' }
      }) : [];

      const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                               'api', 'devops', 'testing_plan', 'code_documentation', 
                               'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
      
      const completedTypes = existingDocs.map(doc => doc.documentType as string);
      const nextDocType = documentSequence.find(type => !completedTypes.includes(type));
      
      if (!nextDocType) {
        // All documents are complete
        console.warn('All 13 documents completed for session:', userSession);
        return NextResponse.json({ 
          text: "🎉 All project documents are complete! Your full software architecture specification is ready. You can start a new project or review the generated documents.",
          functions_called: toolUses.length,
          provider: 'claude-fallback-complete',
          usage: null
        });
      }
      
      const fallbackResponse = getSpecificQuestionForDocType(nextDocType);
      
      return NextResponse.json({ 
        text: fallbackResponse,
        functions_called: toolUses.length,
        provider: 'claude-fallback',
        usage: null
      });
    }
  }

  // No function calls - return normal response
  const text = (response.content[0] as any)?.text || '';
  
  // Increment question count if this is a question (applies to both fast and slow mode)
  if (userSession && text.includes('?')) {
    // Get the next document type to increment count for
    const existingDocs = await prisma.specification.findMany({
      where: { userSession },
      select: { documentType: true },
      orderBy: { createdAt: 'asc' }
    });
    
    const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                             'api', 'devops', 'testing_plan', 'code_documentation', 
                             'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
    
    const completedTypes = existingDocs.map(doc => doc.documentType as string);
    const nextDocType = documentSequence.find(type => !completedTypes.includes(type)) || 'prd';
    
    await incrementQuestionCount(userSession, nextDocType, externalId);
  }
  
  return NextResponse.json({ 
    text,
    provider: 'claude',
    usage: response.usage 
  });
}

// Save specification document to database
async function saveSpecificationDocument(
  filename: string, 
  content: string, 
  description: string, 
  document_type: string,
  next_steps?: string,
  skip_technical_summary?: boolean,
  userSession?: string,
  externalId?: string
) {
  console.log(`📄 Saving specification: ${filename}`);
  console.log(`📋 Type: ${document_type}`);
  console.log(`📏 Content length: ${content.length} characters`);
  
  try {
    // Map document_type to Prisma enum
    // No mapping needed - direct match between tool and database enum
    const documentTypeMap: Record<string, any> = {
      'prd': 'prd',
      'frontend': 'frontend', 
      'backend': 'backend',
      'statemanagement': 'state_management',
      'state-management': 'state_management',
      'databaseschema': 'database_schema',
      'database-schema': 'database_schema',
      'api': 'api',
      'devops': 'devops',
      'testingplan': 'testing_plan',
      'testing-plan': 'testing_plan',
      'codedocumentation': 'code_documentation',
      'code-documentation': 'code_documentation',
      'performanceoptimization': 'performance_optimization',
      'performance-optimization': 'performance_optimization',
      'userflow': 'user_flow',
      'user-flow': 'user_flow',
      'thirdpartylibraries': 'third_party_libraries',
      'third-party-libraries': 'third_party_libraries',
      'readme': 'readme'
    };
    
    const spec = await prisma.specification.create({
      data: {
        filename,
        content,
        description,
        documentType: documentTypeMap[document_type] || document_type,
        nextSteps: next_steps,
        skipTechnicalSummary: skip_technical_summary || false,
        userSession: userSession || uuidv4(), // Generate session if not provided
        externalId: externalId || 'sreeveTest123'
      }
    });
    
    console.log(`✅ Saved specification with ID: ${spec.id}`);
    
    return { 
      success: true, 
      id: spec.id,
      document_type,
      filename,
      user_session: spec.userSession
    };
  } catch (error) {
    console.error('❌ Database error:', error);
    throw new Error('Failed to save specification document');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, userSession, externalId = 'sreeveTest123', techDecisions = false, fastMode = true, timeline = 1, introBrief } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    // Skip intro brief - architect works standalone now
    let contextualIntroBrief = null;

    // If this is a fresh conversation (first message), ignore existing docs and start fresh
    const existingDocs = (userSession && messages.length > 1) ? await prisma.specification.findMany({
      where: { userSession },
      select: { documentType: true, filename: true },
      orderBy: { createdAt: 'asc' }
    }) : [];

    // Determine next document type in sequence
    const documentSequence = ['prd', 'frontend', 'backend', 'state_management', 'database_schema', 
                             'api', 'devops', 'testing_plan', 'code_documentation', 
                             'performance_optimization', 'user_flow', 'third_party_libraries', 'readme'];
    
    const completedTypes = existingDocs.map(doc => doc.documentType as string);
    const nextDocType = documentSequence.find(type => !completedTypes.includes(type)) || 'prd';
    
    // Check if all documents are already complete before processing
    if (completedTypes.length >= 13) {
      // Mark session as complete and track tool usage
      await prisma.savedSession.updateMany({
        where: { userSession },
        data: { isComplete: true }
      });
      
      // Track completion tool usage
      const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
      await prisma.toolUsage.create({
        data: {
          externalId,
          usageType: 'session_complete',
          userSession,
          month: currentMonth
        }
      });
      
      return NextResponse.json({ 
        text: "🎉 **Project Complete!** All 13 architecture documents have been generated.\n\n**Next Steps:**\n• View your complete specifications in the Dashboard\n• Download your project files\n• Start building!\n\nI won't ask any more questions. Your architecture is ready to implement.",
        provider: 'complete',
        usage: null
      });
    }
    
    // Create context-aware system prompt
    const techModePrompt = techDecisions 
      ? `\n\n## TECHNICAL DECISIONS MODE ACTIVE:\nThe user wants you to make technical decisions. Skip detailed technical questions and use sensible defaults. Focus on product/business questions only.`
      : '';
      
    const fastModePrompt = fastMode 
      ? `\n\n## FAST MODE ACTIVE:\nUse reduced question limits per document type. Ask only the most uncertain questions where you need user input.`
      : `\n\n## NORMAL MODE ACTIVE:\nUse standard question limits (6 max per document). Focus on thorough requirement gathering.`;
      
    const timelinePrompt = `\n\n## TIMELINE CONTEXT:\nProject timeline setting: ${timeline}/10. Use this to inform scope and technology recommendations without mentioning specific timeframes to users.`;

    // Get question count and limits based on mode and document type
    const questionCount = userSession ? await getQuestionCount(userSession, nextDocType) : 0;
    const maxQuestions = getQuestionLimits(nextDocType, fastMode);
    
    // No intro brief context - architect works standalone
    const introBriefPrompt = '';
      
    const contextualPrompt = existingDocs.length > 0 
      ? `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefPrompt}\n\n## SESSION CONTEXT:\nCompleted documents: ${completedTypes.join(', ')}\nNEXT DOCUMENT TO CREATE: ${nextDocType}\nQuestions asked for ${nextDocType}: ${questionCount}/${maxQuestions}\n\n${questionCount >= maxQuestions 
          ? `QUESTION LIMIT REACHED: Make background decisions for remaining questions and create the ${nextDocType} document immediately.`
          : `Ask only highest uncertainty questions for ${nextDocType}. When limit reached or sufficient info gathered, create document with background decisions for unasked questions.`}\n\nDo NOT create documents that already exist. When you have sufficient information about ${nextDocType}, call save_specification_document tool to create the ${nextDocType} document, then move to the next phase.`
      : `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefPrompt}`;

    // Step 1: Send request with tools available using the selected AI provider
    if (AI_PROVIDER === 'claude') {
      try {
        return await handleClaudeRequest(messages, contextualPrompt, userSession, techDecisions, fastMode, timeline, externalId, contextualIntroBrief);
      } catch (error: any) {
        console.error('Claude request failed, attempting fallback to OpenAI:', error?.message);
        
        // Fallback to OpenAI if Claude fails
        if (process.env.OPENAI_API_KEY) {
          console.log('Falling back to OpenAI...');
          return await handleOpenAIRequest(messages, contextualPrompt, userSession, techDecisions, fastMode, timeline, externalId, contextualIntroBrief);
        } else {
          throw error; // Re-throw if no OpenAI fallback available
        }
      }
    } else {
      return await handleOpenAIRequest(messages, contextualPrompt, userSession, techDecisions, fastMode, timeline, externalId, contextualIntroBrief);
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' }, 
      { status: 500 }
    );
  }
}