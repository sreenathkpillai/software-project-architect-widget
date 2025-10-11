# Practical Speed Optimization Plan

## Current Issue Analysis
Based on user observations:
- **New sessions**: ~18 seconds (baseline system prompt + model)
- **End of sessions**: ~60 seconds (system prompt + full conversation history)

## Root Causes Identified

### 1. Massive System Prompt (Primary Issue)
- **Current size**: ~2500+ characters
- **Problem**: AI processes this entire prompt on every request
- **Impact**: 18s base latency even for new sessions

### 2. No Conversation Summarization (Growth Issue)
- **Problem**: Full message history sent every time
- **Impact**: 18s → 60s as conversation grows
- **Pattern**: Linear degradation with message count

### 3. Model Choice Suboptimal
- **Current**: GPT-5 (slower, more expensive)
- **Better option**: GPT-4-turbo for most responses

## Practical Quick Wins (Priority Order)

### 🔥 URGENT: Prompt Optimization (Est. 50-70% improvement)
**Target**: Reduce system prompt from 2500 → 800 characters

**Current prompt waste**:
- Detailed workflow explanations (AI can infer)
- Repetitive instructions
- Examples and criteria that aren't essential
- Internal document listing (unnecessary)

**Keep only**:
- Core role definition
- Essential behavior rules
- Current document context
- Timeline/mode flags

**Expected impact**: 18s → 8-10s for new sessions

### 🔥 HIGH: Message History Truncation (Est. 60-80% improvement)
**Target**: Send only last 6-8 messages instead of full history

**Logic**:
- Keep system prompt + last 6-8 messages
- AI doesn't need the full conversation for next question
- Maintains recent context while eliminating bloat

**Expected impact**: 60s → 12-15s for long sessions

### 🔥 HIGH: Model Switch Test (Est. 20-40% improvement)
**Target**: Use GPT-4-turbo instead of GPT-5 for regular responses

**Approach**:
- Keep GPT-5 only for document generation (background)
- Use GPT-4-turbo for question asking (foreground)
- Test response quality vs speed trade-off

**Expected impact**: Additional 2-5s improvement

### 🟡 MEDIUM: Smart Context Management
**Target**: Include only relevant conversation context

**Logic**:
- Keep intro brief context
- Keep last user answer
- Skip middle conversation unless relevant to current document

## Implementation Plan

### Phase 1: Prompt Diet (Immediate - 1 hour)
1. Strip system prompt to essentials
2. Move verbose instructions to comments
3. Test quality impact with A/B comparison

### Phase 2: Message Truncation (Quick - 30 mins)
1. Limit messages to last 8 messages
2. Always include intro brief if available
3. Test conversation continuity

### Phase 3: Model Switch (Test - 1 hour)
1. Change model from GPT-5 to GPT-4-turbo
2. A/B test 10 conversations
3. Measure speed vs quality trade-off

### Phase 4: Smart Context (Optional - 2 hours)
1. Implement conversation summarization
2. Keep only relevant context per document type
3. Advanced optimization if needed

## Expected Results

**Before**: 18s → 60s (new → long sessions)
**After Phase 1**: 8s → 30s (60% improvement)
**After Phase 2**: 8s → 12s (80% improvement)
**After Phase 3**: 5s → 8s (Target achieved!)

## Success Metrics
- **Target**: <3s for new sessions, <8s for long sessions
- **Acceptable**: <5s for new sessions, <12s for long sessions
- **Monitor**: Response quality degradation (should be minimal)

## Risk Mitigation
- **Quality loss**: A/B test each change
- **Rollback plan**: Keep original prompt as backup
- **Gradual implementation**: One change at a time
- **User feedback**: Monitor for conversation flow issues

---
*This plan focuses on high-impact, low-risk optimizations that can be implemented quickly*