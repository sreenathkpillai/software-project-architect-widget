# Software Project Architect - Widget Integration Implementation

This document outlines the complete widget integration implementation based on the requirements in `.claude/widget-integration-plan.md`.

## 🎯 Implementation Overview

The implementation includes all requested features:
- ✅ Intro chat component with 6 conversational questions (0-5) 
- ✅ Auth token handling for iframe integration
- ✅ Project brief capture and handoff to architect chat
- ✅ Theme inheritance system via CSS variables
- ✅ Updated chat component with intro context handling
- ✅ Session type differentiation (intro vs architect)
- ✅ Smooth user flow transitions
- ✅ Psychological rapport-building loading messages
- ✅ Complete UI differentiation between modes

## 🚀 Quick Start

### 1. Widget Integration URLs

```html
<!-- Intro flow (default) -->
<iframe src="https://architect.yourapp.com/widget" />

<!-- Direct to architect -->
<iframe src="https://architect.yourapp.com/widget?sessionType=architect&skipIntro=true" />

<!-- With authentication and theme -->
<iframe src="https://architect.yourapp.com/widget?token=jwt_token&externalId=user_123&theme=%7B%22primaryColor%22%3A%22%23your-brand%22%7D" />
```

### 2. Authentication Integration

```typescript
// Parent app verification endpoint
POST /auth/verify-token
Headers: { Authorization: "Bearer jwt_token" }
Body: { externalId: "user_123" }

// Response
{
  valid: true,
  userId: "123",
  externalId: "user_123",
  theme: {
    primaryColor: "#your-brand",
    secondaryColor: "#accent",
    borderRadius: "8px",
    fontFamily: "Inter, sans-serif"
  }
}
```

### 3. Theme Configuration

```css
/* CSS Variables applied automatically */
:root {
  --widget-primary-color: #3B82F6;
  --widget-secondary-color: #10B981;
  --widget-border-radius: 8px;
  --widget-font-family: 'Inter', sans-serif;
  --widget-spacing-unit: 1rem;
  --widget-background-color: #F9FAFB;
  --widget-text-color: #1F2937;
}
```

## 📁 File Structure

```
components/
├── IntroChat.tsx          # 6-question intro flow with rapport building
├── chat.tsx               # Updated architect chat with intro context
├── WidgetApp.tsx          # Main widget orchestrator
└── README.md              # This file

hooks/
└── useSession.ts          # Session management and transitions

lib/
└── auth.ts                # Authentication and theme handling

app/
├── widget/page.tsx        # Widget entry point
├── example-integration/   # Integration demo page
└── api/
    ├── intro-brief/       # API for saving intro responses
    └── chat/             # Updated with intro context support
```

## 🔄 User Flow Implementation

### Marketing Funnel Flow
```
Landing Page → Intro Chat (6 questions) → Registration Gate → Architect Widget
```

### Authenticated Dashboard Flow
```
Dashboard → Choice (Skip Intro OR Start with Intro) → Architect Widget
```

### Direct Widget Access
```
Widget URL with skipIntro=true → Architect Widget (no intro context)
```

## 💬 Intro Chat Features

### 6 Conversational Questions
0. **"What are you trying to create?"** - High-level project description
1. **"What kind of software are you building?"** - Platform type (web, mobile, etc.)
2. **"Who will use this software?"** - Target audience identification
3. **"What's the main problem it solves?"** - Business value proposition
4. **"How soon do you need it live?"** - Timeline and urgency
5. **"What's your team size?"** - Resource and complexity planning

### Psychological Engagement Techniques
- **Rapport-building loading messages**: "I love your vision! Let me think about this..."
- **Response acknowledgment**: Repeats back user answers to show understanding
- **Excitement building**: "This sounds like exactly what people need!"
- **Progress visualization**: Visual progress bar with question count
- **Smooth transitions**: Natural conversation flow with follow-up responses

### Project Brief Generation
- Synthesizes all 6 answers into structured brief
- Saves to database with session tracking
- Provides seamless handoff to architect phase
- Includes timeline and team context for technical decisions

## 🏗️ Architecture Features

### Updated Chat Component
- **Intro context integration**: Receives project brief and avoids redundant questions
- **Smart question filtering**: Skips questions already answered in intro
- **Context-aware responses**: References intro answers in architect conversation
- **Dual session support**: Handles both intro and architect session types

### Session Management
- **Session differentiation**: Separate session IDs for intro vs architect
- **Smooth transitions**: Preserves context when moving between phases
- **State persistence**: Saves intro progress and architect session data
- **Recovery handling**: Resumes sessions from interruptions

