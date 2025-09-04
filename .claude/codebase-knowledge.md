# Software Project Architect - Codebase Knowledge Journal

**Last Updated:** August 30, 2025

## Project Purpose & Overview

**Software Project Architect** is a Next.js application that serves as an AI-powered project planning assistant. It guides users through a structured 13-step process to generate comprehensive software architecture specifications.

### Core Functionality
- **Dual AI Provider Support**: Works with both OpenAI (GPT models) and Anthropic Claude
- **Sequential Document Generation**: Creates 13 specific architectural documents in a predefined order
- **Interactive Planning**: Asks targeted questions to gather requirements and preferences
- **Database Storage**: Persists all generated documents and user sessions

## Architecture

### Tech Stack
- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **AI Providers**: OpenAI API, Anthropic Claude API
- **Session Management**: UUID-based user sessions

### Key Components

#### 1. API Route (`app/api/chat/route.ts`)
- **Primary Interface**: Handles all chat interactions
- **AI Provider Switching**: Environment variable `AI_PROVIDER` controls which model to use
- **Tool Calling**: Implements `save_specification_document` function for both providers
- **Error Handling**: Retry logic with exponential backoff for Claude API
- **Fallback System**: OpenAI fallback when Claude fails

#### 2. Database Schema (`prisma/schema.prisma`)
- **Specifications Table**: Stores all generated documents
- **Document Types**: 13 predefined enum types matching the workflow
- **Session Tracking**: Groups documents by user session
- **Metadata**: Includes filename, description, next steps

#### 3. Frontend (`components/chat.tsx`, `app/page.tsx`)
- **Chat Interface**: React-based chat UI
- **Real-time Updates**: Displays AI responses and handles user input

## 13-Document Workflow Sequence

1. **prd.md** — Product Requirements Document
2. **frontend.md** — UI framework and component architecture
3. **backend.md** — Server architecture and integrations
4. **state-management.md** — State handling patterns
5. **database-schema.md** — Data models and relationships
6. **api.md** — Endpoint specifications
7. **devops.md** — Deployment and infrastructure
8. **testing-plan.md** — Testing strategy and tools
9. **code-documentation.md** — Documentation standards
10. **performance-optimization.md** — Performance requirements
11. **user-flow.md** — User journey diagrams
12. **third-party-libraries.md** — External dependencies
13. **readme.md** — Project documentation

## Widget Integration Implementation (September 2025)

### Feature: Intro Chat & Architect Flow Redesign
**Goal**: Transform the "interrogation" experience into engaging conversation with widget integration capability

**Implementation Overview**:
- **6-Question Intro Flow**: Conversational questions to build rapport before technical architect phase
- **Widget Architecture**: Standalone app on port 5000 for iframe embedding in parent applications
- **Intelligent Transitions**: Natural handoff between intro and architect phases
- **Context Preservation**: Intro brief data informs architect questions

### Database Schema Enhancements
**New Models Added**:
- **IntroBrief**: Stores 6 intro questions (whatTheyreDoing, projectType, audience, problem, timeline, teamSize)
- **Enhanced SavedSession**: Added `sessionType` field ('intro' or 'architect')
- **Enhanced Specification**: Added `externalId` for multi-tenant widget usage
- **ToolUsage**: Tracks API usage for billing (intro_complete, session_saved, session_complete)

### API Endpoints Created
- **`/api/intro-chat`**: Handles 6-question intro conversation with GPT-5 integration
- **`/api/intro-brief`**: Save/retrieve intro data to/from database
- **`/api/intro-to-architect`**: Manages transition between intro and architect phases
- **`/api/auth/verify-token`**: JWT authentication for parent app widget embedding
- **`/api/sessions`**: Enhanced session management with intro/architect types
- **`/api/usage`**: Tool usage tracking for analytics and billing

### Widget Integration Infrastructure
- **Standalone Widget**: Runs on port 5000 with `/widget` route for iframe embedding
- **JWT Authentication**: Secure token-based auth for parent app integration
- **Theme Inheritance**: CSS custom properties for parent app styling consistency
- **PostMessage Communication**: Safe cross-frame communication for events
- **Session Management**: Proper isolation between intro and architect phases

### Intro Chat Intelligence (Latest Fix by Windsurf)
**Problem Solved**: Intro chat was using complex API calls that failed due to GPT-5 parameter restrictions

**Windsurf's Implementation**:
1. **Simplified GPT-5 Integration** (`intro-chat/route.ts:246-274`):
   - Removed temperature parameter (GPT-5 only supports default 1.0)
   - Clean system prompt with examples for restating behavior
   - max_completion_tokens: 200 (reduced from 500)
   - Simple fallback that preserves restating pattern

