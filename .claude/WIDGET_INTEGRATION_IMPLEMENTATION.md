# Widget Integration Implementation

This document describes the complete backend implementation for the Software Project Architect widget integration plan.

## 🎯 Overview

The implementation provides all backend components needed to support:
- **Standalone widget deployment** with iframe integration
- **Intro chat flow** with 6 conversational questions for user engagement  
- **Seamless handoff** from intro to architect with context preservation
- **Auth token verification** for parent app integration
- **Session type management** (intro vs architect sessions)
- **Tool usage tracking** for business metrics

## 🏗️ Architecture Components

### 1. Database Schema Updates

**New Models Added:**
- `IntroBrief` - Stores the 6 intro questions and answers
- Enhanced `SavedSession` with `sessionType` field
- Enhanced `ToolUsage` with `intro_complete` tracking

**Schema Changes:**
```prisma
model IntroBrief {
  id                String @id @default(cuid())
  userSession       String @unique
  externalId        String
  whatTheyreDoing   String? // Question 0: What are you trying to create?
  projectType       String? // Question 1: What kind of software?
  audience          String? // Question 2: Who will use this?
  problem           String? // Question 3: What problem does it solve?
  timeline          String? // Question 4: How soon do you need it?
  teamSize          String? // Question 5: What's your team size?
  currentQuestion   Int @default(0)
  isComplete        Boolean @default(false)
  projectBrief      String? // AI-generated brief for architect
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model SavedSession {
  // ... existing fields
  sessionType  String @default("architect") // 'intro' or 'architect'
}
```

### 2. API Endpoints

#### `/api/auth/verify-token`
**Purpose:** Verifies JWT tokens from parent applications
**Methods:** GET (health check), POST (verification)

**Features:**
- Multiple verification strategies (parent app endpoint, shared JWT secret, dev bypass)
- Theme configuration return for widget styling
- Comprehensive error handling

**Request:**
```json
{
  "token": "jwt_or_base64_token",
  "parentAppUrl": "https://parent.app.com" // optional
}
```

**Response:**
```json
{
  "valid": true,
  "userId": "user123",
  "externalId": "external123", 
  "theme": { "primaryColor": "#3b82f6", ... },
  "userInfo": { "name": "User Name", "email": "user@example.com" }
}
```

#### `/api/intro-chat`
**Purpose:** Handles the 6-question intro conversation flow
**Methods:** GET (get progress), POST (answer question)

**Features:**
- Conversational AI responses with rapport building
- Progress tracking through questions
- Automatic project brief generation
- Tool usage tracking for completions

**Question Flow:**
1. "What are you trying to create?" 
2. "What kind of software are you building?"
3. "Who will use this software?"
4. "What's the main problem it solves?"
5. "How soon do you need it live?"
6. "What's your team size?"

#### `/api/intro-to-architect`
**Purpose:** Manages handoff from intro to architect phase
**Methods:** GET (check readiness), POST (perform handoff)

**Features:**
- Creates architect session with intro context
- Option to create new session or reuse existing
- Provides initial architect message with context

#### Enhanced `/api/chat`
**Purpose:** Main architect chat with intro context integration
**Enhancements:**
- Accepts `introBrief` parameter in requests
- Automatically loads intro brief from database
- Updates system prompts to avoid redundant questions
- Contextual architecture questions based on intro answers

#### Enhanced `/api/sessions`
**Purpose:** Session management with intro/architect types
**Enhancements:**
- `sessionType` field support ('intro' or 'architect')  
- Session type returned in responses
- Proper tracking for both session types

### 3. Integration Flow

#### Complete User Journey:
1. **Parent App Embed:**
   ```html
   <iframe src="https://architect.yourapp.com?token=JWT&externalId=user123&mode=intro" />
   ```

2. **Widget Auth Verification:**
   - Widget calls `/api/auth/verify-token` with provided token
   - Receives user info and theme configuration
   - Applies theme styling dynamically

3. **Intro Chat Phase:**
   - User answers 6 conversational questions via `/api/intro-chat`
   - AI generates engaging responses showing understanding
   - Project brief created automatically in background

4. **Handoff to Architect:**
   - Call `/api/intro-to-architect` to transition
   - Architect session created with full intro context
   - User continues with focused architecture questions

