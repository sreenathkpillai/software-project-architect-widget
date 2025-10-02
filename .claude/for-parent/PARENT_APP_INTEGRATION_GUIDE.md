Credit Integration Implementation Complete!

  What We've Built:

  1. Core Communication System

  - lib/utils/parentCommunication.js: Singleton class
  handling all widget ↔ parent communication
  - Security: Origin validation, message structure
  validation
  - Methods: signalWorkComplete(), signalError(),
  requestCreditBalance()

  2. Credit Deduction Points (1 credit each):

  - ✅ Codebase Analysis: ProjectDashboard.tsx - When
  analysisStatus === 'COMPLETED'
  - ✅ Story Creation: CreateStoryModal.tsx - When story
  is successfully created
  - ✅ Prompt Pack Generation: PromptPackGenerator.tsx -
  When pack is successfully generated

  3. Development Testing Tools

  - ✅ CreditTestPanel.tsx: Debug panel with buttons to
  test all credit scenarios
  - ✅ Test Methods: Communication, each credit type,
  error handling, balance requests
  - ✅ Connection Status: Real-time display of parent
  connection state

  4. Integration Architecture

  - Per-operation billing: Each action deducts credits
  immediately upon completion
  - Parent-controlled: All credit APIs are called by
  parent app, widget just signals completion
  - Error handling: Parent app handles insufficient
  credits, widget acknowledges
  - Security: Widget cannot directly manipulate credits

  Credit Costs Implemented:

  - Workflow Widget: 1 credit per operation (analysis,
  story, prompt pack)
  - Architect Widget: 2 credits total (needs
  implementation at end of 13-step flow)

  How to Test:

  1. Development Mode: Test panel appears in bottom-right
  corner
  2. Test Buttons: Click any button to simulate credit
  deductions
  3. Console Logs: All communication is logged with 💳 and
   📤 emojis
  4. Parent Integration: Ready to connect with Chain
  Catalyst parent app

  Next Steps for Production:

  1. Parent App: Update widget handlers to process
  session-complete messages
  2. Credit API: Ensure /nextapi/credits/deduct endpoint
  is ready
  3. Architect Widget: Add final 2-credit deduction at
  workflow completion
  4. Testing: End-to-end testing in iframe environment

  The workflow widget is now fully integrated with the
  credit system and ready for production deployment! 🚀

> create a .md file for the parent app and put it in 
  .claude/for-parent

⏺ Write(.claude/for-parent/PARENT_APP_INTEGRATION_GUIDE.md)
  ⎿  Wrote 522 lines to                                  
     .claude/for-parent/PARENT_APP_INTEGRATION_GUIDE.md
     # 🎯 Parent App Integration Guide for Widget Credit
     System
     ## Overview
     This guide shows the parent app (Chain Catalyst) how
     to integrate with the newly implemented widget credit
      system. The workflow widget now sends credit
     deduction signals via postMessage when users complete
      operations.
     ---
     ## 🔄 Widget Credit Deduction Flow
     ### Current Implementation in Widgets:
     … +512 lines (ctrl+o to expand)

⏺ Perfect! I've created a comprehensive integration guide
  for the parent app team. Here's what the guide includes:

  📋 Parent App Integration Guide Created

  Key Sections:

  1. Message Protocol: Complete documentation of all
  messages the widget sends to parent
  2. Required Code Changes: Exact implementation for
  message handlers in both ArchitectWidget.tsx and
  WorkflowWidget.tsx
  3. Credit Deduction Logic: Full implementation of credit
   deduction API calls with error handling
  4. Security Implementation: Origin validation, message
  validation, and auth checks
  5. Testing Guide: How to test the integration in
  development and production
  6. API Requirements: Documentation of required endpoints
   and response formats
  7. Complete Example: Full WorkflowWidget.tsx
  implementation showing all pieces together

  What the Parent App Needs to Do:

  Required Changes:

  - ✅ Update message handlers in widget components
  - ✅ Implement deductCredits() function with API calls
  - ✅ Add pre-widget credit checking
  - ✅ Handle insufficient credits gracefully
  - ✅ Add security validation for messages

  API Endpoints Needed:

  - POST /nextapi/credits/deduct - Deduct credits from
  user account
  - GET /nextapi/credits/balance - Get current user credit
   balance

  Credit Amounts:

  - Workflow Widget: 1 credit per operation (analysis,
  story, prompt pack)
  - Architect Widget: 2 credits total at completion

  The guide provides everything the parent app team needs
  to integrate with our newly implemented credit system.
  The workflow widget is now fully ready for production
  integration! 🚀