2. **Enhanced IntroChat Component** (`IntroChat.tsx:110-122`):
   - Added `handleFallbackResponse` function with intelligent restating
   - Clean API integration with proper error handling
   - TypeScript strict typing (`role: 'assistant' as const`)
   - Graceful fallback that maintains conversation flow

3. **Natural Transition Messages** (`intro-to-architect/route.ts:86`):
   - Replaced bullet-point summaries with conversational acknowledgment
   - References user's project context naturally
   - Asks engaging first architect question instead of technical jargon

**Key Improvements**:
- **Intelligent Restating**: "A fitness app - that sounds amazing! I love that you're focusing on health and wellness."
- **Context Awareness**: Avoids "mobile app" → "mobile app" repetition by using project context
- **Reliable API Calls**: GPT-5 compatible parameters with consistent responses
- **Clean Error Handling**: Simple fallbacks that maintain user experience

### Architect Context Integration
**Enhanced `/api/chat` route**:
- **Intro Brief Loading**: Automatically retrieves intro context from database
- **Natural Context Blending**: Uses intro data to inform architect questions without bullet points
- **Session Continuity**: Proper handoff from intro session to architect session
- **Smart Defaults**: Uses intro context to avoid redundant questions

**Result**: Architect now says *"Great! I understand you're building a fun pickleball mobile game for gamers with a short timeline and a team of 2. Let me ask you a few more details..."*

## Recent Issues & Fixes

### Issue: Inconsistent Document Generation (Aug 30, 2025)
**Problem**: AI models were skipping tool calls, only generating some documents (e.g., only PRD + state-management out of 13)

**Root Cause Analysis**:
- System prompt had backwards logic (create document before asking questions)
- Models need to gather information FIRST, then create documents
- Correct flow: Ask questions → Gather info → Create document → Next phase

**Solution Implemented**:
1. **Fixed System Prompt Logic**: Corrected workflow to ask questions first, then create documents
2. **Sequential Processing**: Ask questions → Create document → Move to next document type
3. **Clear Instructions**: Enhanced prompts to clarify when to create documents (after gathering info)

**Key Changes**:
- `route.ts:80-82`: Fixed workflow requirements to ask questions first
- `route.ts:90-96`: Updated interaction style for one question at a time with A-C options
- `route.ts:114-120`: Updated response pattern for single focused questions
- `route.ts:331-360`: Simplified question templates to use A-C format with "or specify something different"
- Removed premature validation logic that was checking for documents before questions were asked

**Current Flow**: Ask single question with A-C options → Get user response → Ask follow-up if needed → Create document when sufficient info gathered → Move to next document type

### Issue: Document Type Loop Bug (Aug 31, 2025)
**Problem**: AI was creating multiple documents of the same type (3 state-management docs in a row) instead of progressing through the sequence

**Root Cause**: 
- `documentSequence` arrays used underscores (`state_management`)
- Tool definition uses hyphens (`state-management`) 
- Database stores underscores, mapping converts to hyphens for comparison
- But sequence comparison failed because `['state-management'].includes('state_management')` = false

**Solution**: Updated all `documentSequence` arrays to use hyphens to match tool definition format

**Key Changes**:
- `route.ts:696-698`: Fixed documentSequence to use hyphens consistently
- Applied replace_all to fix all 5+ instances across the file

### Issue: JSON Tool Call Leakage (Aug 31, 2025)
**Problem**: AI model was outputting raw JSON tool parameters in response text instead of using proper tool calling mechanism

**Root Cause**: Model was "showing" the tool call instead of executing it, mixing response text with tool JSON

**Solution**: Added explicit instructions in system prompt to prevent JSON leakage

**Key Changes**:
- `route.ts:119-120`: Added CRITICAL instructions to never output JSON in response text
- `route.ts:120`: Emphasized proper tool calling mechanism usage

### Feature: Technical Decisions Toggle (Aug 31, 2025)
**Feature**: Added toggle to let AI make technical decisions automatically, focusing only on product/business questions

**Implementation**:
- `route.ts:100-103`: Added Technical Decisions Mode section to system prompt
- `route.ts:690`: Added techDecisions parameter to POST handler
- `route.ts:712-718`: Enhanced contextual prompt to include tech mode instructions
- `chat.tsx:15`: Added techDecisions state
- `chat.tsx:52`: Pass techDecisions in API request
- `chat.tsx:79-95`: Added toggle slider UI component

**Behavior**:
- **When ON**: AI uses sensible technical defaults, asks only product/business questions
- **When OFF**: AI asks detailed technical questions for each document type
- **Toggle anytime**: User can switch mid-conversation

**Technical Defaults**: React Native + Expo, Node.js + TypeScript, PostgreSQL + Prisma, Zustand + React Query, JWT auth, Vercel/Fly.io deployment

### Fix: Eliminate Hyphen/Underscore Mismatch Entirely (Aug 31, 2025)
**Problem**: Ongoing string matching issues between document types with hyphens vs underscores causing loops and progression failures

