# Software Project Architect - Integration & Marketing Funnel Plan
*Widget Integration, Intro Chat, and Marketing Funnel Implementation*

## Problem Statement

The current fast mode implementation asks too many questions per document type (observed 20+ questions instead of the intended 3 max per document, 5 for PRD). The system should:

- Ask only the 3 most uncertain questions per document (5 for PRD) 
- Make intelligent background decisions for all other micro-decisions
- Generate complete, robust documents incorporating both user answers AND background decisions
- Respect tech decisions toggle (product-only questions when enabled)

## Core Requirements

### Question Selection Algorithm
1. **Generate ALL potential questions** for current document type
2. **Score uncertainty** (1-10 scale) where 10 = most uncertain, requires user input
3. **Sort by uncertainty DESC** and take exactly first 3 questions (5 for PRD)
4. **Tie-breaking**: Simple truncation - if multiple questions have same score, take first 3 in sorted list
5. **Ask selected questions** to user
6. **Make background decisions** for all remaining questions using project context
7. **Generate complete document** incorporating both user answers AND background decisions

### Mode Behaviors
- **Fast Mode ON**: 3 questions max per document (5 for PRD), background decisions for rest
- **Fast Mode OFF**: Current behavior (aim for 3, max 5 questions, no background decisions)
- **Tech Decisions ON**: Prioritize product/UX questions, auto-decide tech stack in background
- **Tech Decisions OFF**: Balance tech + product questions

## Implementation Tasks

### 1. Database Schema Updates
**File**: `prisma/schema.prisma`

Add question tracking to session:
```sql
model QuestionCount {
  id           String @id @default(cuid())
  userSession  String
  documentType String
  questionsAsked Int @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([userSession, documentType])
}
```

### 2. Enhanced System Prompt
**File**: `app/api/chat/route.ts` (lines 74-145)

Add comprehensive decision-making framework:

```markdown
## Question Selection & Background Decision Making

### Fast Mode Process:
1. **Identify ALL potential questions** for current document type
2. **Score uncertainty** (1-10): 
   - 9-10: High uncertainty - project-specific, no clear default
   - 6-8: Medium uncertainty - some defaults exist but context matters
   - 1-5: Low uncertainty - clear industry standards/defaults exist
3. **Sort by uncertainty DESC**, take exactly first 3 (5 for PRD)
4. **Background decisions**: For remaining questions, use:
   - Previous user answers for context
   - Project type/audience (e.g., "casual mobile gamers")
   - Technical constraints (2-day MVP scope)
   - Industry best practices
5. **Document generation**: Include ALL decisions (asked + background)

### Uncertainty Scoring Criteria:
- **High (9-10)**: Core product features, target audience, monetization, unique value prop
- **Medium (6-8)**: Platform choice, architectural patterns, UI frameworks
- **Low (1-5)**: Code style, file structure, deployment details, testing tools

### Tech Decisions Mode:
- **When ON**: Only ask product/business uncertainty questions, auto-decide all tech stack
- **When OFF**: Balance tech + product questions based on uncertainty

### Question Categories:
**Product Questions**: Target audience, features, user flows, monetization, design style
**Tech Questions**: Frameworks, databases, deployment, testing tools, code organization
```

### 3. Question Count Tracking
**File**: `app/api/chat/route.ts`

Add functions:
```typescript
// Track questions asked per document type
async function incrementQuestionCount(userSession: string, documentType: string) {
  await prisma.questionCount.upsert({
    where: { userSession_documentType: { userSession, documentType } },
    update: { questionsAsked: { increment: 1 } },
    create: { userSession, documentType, questionsAsked: 1 }
  });
}

// Get current question count for document type
async function getQuestionCount(userSession: string, documentType: string): Promise<number> {
  const record = await prisma.questionCount.findUnique({
    where: { userSession_documentType: { userSession, documentType } }
  });
  return record?.questionsAsked || 0;
}
```

### 4. Enhanced Contextual Prompt Generation
**File**: `app/api/chat/route.ts` (lines 782-784)

Update contextual prompt to include question limits:
```typescript
const contextualPrompt = existingDocs.length > 0 
  ? `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}\n\n## SESSION CONTEXT:\nCompleted documents: ${completedTypes.join(', ')}\nNEXT DOCUMENT TO CREATE: ${nextDocType}\nQuestions asked for ${nextDocType}: ${questionCount}/${maxQuestions}\n\n${questionCount >= maxQuestions 
      ? `QUESTION LIMIT REACHED: Make background decisions for remaining questions and create the ${nextDocType} document immediately.`
      : `Ask only highest uncertainty questions for ${nextDocType}. When limit reached or sufficient info gathered, create document with background decisions for unasked questions.`}`
  : `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}`;
```

### 5. Request Handler Updates
**File**: `app/api/chat/route.ts` (POST function)

Before calling AI models:
1. Get current question count for active document type
2. Determine if question limit reached
3. Include limit status in contextual prompt
4. After user response: increment question count if asking new question

### 6. Background Decision Integration
**Enhancement to system prompt**

Add section for background decision making:
```markdown
## Background Decision Making (Fast Mode):
When you reach question limits, make intelligent defaults for remaining decisions:

### Decision Sources (in priority order):
1. **User context**: Answers from previous questions in this session
2. **Project type**: Mobile game → mobile-optimized choices
3. **Audience**: Casual gamers → simple, accessible options  
4. **Timeline**: 2-day MVP → proven, simple technology choices
5. **Industry standards**: Well-established patterns for similar projects

### Examples:
- If building mobile game for casual audience → choose simple UI patterns, single-finger controls
- If 2-day timeline → choose proven tech stack (React Native + Expo, not experimental frameworks)
- If target is "quick matches" → choose fast loading, minimal setup options
```

### 7. Document Generation Enhancement
**File**: `app/api/chat/route.ts` (tool call handlers)

Ensure document generation includes instruction to incorporate background decisions:
- Explicit section in documents showing key user choices vs background defaults
- Complete specifications that don't feel "incomplete" due to fewer questions asked

## Testing Strategy

### Test Cases:
1. **Fast Mode + Tech Decisions ON**: Should ask only 3-5 product questions total across all 13 documents
2. **Fast Mode ON + Tech Decisions OFF**: Should ask balanced tech/product questions, 3 per doc max
3. **Fast Mode OFF**: Should maintain current behavior (3-5 questions per doc)
4. **Question limit enforcement**: Verify truncation at exactly 3 questions per document
5. **Document completeness**: Ensure all documents remain comprehensive despite fewer questions

### Validation Points:
- Count questions per document type in real conversations
- Verify documents contain all necessary sections
- Check that background decisions are contextually appropriate
- Ensure tie-breaking produces deterministic results

## Success Metrics

- **Fast Mode**: Max 3 questions per document type (39 total), 5 for PRD (41 total maximum)
- **Document Quality**: Generated docs remain comprehensive and actionable
- **User Experience**: Significantly faster project planning without quality loss
- **Consistency**: Deterministic question selection with proper tie-breaking

## Migration Notes

- Requires database migration for QuestionCount table
- Backwards compatible - existing sessions will work with new logic
- No breaking changes to API interface