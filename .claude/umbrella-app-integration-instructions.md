# Complete Instructions for Embedding Software Project Architect Widget in Umbrella Application

## Prerequisites
- Software Project Architect widget running on port 5000
- Umbrella application ready for widget integration
- Both applications on same server/domain (or CORS configured)

## Part 1: Architect Flow Fix (Do This First)

### Fix the Architect Chat to Maintain Original Flow

**File to modify:** `/app/api/chat/route.ts`

**Find this section (around line 900-920):**
```typescript
// Check if intro brief exists
const introBrief = userSession ? await prisma.introBrief.findUnique({
  where: { userSession }
}) : null;

if (introBrief && messages.length === 1) {
  // First message after intro, provide context-aware response
  return NextResponse.json({ 
    text: "Now let's dive deep into the technical architecture. I'll focus on the technical decisions and avoid repeating what we already covered. What specific technical aspect would you like to start with, or should I begin with the overall system architecture?",
    provider: AI_PROVIDER,
    usage: null
  });
}
```

**Replace with:**
```typescript
// Check if intro brief exists
const introBrief = userSession ? await prisma.introBrief.findUnique({
  where: { userSession }
}) : null;

// Don't add special intro message - let the system prompt handle everything
// The introBrief will be used in the system prompt to guide the conversation
```

**Then update the system prompt section to include intro context (around line 940-950):**

**Find:**
```typescript
const contextualPrompt = existingDocs.length > 0 
  ? `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}\n\n## SESSION CONTEXT...`
  : `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}`;
```

**Add intro context injection with friendly opener:**
```typescript
const introBriefContext = introBrief ? `
## PROJECT CONTEXT FROM INTRO:
- What they're creating: ${introBrief.whatTheyreDoing}
- Project type: ${introBrief.projectType}
- Target audience: ${introBrief.audience}
- Problem solving: ${introBrief.problem}
- Timeline: ${introBrief.timeline}
- Team size: ${introBrief.teamSize}

When starting the conversation, briefly acknowledge this context with a friendly opener like:
"Great! I understand you're building [brief summary]. Let me ask you a few more details to create the perfect architecture."
Then immediately ask the first PRD question.

Use this context to avoid redundant questions and make smart defaults for related decisions.
` : '';

const contextualPrompt = existingDocs.length > 0 
  ? `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefContext}\n\n## SESSION CONTEXT...`
  : `${SYSTEM_PROMPT}${techModePrompt}${fastModePrompt}${timelinePrompt}${introBriefContext}`;
```

This ensures the architect:
1. Starts with a friendly acknowledgment of the intro context
2. Shows the user what context was received (builds trust)
3. Immediately continues with first PRD question (no interruption)
4. Uses intro context to avoid redundant questions
5. Maintains the original flow with smart defaults

## Part 2: Umbrella Application Integration

### Step 1: Install Required Dependencies (Umbrella App)

```bash
# In your umbrella app directory
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### Step 2: Create Auth Token Generation Endpoint

**Create file:** `app/api/widget-auth/route.ts` (or appropriate path in your umbrella app)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const WIDGET_SECRET = process.env.WIDGET_SECRET || 'shared-secret-between-apps';

export async function POST(request: NextRequest) {
  try {
    // Get current user from your auth system
    const user = await getCurrentUser(request); // Your auth logic
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create JWT token for widget
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        externalId: user.id, // or however you identify users
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
      },
      WIDGET_SECRET
    );

    // Get your app's theme configuration
    const theme = {
      primaryColor: '#your-brand-color',
      secondaryColor: '#your-secondary',
      borderRadius: '8px',
      fontFamily: 'Inter, sans-serif'
    };

    return NextResponse.json({ 
      token,
      theme,
      widgetUrl: `http://localhost:5000/widget` // Change in production
    });

  } catch (error) {
    console.error('Widget auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate widget token' }, 
      { status: 500 }
    );
  }
}
```

### Step 3: Create Widget Container Component

**Create file:** `components/ArchitectWidget.tsx` (in your umbrella app)

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

interface ArchitectWidgetProps {
  onClose?: () => void;
  skipIntro?: boolean;
  sessionType?: 'intro' | 'architect';
}

export default function ArchitectWidget({ 
  onClose, 
  skipIntro = false,
  sessionType = 'intro' 
}: ArchitectWidgetProps) {
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadWidget();
  }, [skipIntro, sessionType]);

  const loadWidget = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from your backend
      const response = await fetch('/api/widget-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate widget');
      }

      const { token, theme, widgetUrl } = await response.json();

      // Build widget URL with parameters
      const params = new URLSearchParams({
        token,
        externalId: 'user-id-from-your-app', // Get from your auth
        theme: JSON.stringify(theme),
        skipIntro: skipIntro.toString(),
        sessionType
      });

      setWidgetUrl(`${widgetUrl}?${params.toString()}`);
      setLoading(false);

    } catch (err) {
      console.error('Widget loading error:', err);
      setError(err.message || 'Failed to load architect widget');
      setLoading(false);
    }
  };

  // Handle messages from widget
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin in production
      if (event.origin !== 'http://localhost:5000') return;

      const { type, data } = event.data;

      switch(type) {
        case 'widget-loaded':
          console.log('Widget loaded successfully');
          break;
        case 'session-complete':
          console.log('Architecture session complete:', data);
          // Handle completion (e.g., show success message, close widget)
          if (onClose) onClose();
          break;
        case 'registration-required':
          // Handle registration flow if intro was from marketing site
          console.log('User needs to register to continue');
          break;
        case 'error':
          console.error('Widget error:', data);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Software Architect...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-600">
          <p className="text-xl mb-2">Failed to load architect</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadWidget}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {widgetUrl && (
        <iframe
          ref={iframeRef}
          src={widgetUrl}
          className="w-full h-full border-0"
          title="Software Project Architect"
          allow="clipboard-write"
        />
      )}
    </div>
  );
}
```