**Solution**: Converted ALL document type names to single combined words (no hyphens or underscores anywhere)

**Changes Applied**:
- `schema.prisma:28-43`: Updated enum to use combined words (statemanagement, databaseschema, testingplan, etc.)
- `route.ts`: Updated all documentSequence arrays to match
- `route.ts:705-720`: Updated documentTypeMap to direct 1:1 mapping
- Removed all `.replace('_', '-')` mapping logic since no conversion needed
- `npx prisma migrate reset --force`: Applied database changes

**New Document Types**: prd, frontend, backend, statemanagement, databaseschema, api, devops, testingplan, codedocumentation, performanceoptimization, userflow, thirdpartylibraries, readme

**Result**: Zero possibility of string mismatch bugs between tool definitions, database enum, and sequence arrays

### Issue: Session Continuation Bug (Aug 31, 2025)
**Problem**: Fresh conversations were continuing from previous session documents instead of starting from scratch

**Root Cause**: 
- Backend was always checking existing documents for a userSession
- When user clicked "New Project", frontend generated new sessionId but backend still found old documents
- System jumped to middle of workflow instead of starting at PRD

**Solution**: Added conversation isolation logic

**Key Changes**:
- `route.ts:699`: Only check existing docs if `messages.length > 1` (not a fresh conversation)
- Fresh conversations (first message) ignore existing documents and start from PRD
- Maintains session continuity for ongoing conversations
- Proper separation between user sessions and conversation sessions

### Optimization: Question Limits (Aug 31, 2025)
**Updated question limits for better UX**:
- Goal: 3 questions per document (efficient)
- Hard cap: 5 questions maximum
- Bundling: Ask 2 related questions together when possible
- `route.ts:83`: Updated completion trigger
- `route.ts:94`: Added question limit guidance

### Issue: Excessive Questioning + Tool Call Detection Bug (Aug 31, 2025)
**Problem**: System was asking 10+ questions per document instead of 3-5, and not moving to next document after creation

**Root Cause**: 
- After tool calls, system was using OLD contextual prompt that still pointed to same document type
- Document completion state wasn't being refreshed after tool calls
- AI didn't know when to stop asking questions for current document

**Solution**: 
- `route.ts:402-406`: Re-query database AFTER tool calls to get updated completion state
- `route.ts:540-544`: Same fix for Claude handler
- This ensures system moves to next document type immediately after creation

### Feature: Fast Mode Toggle (Aug 31, 2025)
**Feature**: Added "Fast mode" toggle to limit questioning to 1-3 most uncertain questions only

**Implementation**:
- `route.ts:106-109`: Added Fast Mode section to system prompt
- `route.ts:689`: Added fastMode parameter to POST handler  
- `route.ts:721-723`: Enhanced contextual prompt with fast mode instructions
- `chat.tsx:16`: Added fastMode state
- `chat.tsx:53`: Pass fastMode in API request
- `chat.tsx:81-96`: Added fast mode toggle slider (green color)

**Behavior**:
- **Fast mode ON**: Ask only 1-3 questions where AI is most uncertain, skip obvious questions
- **Fast mode OFF**: Normal flow (aim for 3, max 5 questions)
- **Two toggles**: Fast mode (green) + Technical decisions (blue)

## Development Patterns

### AI Provider Abstraction
- Unified tool definition for both OpenAI and Claude
- Provider-specific message formatting and error handling
- Consistent fallback patterns

### Document Creation Flow
1. User sends message
2. System determines next document type from sequence
3. AI model creates document using tool call
4. System validates document was created
5. If not created, retry with enhanced prompt
6. Ask next question only after document is saved

### Error Handling Strategy
- Exponential backoff for API failures
- Provider fallback (Claude → OpenAI)
- Graceful degradation with fallback responses
- Comprehensive logging for debugging

## Code Quality Notes

### Strengths
- Clear separation of concerns
- Robust error handling
- Dual provider support
- Type safety with TypeScript and Prisma

### Areas for Future Improvement
- Consider extracting AI provider logic into separate services
- Add unit tests for document generation flow
- Implement better session management UI
- Add document export/download functionality

## Development Environment

### Dependencies
- Next.js framework with API routes
- Prisma for database management
- OpenAI and Anthropic SDKs
- TypeScript for type safety
- Tailwind for styling

### Database
- PostgreSQL backend
- Prisma migrations in `prisma/migrations/`
- CRUD operations through Prisma client

## Future Considerations

### Scalability
- Session-based architecture supports multiple concurrent users
- Database indexes on userSession for query performance
- Stateless API design enables horizontal scaling

### Extensibility
- Document types can be extended through enum updates
- Tool definitions can be enhanced with additional parameters
- AI provider abstraction allows easy addition of new models