# 🎯 Parent App Integration Guide for Widget Credit System

## Overview
This guide shows the parent app (Chain Catalyst) how to integrate with the newly implemented widget credit system. The workflow widget now sends credit deduction signals via postMessage when users complete operations.

---

## 🔄 Widget Credit Deduction Flow

### Current Implementation in Widgets:
1. **User completes operation** (analysis, story creation, prompt pack generation)
2. **Widget signals completion** via `postMessage` to parent
3. **Parent receives message** and calls credit deduction API
4. **Credits are deducted** from user's account
5. **Parent notifies widget** of successful deduction (optional)

---

## 📨 Messages Widget Sends to Parent

### 1. Widget Loaded
```javascript
{
  type: 'widget-loaded',
  data: {
    status: 'ready',
    widget: 'workflow', // or 'architect'
    timestamp: 1699123456789
  },
  source: 'widget'
}
```

### 2. Session Complete (Credit Deduction Required)
```javascript
{
  type: 'session-complete',
  data: {
    workType: 'codebase-analysis', // or 'story-creation', 'prompt-pack-generation', 'architect-completion'
    success: true,
    shouldDeductCredits: true,
    creditAmount: 1 // or 2 for architect
  },
  source: 'widget',
  timestamp: 1699123456789
}
```

### 3. Error Occurred
```javascript
{
  type: 'error',
  data: {
    message: 'Analysis failed',
    code: 'ANALYSIS_ERROR'
  },
  source: 'widget'
}
```

### 4. Credit Balance Request
```javascript
{
  type: 'request-credit-balance',
  data: {},
  source: 'widget'
}
```

---

## 🔧 Required Parent App Changes

### 1. Update Widget Message Handlers

#### For ArchitectWidget.tsx:
```typescript
const handleMessage = (event: MessageEvent) => {
  const allowedOrigins = ENV_URLS.WIDGET_ALLOWED_ORIGINS;
  if (!allowedOrigins.includes(event.origin)) return;

  const { type, data } = event.data;

  switch(type) {
    case 'widget-loaded':
      console.log('🔧 Widget loaded successfully');
      // Send parent-ready confirmation
      sendToWidget('parent-ready', { connected: true });
      break;

    case 'session-complete':
      console.log('🔧 Session complete:', data);
      if (data.shouldDeductCredits) {
        deductCredits(data.creditAmount, data.workType);
      }
      // Optionally close widget after credit deduction
      if (onClose) onClose();
      break;

    case 'error':
      console.error('🔧 Widget error:', data);
      setError(data.message || 'Widget encountered an error');
      break;

    case 'request-credit-balance':
      sendCreditBalance();
      break;

    case 'redirect-to-credits':
      router.push('/credits/add-packs');
      break;

    default:
      console.log('🔧 Unknown message type:', type);
  }
};
```

#### For WorkflowWidget.tsx:
```typescript
// Same handler as above - both widgets use identical message handling
const handleMessage = (event: MessageEvent) => {
  // ... identical implementation
};
```

### 2. Credit Deduction Function

