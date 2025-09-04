# Software Project Architect - Umbrella App Integration Guide

## Quick Setup for Your Umbrella Application

### Step 1: Install Dependencies

In your umbrella app directory:
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### Step 2: Create Auth Token Generation Endpoint

**Create:** `app/api/widget-auth/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const WIDGET_SECRET = process.env.WIDGET_SECRET || 'your-shared-secret-key';

export async function POST(request: NextRequest) {
  try {
    // Get current user from your auth system
    const user = await getCurrentUser(request); // Replace with your auth logic
    
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

    // Configure your app's theme for the widget
    const theme = {
      primaryColor: '#3b82f6', // Your brand primary
      secondaryColor: '#64748b', // Your brand secondary
      borderRadius: '8px',
      fontFamily: 'Inter, sans-serif'
    };

    return NextResponse.json({ 
      token,
      theme,
      widgetUrl: `http://localhost:5000/widget` // Update for production
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

**Create:** `components/ArchitectWidget.tsx`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

interface ArchitectWidgetProps {
  onClose?: () => void;
  skipIntro?: boolean;
  sessionType?: 'intro' | 'architect';
  className?: string;
}

export default function ArchitectWidget({ 
  onClose, 
  skipIntro = false,
  sessionType = 'intro',
  className = ''
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
        externalId: 'user-id-from-your-app', // Replace with actual user ID
        theme: JSON.stringify(theme),
        skipIntro: skipIntro.toString(),
        sessionType
      });

      setWidgetUrl(`${widgetUrl}?${params.toString()}`);
      setLoading(false);

    } catch (err: any) {
      console.error('Widget loading error:', err);
      setError(err.message || 'Failed to load architect widget');
      setLoading(false);
    }
  };

  // Handle messages from widget
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin - update for production
      if (event.origin !== 'http://localhost:5000') return;

      const { type, data } = event.data;

      switch(type) {
        case 'widget-loaded':
          console.log('Widget loaded successfully');
          break;
        case 'session-complete':
          console.log('Architecture session complete:', data);
          if (onClose) onClose();
          break;
        case 'registration-required':
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
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Software Architect...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-xl mb-2">Failed to load architect</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadWidget}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
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

### Step 4: Add Widget to Dashboard

**Example dashboard integration:**

```typescript
import { useState } from 'react';
import ArchitectWidget from '@/components/ArchitectWidget';

export default function DashboardPage() {
  const [showArchitect, setShowArchitect] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);

  return (
    <div className="dashboard-container p-6">
      {/* Your existing dashboard content */}
      
      <div className="mb-6">
        <button
          onClick={() => {
            setSkipIntro(false);
            setShowArchitect(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-4"
        >
          Start New Project (with Intro)
        </button>
        
        <button
          onClick={() => {
            setSkipIntro(true);
            setShowArchitect(true);
          }}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Quick Architect (skip intro)
        </button>
      </div>

      {/* Widget Modal */}
      {showArchitect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Software Project Architect</h2>
              <button
                onClick={() => setShowArchitect(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
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

### Step 5: Marketing Site Integration (Pre-login)

**Example landing page:**

```typescript
import { useState } from 'react';

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(false);

  return (
    <div>
      {/* Hero section */}
      <section className="hero-section">
        <h1>Build Your Software Architecture in Minutes</h1>
        <p>AI-powered architect creates detailed technical specs</p>
        <button
          onClick={() => setShowIntro(true)}
          className="cta-button px-8 py-4 bg-blue-600 text-white rounded-lg text-lg"
        >
          Get Started Free
        </button>
      </section>

      {/* Intro Widget for marketing */}
      {showIntro && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] relative">
            <button
              onClick={() => setShowIntro(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl z-10"
            >
              ✕
            </button>
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

**Add to your umbrella app's `.env`:**

```env
WIDGET_SECRET=your-shared-secret-key-here
WIDGET_URL=http://localhost:5000
```

**Ensure widget app has (already configured):**

```env
PARENT_APP_URL=http://localhost:3000
WIDGET_SECRET=your-shared-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Step 7: Required Widget App Configuration

The widget app (running on port 5000) should already have these configurations, but verify:

**File:** `next.config.js` 
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

### Step 8: Testing Your Integration

1. **Start the widget app:**
   ```bash
   cd software-project-architect
   npm run dev  # Runs on port 5000
   ```

2. **Start your umbrella app:**
   ```bash
   cd your-umbrella-app
   npm run dev  # Runs on port 3000 (or your configured port)
   ```

3. **Test the flows:**
   - **Dashboard Flow**: New Project → 6 intro questions → Smooth architect transition
   - **Quick Flow**: Skip intro → Direct to PRD questions
   - **Marketing Flow**: Landing page → Intro → Registration prompt

### Step 9: Customization for Your App

**Update the `getCurrentUser` function in Step 2** to match your authentication system:

```typescript
// Example for NextAuth.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function getCurrentUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

// Example for custom auth
async function getCurrentUser(request: NextRequest) {
  const token = request.headers.get('authorization');
  // Your user verification logic
  return verifyUserToken(token);
}
```

**Update theme colors** in Step 2 to match your brand:

```typescript
const theme = {
  primaryColor: '#your-primary-color',
  secondaryColor: '#your-secondary-color',
  borderRadius: '8px', // or your border radius
  fontFamily: 'Your Font Family, sans-serif'
};
```

### Step 10: Production Deployment

1. **Update URLs**: Change `localhost:5000` to your production widget URL
2. **HTTPS**: Ensure both apps use HTTPS
3. **CORS**: Set proper origins (not wildcards)
4. **Monitoring**: Add error tracking and analytics

## Verification Checklist

- [ ] Widget loads in iframe
- [ ] Auth tokens generate correctly
- [ ] Theme applies from your app
- [ ] Intro chat works (6 questions with natural responses)
- [ ] Architect transition is smooth with natural context blending
- [ ] Skip intro option functions
- [ ] Session management works
- [ ] Error states handled gracefully

## Key Features Available

- **6-Question Intro**: Engaging conversation before technical questions
- **Natural Transition**: Architect smoothly acknowledges intro context
- **Theme Inheritance**: Widget matches your app's design
- **Session Management**: Save/load architecture sessions
- **Tool Usage Tracking**: Monitor usage for billing
- **Flexible Integration**: Dashboard and marketing site ready

## Widget App Status

✅ **Widget is running on port 5000 with:**
- Fixed OpenAI API compatibility
- Natural intro conversation flow  
- Smooth architect transition (no more bullet lists)
- Complete backend API implementation
- Database schema with widget support

The widget is ready for immediate integration into your umbrella application.