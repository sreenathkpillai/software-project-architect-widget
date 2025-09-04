# Testing Guide

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   ```
   Add your OpenAI API key to `.env.local`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   DATABASE_URL="file:./dev.db"
   ```

3. **Initialize database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Visit**: http://localhost:3000

## Testing the Complete Flow

### Test Case 1: Technical User (Full Flow)

**Input**: "I want to build a task management app for teams"

**Expected Behavior**:
1. GPT creates PRD document with `skip_technical_summary=false`
2. Response: "✅ Created PRD covering core features and success metrics. What's your UI preference: React Native for mobile-first, Next.js for web-first, or both platforms?"
3. Continue through all 13 documents, each with technical summaries

**Check Database**: After each response, check that documents are saved:
```bash
npm run db:studio
```

### Test Case 2: Non-Technical User

**Input**: "I want to build an app for my restaurant"

**Expected Behavior**:
1. GPT creates PRD document with `skip_technical_summary=true`
2. Response: "What kind of app do you want: for customers to order food, for staff to manage orders, or both?"
3. No mentions of "PRD", "API specs", etc.

### Test Case 3: Database Verification

Check that specifications table contains:
- `filename`: e.g., "prd.md"
- `content`: Full markdown content (should be >500 chars)
- `document_type`: One of the 13 enum values
- `user_session`: UUID grouping user's documents
- `skip_technical_summary`: boolean flag

## Debugging

**Check server logs**: Look for console.log messages showing:
```
📄 Saving specification: prd.md
📋 Type: prd
📏 Content length: 1247 characters
✅ Saved specification with ID: clx1234...
```

**Database issues**: 
```bash
# Reset database
rm prisma/dev.db
npm run db:migrate
```

**OpenAI API issues**: Check `.env.local` has valid API key

## Expected Document Flow

The GPT should create these 13 documents in order:
1. prd.md
2. frontend.md  
3. backend.md
4. state-management.md
5. database-schema.md
6. api.md
7. devops.md
8. testing-plan.md
9. code-documentation.md
10. performance-optimization.md
11. user-flow.md
12. third-party-libraries.md
13. readme.md

Each should be comprehensive markdown (>500 characters) with proper structure.