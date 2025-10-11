# Chat Context History - V1 Restoration Implementation

## Problem Summary
User reported broken chatbot that was asking wrong number of questions and not generating documents properly. The AI was calling `decide_next_document` after only 2 questions instead of 5 for PRD phase.

## Root Issues Identified
1. **Missing async document generation**: Had placeholder "would go here" instead of real implementation
2. **Wrong API parameters**: Using `max_tokens` instead of `max_completion_tokens` for GPT-5
3. **Wrong tool approach**: Using `decide_next_document` with brief summary instead of V1's `save_specification_document` with full content
4. **Missing V1 key features**: Uncertainty scoring, background decision making, intelligent question selection

## V1 Key Features That Made It Work
1. **Uncertainty Scoring (1-10 scale)**: AI prioritizes most uncertain questions that require user input
2. **Background Decision Making**: AI fills gaps for unasked questions using project context, timeline, audience, industry standards
3. **Static Question Limits**: PRD(5), Frontend(3), Backend(3), etc. - ask exactly N most uncertain questions, decide rest
4. **save_specification_document tool**: AI generates complete markdown with both user answers AND background decisions
5. **Comprehensive Document Generation**: Full technical specs incorporating all decisions

## Implementation Solution
- **Restored V1 `save_specification_document` tool** with full content generation
- **Added async saving**: Mark as queued immediately, save in background (don't block chat)
- **Optimized V1 prompt**: Condensed but kept uncertainty scoring and background decisions
- **Dual model approach**: GPT-4-turbo for questions, GPT-5 for document generation
- **Static limits with intelligence**: Ask exactly 5 most uncertain PRD questions, make background decisions for rest

## Key Code Changes
1. Tool definition: `decide_next_document` → `save_specification_document`
2. System prompt: Added uncertainty scoring instructions and background decision sources
3. Tool handler: Async document saving with queue management
4. Response logic: Use AI-generated `next_steps` for phase transitions
5. Question limits: Static counts (5, 3, 3, 1, 3, 2, 2, 1, 1, 1, 3, 1, 2) with intelligent selection

## Final Architecture
- AI asks exactly N most uncertain questions per document type
- AI makes intelligent background decisions for remaining questions
- AI generates comprehensive document with both user inputs and background decisions
- Document saves asynchronously while chat continues to next phase
- High quality documents through V1's proven approach + async speed improvements