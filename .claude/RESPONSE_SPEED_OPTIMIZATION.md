# Response Speed Optimization Plan

## Current Performance Analysis

**Observed Times:**
- New sessions: ~18 seconds
- End of sessions: ~60 seconds (3x degradation)

**Root Cause Analysis:**

### 1. **MASSIVE SYSTEM PROMPT** (Primary Bottleneck)
- **Current size**: ~3,500+ characters (Lines 67-175 in route.ts)
- **Impact**: 18s base latency even for new sessions
- **Problem**: AI processes entire prompt on every request

### 2. **Full Message History** (Growth Bottleneck)
- **Current**: Sends entire conversation history every time
- **Impact**: 18s → 60s linear degradation as conversation grows
- **Problem**: No conversation summarization or truncation

### 3. **Heavy Model Usage**
- **Current**: GPT-5 for ALL responses (including simple questions)
- **Problem**: Overkill for non-document-generation interactions

## Practical Quick Wins (Priority Order)

### 🔥 PHASE 1: Prompt Diet + Strict Question Limits (Est. 60% improvement - Target: 18s → 7s)

**Current Prompt Bloat (Lines to cut):**
- Lines 78-85: Timeline explanation (AI can infer from value)
- Lines 102-140: Detailed uncertainty scoring algorithm (AI can do this naturally)
- Lines 141-154: Internal document flow list (AI knows this from context)
- Lines 167-174: Tech defaults (can be shorter)

**Critical Addition: ENFORCE STRICT QUESTION LIMITS**
- Force LLM to trigger document generation at EXACT question counts
- This ensures questions switch to next step while previous doc generates async
- Prevents "stuck" questions during background doc generation

**Optimized Prompt (Keep only essentials + strict limits):**
```
You are a Technical Project Planning Assistant. Guide users through 13 document steps sequentially.

CRITICAL QUESTION LIMITS (MUST trigger decide_next_document at these counts):
- PRD: After 5 questions → generate doc + move to Frontend
- Frontend: After 3 questions → generate doc + move to Backend
- Backend: After 3 questions → generate doc + move to State Management
- State Management: After 1 question → generate doc + move to Database
- Database: After 3 questions → generate doc + move to API
- API: After 2 questions → generate doc + move to DevOps
- DevOps: After 2 questions → generate doc + move to Testing
- Testing/Docs/Performance/Libraries: After 1 question each → generate + move to next
- User Flow: After 3 questions → generate doc + move to Libraries
- README: After 2 questions → generate final doc

Current step: [STEP_NUMBER] (previous doc generating in background if > 1)
Questions answered for current step: [QUESTION_COUNT]

Rules:
1. Ask 1 focused question with A-C options
2. When question count = limit for current doc type, MUST call decide_next_document
3. Move immediately to next document questions (previous doc saves async)
4. NEVER mention document names to users
5. NEVER exceed question limits - trigger doc generation at exact count

Tech defaults: React Native+TS, Node.js+TS, PostgreSQL+Prisma, Zustand, JWT auth.
Timeline values: 1=2days...10=12weeks. Adjust complexity based on timeline.
```

**Key Benefits**:
- Forces step transition at exact question counts
- Questions continue while previous doc generates
- No more "stuck" questions during doc generation
- Stepper and questions stay synchronized

**Target**: 1000 characters (still 70% reduction from 3500+)

### 🔥 PHASE 2: Message History Truncation (Est. 70% improvement - Target: 60s → 18s)

**Current Problem**: Full conversation history sent every time

**Solution**: Keep only last 6-8 messages + intro brief
- User answers (A/B/C selections)
- Recent context
- Current session state

**Implementation**:
```javascript
// Keep only essential context
const recentMessages = messages.slice(-6); // Last 6 messages
const contextMessages = [
  systemPrompt,
  introBrief || "Brief: [project description]",
  ...recentMessages
];
```

### 🔥 PHASE 3: Model Switching (Est. 30% improvement - Target: Additional 2-3s)

**Current**: GPT-5 for everything
**Optimized**:
- GPT-4-turbo for questions/responses (95% quality, 40% faster)
- Keep GPT-5 only for document generation (background)

**Quality Impact**: Minimal - questions don't need GPT-5 complexity

## Implementation Plan

### Step 1: Prompt Optimization (30 minutes)
1. Replace SYSTEM_PROMPT with streamlined version
2. Remove verbose sections (uncertainty algorithm, document list, examples)
3. **ADD strict question counting logic**: Include [STEP_NUMBER] and [QUESTION_COUNT] in contextual prompt
4. **ENFORCE exact question limits**: Make LLM trigger doc generation at precise counts
5. Test with A/B comparison to ensure questions switch during async doc generation

### Step 2: Message Truncation (20 minutes)
1. Implement message history slicing
2. Keep intro brief + last 6 messages
3. Test conversation continuity

### Step 3: Model Switch (15 minutes)
1. Change model for non-document calls to GPT-4-turbo
2. A/B test question quality
3. Measure speed improvement

## Expected Results

**Before**: 18s → 60s (new → long sessions)
**After Phase 1**: 7s → 24s (60% improvement)
**After Phase 2**: 7s → 12s (80% improvement)
**After Phase 3**: 5s → 8s (Target achieved!)

## Success Metrics
- **Target**: <5s for new sessions, <10s for long sessions
- **Quality**: No degradation in question relevance or document quality
- **User Experience**: Immediate responsiveness maintained

## Risk Mitigation
- A/B test each change
- Keep original prompt as rollback
- Monitor for conversation flow issues
- Gradual implementation (one change at a time)

---
*Focus: High-impact, low-risk optimizations implementable in <2 hours*