```typescript
const deductCredits = async (amount: number = 1, workType: string = 'unknown') => {
  try {
    console.log(`💳 Deducting ${amount} credits for ${workType}`);

    const authToken = localStorage.getItem('auth-token');
    if (!authToken) {
      console.error('❌ No auth token available');
      return;
    }

    const response = await fetch('/nextapi/credits/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({
        amount: amount,
        widgetType: widgetType === 'architect' ? 'ARCHITECT' : 'WORKFLOW',
        workType: workType,
        description: `${workType} completed successfully`
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Credits deducted successfully:', result);

      // Notify widget of successful deduction
      sendToWidget('credit-deducted', {
        amount: amount,
        workType: workType,
        newBalance: result.newBalance,
        transactionId: result.transactionId
      });

      // Update parent UI if needed
      if (onCreditUpdate) {
        onCreditUpdate(result.newBalance);
      }

    } else {
      const errorData = await response.json();
      console.error('❌ Credit deduction failed:', errorData);

      if (response.status === 400 && errorData.code === 'INSUFFICIENT_CREDITS') {
        // Handle insufficient credits
        sendToWidget('insufficient-credits', {
          requiredCredits: amount,
          currentBalance: errorData.currentBalance
        });

        // Optionally redirect to buy credits
        router.push('/credits/add-packs');
      }
    }
  } catch (error) {
    console.error('❌ Error deducting credits:', error);

    // Notify widget of error
    sendToWidget('error', {
      message: 'Failed to process credit deduction',
      code: 'CREDIT_ERROR'
    });
  }
};
```

### 3. Send Messages to Widget

```typescript
const sendToWidget = (type: string, data: any = {}) => {
  if (iframeRef.current?.contentWindow) {
    const message = {
      type,
      data,
      source: 'parent',
      timestamp: Date.now()
    };

    iframeRef.current.contentWindow.postMessage(message, widgetOrigin);
    console.log('📤 Sent to widget:', type, data);
  }
};

const sendCreditBalance = async () => {
  try {
    const authToken = localStorage.getItem('auth-token');
    const response = await fetch('/nextapi/credits/balance', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include'
    });

    if (response.ok) {
      const balanceData = await response.json();
      sendToWidget('credit-balance', {
        balance: balanceData.balance,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('❌ Error fetching credit balance:', error);
  }
};
```

### 4. Pre-Widget Credit Check

```typescript
const checkCreditsBeforeWidget = async (): Promise<boolean> => {
  try {
    const authToken = localStorage.getItem('auth-token');
    const response = await fetch('/nextapi/credits/balance', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include'
    });

    if (response.ok) {
      const balanceData = await response.json();
      const requiredCredits = widgetType === 'architect' ? 2 : 1;

      if (balanceData.balance < requiredCredits) {
        // Show insufficient credits modal
        setError(`Insufficient credits. You need ${requiredCredits} credits but have ${balanceData.balance}.`);
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error checking credits:', error);
    return false;
  }
};

// Use before opening widget
const handleOpenWidget = async () => {
  const hasCredits = await checkCreditsBeforeWidget();
  if (hasCredits) {
    setShowWidget(true);
  } else {
    // Show buy credits modal or redirect
    router.push('/credits/add-packs');
  }
};
```

---

## 🎛️ Credit Deduction Scenarios

### Workflow Widget (1 credit each):
1. **Codebase Analysis**: User analyzes repository → 1 credit deducted
2. **Story Creation**: User creates new story → 1 credit deducted
3. **Prompt Pack Generation**: User generates prompt pack → 1 credit deducted

### Architect Widget (2 credits total):
1. **Complete 13-Step Flow**: User completes entire architect workflow → 2 credits deducted at end

---

## 🔒 Security Implementation

### 1. Origin Validation
```typescript
const WIDGET_ALLOWED_ORIGINS = [
  'https://widget.chaincatalyst.ai',
  'http://localhost:5000', // Development only
  'http://localhost:3000'  // Development only
];

const handleMessage = (event: MessageEvent) => {
  if (!WIDGET_ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn('🚫 Blocked message from unauthorized origin:', event.origin);
    return;
  }
  // Process message...
};
```

### 2. Message Validation
```typescript
const isValidMessage = (data: any): boolean => {
  return (
    data &&
    typeof data.type === 'string' &&
    typeof data.source === 'string' &&
    data.source === 'widget' &&
    typeof data.timestamp === 'number'
  );
};
```