### Step 4: Add Widget to Dashboard Page

**In your dashboard page component:**

```typescript
import ArchitectWidget from '@/components/ArchitectWidget';

export default function DashboardPage() {
  const [showArchitect, setShowArchitect] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);

  return (
    <div className="dashboard-container">
      {/* Your existing dashboard content */}
      
      <div className="mb-6">
        <button
          onClick={() => {
            setSkipIntro(false);
            setShowArchitect(true);
          }}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 mr-4"
        >
          Start New Project (with Intro)
        </button>
        
        <button
          onClick={() => {
            setSkipIntro(true);
            setShowArchitect(true);
          }}
          className="px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90"
        >
          Quick Architect (skip intro)
        </button>
      </div>

      {/* Widget Modal/Container */}
      {showArchitect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Software Project Architect</h2>
              <button
                onClick={() => setShowArchitect(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ArchitectWidget 
                onClose={() => setShowArchitect(false)}
                skipIntro={skipIntro}
                sessionType={skipIntro ? 'architect' : 'intro'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Add to Marketing Site (Pre-login Flow)

**In your marketing landing page:**

```typescript
export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(false);

  return (
    <div>
      {/* Hero section */}
      <section className="hero">
        <h1>Build Your Software Architecture in Minutes</h1>
        <button
          onClick={() => setShowIntro(true)}
          className="cta-button"
        >
          Get Started Free
        </button>
      </section>

      {/* Intro Widget (unauthenticated) */}
      {showIntro && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh]">
            <iframe
              src="http://localhost:5000/widget?sessionType=intro&isMarketing=true"
              className="w-full h-full border-0 rounded-xl"
              title="Get Started with Project Architect"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 6: Environment Configuration

**Add to `.env` in umbrella app:**

```env
WIDGET_SECRET=your-shared-secret-key-here
WIDGET_URL=http://localhost:5000
```

**Add to `.env` in widget app:**

```env
PARENT_APP_URL=http://localhost:3000
WIDGET_SECRET=your-shared-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Step 7: CORS Configuration (Widget App)

**Update `next.config.js` in widget app:**

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.PARENT_APP_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/widget',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' http://localhost:3000 http://localhost:3001;" },
        ],
      },
    ];
  },
};
```

### Step 8: Testing the Integration

1. **Start widget app on port 5000:**
   ```bash
   cd software-project-architect
   npm run dev  # Should run on port 5000
   ```

2. **Start umbrella app:**
   ```bash
   cd umbrella-app
   npm run dev  # Default port 3000 or your configured port
   ```

3. **Test flows:**
   - Dashboard → New Project (with intro) → Should show 6 intro questions → Architect
   - Dashboard → Quick Architect → Should skip intro, go straight to PRD questions
   - Marketing site → Get Started → Intro questions → Registration prompt

### Step 9: Production Deployment Considerations

1. **Update URLs:** Change all `localhost:5000` references to production widget URL
2. **Security:** 
   - Use HTTPS for both apps
   - Validate JWT tokens properly
   - Set proper CORS origins (not wildcard)
   - Use secure iframe CSP headers
3. **Performance:**
   - Consider CDN for widget assets
   - Implement caching for auth tokens
   - Add loading states and error handling
4. **Analytics:**
   - Track widget loads and completions
   - Monitor error rates
   - Track conversion funnel (intro → registration → architect)

## Troubleshooting Guide

### Common Issues and Solutions

1. **Widget not loading:**
   - Check CORS headers
   - Verify auth token generation
   - Check browser console for errors
   - Ensure port 5000 is accessible

2. **Theme not applying:**
   - Verify theme object is properly stringified in URL
   - Check CSS variable names match
   - Ensure widget receives and parses theme

3. **Auth failures:**
   - Verify WIDGET_SECRET matches in both apps
   - Check JWT token expiry
   - Ensure user is authenticated in parent app

4. **Message passing not working:**
   - Verify origin checks in postMessage handlers
   - Check event listener setup
   - Ensure proper message format

## Verification Checklist

- [ ] Widget loads in iframe successfully
- [ ] Auth token is generated and verified
- [ ] Theme inherits from parent app
- [ ] Intro flow works (6 questions)
- [ ] Architect receives intro context
- [ ] Skip intro option works
- [ ] Session saves and loads correctly
- [ ] Tool usage tracking works
- [ ] Marketing flow shows registration gate
- [ ] Dashboard flow works for authenticated users
- [ ] Error states are handled gracefully
- [ ] Loading states show appropriately

## Notes

- The widget maintains its own database but uses externalId from parent app
- Sessions are tracked independently but linked via externalId
- Tool usage is aggregated monthly for billing
- Widget can run standalone for development/testing
- All communication happens via JWT tokens and postMessage

This completes the integration. The widget will run on port 5000 and be embedded in your umbrella application with full authentication, theming, and session management.