5. **Architecture Phase:**
   - Enhanced `/api/chat` uses intro brief to avoid redundancy
   - Focus on technical details not covered in intro
   - Generate 13 complete architecture documents

## 🔧 Configuration

### Environment Variables

```env
# AI Provider
AI_PROVIDER=claude|openai
CLAUDE_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# Auth Strategy
AUTH_VERIFICATION_STRATEGY=jwt_secret|parent_app_endpoint|bypass_dev
JWT_SECRET=your_jwt_secret
PARENT_APP_VERIFICATION_ENDPOINT=/api/auth/verify

# Database
DATABASE_URL=your_postgres_url
```

### Auth Strategies

1. **JWT Secret Sharing:**
   - Parent app and widget share JWT secret
   - Widget verifies tokens locally
   - Most secure for single parent app

2. **Parent App Endpoint:**
   - Widget calls parent app to verify tokens
   - More flexible for multiple parent apps
   - Requires CORS configuration

3. **Development Bypass:**
   - Base64 encoded user data as "token"
   - Only works in development environment
   - Useful for testing and demos

## 🧪 Testing

### Automated Tests
Run the test suite:
```bash
node test-backend-apis.js
```

Tests cover:
- Auth token verification (all strategies)
- Complete intro chat flow (6 questions)
- Intro-to-architect handoff
- Architect chat with context
- Session management with types
- Usage tracking

### Manual Testing
Open `widget-integration-example.html` in a browser to test:
- Widget embedding with different configurations
- Auth verification with different token types
- Theme application
- Message passing between parent and widget

### Quick API Test
```bash
node quick-test.js
```

## 📊 Metrics & Analytics

### Tool Usage Tracking
The system tracks:
- `intro_complete` - User completed intro chat
- `session_saved` - User saved a session
- `session_complete` - User completed full architecture

### Usage API
Get monthly usage stats:
```
GET /api/usage?externalId=user123
```

Returns counts of each usage type for billing/analytics.

## 🚀 Deployment

### Database Migration
```bash
npx prisma migrate deploy
```

### Environment Setup
1. Configure environment variables for chosen auth strategy
2. Set up AI provider credentials (Claude or OpenAI)
3. Configure database connection
4. Deploy to your preferred hosting platform

### Widget URL Structure
```
https://architect.yourapp.com?token=JWT&externalId=user123&mode=intro
```

## 🎨 Theming & Customization

### Theme Configuration
Themes are returned from auth verification and include:
```json
{
  "primaryColor": "#3b82f6",
  "secondaryColor": "#64748b", 
  "borderRadius": "8px",
  "fontFamily": "Inter, system-ui, sans-serif",
  "colors": {
    "background": "#ffffff",
    "foreground": "#0f172a",
    // ... more theme colors
  }
}
```

### CSS Variables
Widget applies theme via CSS custom properties for seamless parent app integration.

## 🔒 Security Considerations

1. **Token Verification:** Always verify tokens before processing requests
2. **Origin Validation:** Validate iframe embedding origins
3. **CORS Configuration:** Set appropriate CORS headers for parent app domains
4. **Rate Limiting:** Consider adding rate limits to API endpoints
5. **Input Validation:** All user inputs are sanitized and validated

## 📈 Business Benefits

### User Experience
- **Reduced perceived complexity** (5 intro vs 28 technical questions upfront)
- **Higher engagement** through conversational intro  
- **Improved conversion** from marketing site visitors
- **Seamless integration** feeling within parent app

### Technical Benefits
- **Independent scaling** of widget component
- **Clean auth integration** between apps
- **Consistent visual design** across suite
- **Maintainable codebase** with clear separation

### Business Metrics
- **Marketing funnel optimization** with intro → registration flow
- **Tool usage tracking** across parent app suite
- **User retention** through better onboarding experience

## 🎯 Next Steps

1. **Frontend Integration:** Implement React components for intro chat UI
2. **Widget Deployment:** Set up standalone widget hosting
3. **Parent App Integration:** Implement iframe embedding in parent applications  
4. **Analytics Dashboard:** Create usage analytics and reporting
5. **Advanced Theming:** Support for custom CSS injection and branding

---

The backend implementation is complete and ready for frontend integration and deployment. All APIs have been tested and are functioning correctly with the existing Software Project Architect codebase.