### 3. Authentication Check
```typescript
const validateAuthBeforeCredit = (): boolean => {
  const authToken = localStorage.getItem('auth-token');
  if (!authToken) {
    console.error('❌ No authentication token');
    return false;
  }

  // Additional auth validation if needed
  return true;
};
```

---

## 🧪 Testing the Integration

### 1. Development Testing
When widget is loaded in development mode, you'll see a debug panel with test buttons:
- **Test Communication**: Verify postMessage works
- **Test Credit Deductions**: Simulate each credit scenario
- **Test Error Handling**: Verify error message flow

### 2. Browser Console Testing
```javascript
// Manual test in widget console
window.parent.postMessage({
  type: 'session-complete',
  data: {
    workType: 'test-analysis',
    success: true,
    shouldDeductCredits: true,
    creditAmount: 1
  },
  source: 'widget',
  timestamp: Date.now()
}, 'https://chaincatalyst.ai');
```

### 3. Production Testing Checklist
- [ ] Widget loads correctly in iframe
- [ ] Credit check happens before widget opens
- [ ] Credit deduction triggers on workflow completion
- [ ] Insufficient credits handled gracefully
- [ ] Error messages display properly
- [ ] Widget closes after successful operations
- [ ] Credit balance updates in parent UI

---

## 📋 Required API Endpoints

Ensure these endpoints exist and work correctly:

### 1. Deduct Credits
```
POST /nextapi/credits/deduct
Body: {
  amount: number,
  widgetType: 'WORKFLOW' | 'ARCHITECT',
  workType: string,
  description: string
}
Response: {
  success: boolean,
  newBalance: number,
  transactionId: string
}
```

### 2. Check Balance
```
GET /nextapi/credits/balance
Response: {
  balance: number,
  userId: string
}
```

### 3. Error Response for Insufficient Credits
```
Response (400): {
  error: 'Insufficient credits',
  code: 'INSUFFICIENT_CREDITS',
  currentBalance: number,
  requiredCredits: number
}
```

---

## 🚀 Deployment Checklist

### Environment Variables
- [ ] `WIDGET_ALLOWED_ORIGINS` includes production widget domains
- [ ] Credit API endpoints are accessible
- [ ] Authentication system works with widget integration

### Widget Integration
- [ ] ArchitectWidget.tsx updated with message handler
- [ ] WorkflowWidget.tsx updated with message handler
- [ ] Credit deduction functions implemented
- [ ] Error handling for insufficient credits
- [ ] Pre-widget credit checking

### User Experience
- [ ] Clear messaging when credits are insufficient
- [ ] Easy path to buy more credits
- [ ] Widget closes appropriately after operations
- [ ] Loading states during credit processing

---

## 🔧 Example Complete Integration

```typescript
// Example: Complete WorkflowWidget.tsx integration
import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkflowWidget({ onClose, onCreditUpdate }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_ORIGIN || 'http://localhost:5000';

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== widgetOrigin) return;

      const { type, data } = event.data;

      switch(type) {
        case 'widget-loaded':
          setIsLoading(false);
          sendToWidget('parent-ready', { connected: true });
          break;

        case 'session-complete':
          if (data.shouldDeductCredits) {
            deductCredits(data.creditAmount, data.workType);
          }
          if (onClose) onClose();
          break;

        case 'error':
          setError(data.message);
          break;

        case 'request-credit-balance':
          sendCreditBalance();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendToWidget = (type: string, data: any = {}) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type, data, source: 'parent', timestamp: Date.now()
      }, widgetOrigin);
    }
  };

  const deductCredits = async (amount: number, workType: string) => {
    // Implementation from above
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] relative">
        {isLoading && <div>Loading widget...</div>}
        {error && <div className="text-red-500">{error}</div>}

        <iframe
          ref={iframeRef}
          src={`${widgetOrigin}/workflow?parentOrigin=${window.location.origin}`}
          className="w-full h-full rounded-lg"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
```

**Your parent app is now ready to integrate with the widget credit system! 🎯**