### Theme System
- **CSS variable inheritance**: Applies parent app theme automatically
- **Dynamic theme updates**: Responds to postMessage theme changes
- **Fallback defaults**: Provides sensible defaults when no theme provided
- **Multiple application methods**: URL parameters, postMessage, or auth response

## 🔐 Authentication Implementation

### Widget Authentication Class
```typescript
import { initializeWidgetAuth } from '@/lib/auth';

const authResponse = await initializeWidgetAuth();
// Handles token verification, theme application, parent communication
```

### Features
- **Token verification**: Validates JWT with parent app endpoint
- **External ID tracking**: Maps widget sessions to parent app users
- **Parent communication**: postMessage integration for real-time updates
- **Fallback modes**: Works standalone for development/testing

## 📊 Database Schema

### IntroBrief Model
```prisma
model IntroBrief {
  id                String   @id @default(cuid())
  userSession       String   @unique
  externalId        String
  whatTheyreDoing   String?  // Question 0
  projectType       String?  // Question 1  
  audience          String?  // Question 2
  problem           String?  // Question 3
  timeline          String?  // Question 4
  teamSize          String?  // Question 5
  currentQuestion   Int      @default(0)
  isComplete        Boolean  @default(false)
  projectBrief      String?  // Generated summary
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## 🎨 UI Differentiation

### Intro Mode
- **Conversational header**: "Let's Build Something Amazing"
- **Progress indicator**: Question count and visual progress bar
- **Rapport-focused design**: Warm colors, encouraging language
- **Single question focus**: One question at a time with clear CTAs

### Architect Mode  
- **Technical header**: "Technical Architecture" with project name
- **Navigation controls**: Back to intro, new project buttons
- **Progress tracker**: 13-step document completion tracker
- **Context display**: Shows intro brief summary at top

## 🔄 PostMessage Communication

### Events Sent to Parent
```typescript
// Widget ready
{ type: 'WIDGET_READY', externalId: 'user_123' }

// Session transitions
{ type: 'SESSION_TRANSITION', from: 'intro', to: 'architect', brief: {...} }

// New project started
{ type: 'NEW_PROJECT_STARTED' }
```

### Events Received from Parent
```typescript
// Theme updates
{ type: 'THEME_UPDATE', theme: {...} }

// Auth updates  
{ type: 'AUTH_UPDATE', token: 'new_token', externalId: 'user_123' }
```

## 🧪 Testing & Development

### Example Integration Page
Visit `/example-integration` to see a complete parent app integration example with:
- Dynamic widget configuration
- Theme customization
- Session type selection
- Live iframe embedding
- Integration code examples

### Development Mode
- Widget works standalone without authentication
- Fallback external IDs for testing
- Console logging for debugging auth flow
- Example theme configurations

## 📈 Success Metrics Tracking

### User Experience Metrics
- **Reduced perceived complexity**: 6 intro questions vs 28 technical upfront
- **Higher engagement**: Conversational flow with psychological techniques
- **Smooth integration**: Seamless theme inheritance and auth flow
- **Clear differentiation**: Distinct UI modes for different phases

### Technical Metrics
- **Independent scaling**: Widget deployed separately from parent app
- **Clean auth integration**: JWT verification with fallback modes
- **Consistent styling**: Automatic theme inheritance
- **Session continuity**: Reliable state management across transitions

## 🚦 Production Deployment

### Environment Variables
```env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
CLAUDE_KEY="sk-ant-..."
AI_PROVIDER="openai" # or "claude"
```

### Widget Hosting
- Deploy to `architect.yourapp.com` subdomain
- Configure CORS for parent app domains
- Set up authentication endpoint URLs
- Enable postMessage communication

### Parent App Integration
1. Add iframe with widget URL and parameters
2. Set up JWT token verification endpoint  
3. Configure theme variables in CSS
4. Listen for postMessage events from widget
5. Handle session transitions and user flow

## 🔧 Customization Options

### Skip Intro Flow
```html
<iframe src="https://architect.yourapp.com/widget?skipIntro=true" />
```

### Custom Session Types
```html
<iframe src="https://architect.yourapp.com/widget?sessionType=architect" />
```

### Theme Inheritance
```javascript
// Via URL parameter
const themeParam = encodeURIComponent(JSON.stringify({
  primaryColor: '#your-brand',
  fontFamily: 'Your Font'
}));
const url = `https://architect.yourapp.com/widget?theme=${themeParam}`;

// Via postMessage
iframe.contentWindow.postMessage({
  type: 'THEME_UPDATE',
  theme: { primaryColor: '#new-color' }
}, '*');
```

This implementation provides a complete, production-ready widget integration system that meets all the requirements outlined in the original plan while maintaining excellent user experience and technical robustness.