# 🔌 Widget API Integration Guide

## Overview
Complete guide for widget applications to integrate with Chain Catalyst's parent app for credit deduction and communication.

---

## 🎯 Parent-Widget Communication Pattern

### Architecture
```
┌─────────────────┐    postMessage    ┌─────────────────┐
│   Parent App    │ ←───────────────→ │  Widget (iframe) │
│ (chaincatalyst) │                   │  (workflow app) │
└─────────────────┘                   └─────────────────┘
        │                                       │
        │ API Calls                             │ postMessage
        ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│  Backend API    │                   │  Parent Window  │
│ (credit system) │                   │   (receives)    │
└─────────────────┘                   └─────────────────┘
```

---

## 🚀 Implementation for Widget Apps

### 1. Initialize Parent Communication

```javascript
// widget-app/src/utils/parentCommunication.js
class ParentCommunication {
  constructor() {
    this.parentOrigin = null;
    this.isConnected = false;
    this.setupParentCommunication();
  }

  setupParentCommunication() {
    // Extract parent origin from URL params
    const urlParams = new URLSearchParams(window.location.search);
    this.parentOrigin = urlParams.get('parentOrigin') || 'https://chaincatalyst.ai';

    // Listen for messages from parent
    window.addEventListener('message', this.handleParentMessage.bind(this));

    // Notify parent that widget is loaded
    this.sendToParent('widget-loaded', {
      status: 'ready',
      widget: 'workflow', // or 'architect'
      timestamp: Date.now()
    });
  }

  handleParentMessage(event) {
    // Verify origin for security
    if (event.origin !== this.parentOrigin) {
      console.warn('Ignored message from unknown origin:', event.origin);
      return;
    }

    const { type, data } = event.data;

    switch (type) {
      case 'parent-ready':
        this.isConnected = true;
        console.log('✅ Connected to parent app');
        break;

      case 'credit-deducted':
        console.log('💳 Credits deducted:', data);
        break;

      case 'insufficient-credits':
        this.handleInsufficientCredits(data);
        break;

      default:
        console.log('📨 Received message from parent:', type, data);
    }
  }

  sendToParent(type, data = {}) {
    if (!this.parentOrigin) {
      console.error('Parent origin not set');
      return;
    }

    window.parent.postMessage({
      type,
      data,
      source: 'widget',
      timestamp: Date.now()
    }, this.parentOrigin);
  }

  // Signal when widget work is complete and credits should be deducted
  signalWorkComplete(workType = 'analysis') {
    this.sendToParent('session-complete', {
      workType,
      success: true,
      shouldDeductCredits: true
    });
  }

  // Signal an error occurred
  signalError(error) {
    this.sendToParent('error', {
      message: error.message || 'Unknown error',
      code: error.code || 'WIDGET_ERROR'
    });
  }

  // Request credit balance check
  requestCreditBalance() {
    this.sendToParent('request-credit-balance');
  }

  handleInsufficientCredits(data) {
    // Show buy credits modal or redirect
    const { requiredCredits, currentBalance } = data;

    // Display user-friendly message
    this.showInsufficientCreditsModal(requiredCredits, currentBalance);
  }

  showInsufficientCreditsModal(required, current) {
    // Implementation depends on your UI framework
    console.log(`Need ${required} credits, have ${current}`);

    // Example with a simple modal
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                  background: rgba(0,0,0,0.8); display: flex; align-items: center;
                  justify-content: center; z-index: 10000;">
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px;">
          <h3>Insufficient Credits</h3>
          <p>You need ${required} credits but only have ${current}.</p>
          <button onclick="this.closest('div').remove();
                          window.parent.postMessage({type: 'redirect-to-credits'}, '*')">
            Buy Credits
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Initialize communication
const parentComm = new ParentCommunication();
export default parentComm;
```

### 2. Integration Points in Your Widget

```javascript
// widget-app/src/components/AnalysisComponent.js
import parentComm from '../utils/parentCommunication';

export default function AnalysisComponent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      // Check credits before starting work
      parentComm.requestCreditBalance();

      // Perform your analysis/work
      const result = await performAnalysis();

      // Signal completion for credit deduction
      parentComm.signalWorkComplete('codebase-analysis');

      setIsAnalyzing(false);
    } catch (error) {
      parentComm.signalError(error);
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <button onClick={handleStartAnalysis} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
      </button>
    </div>
  );
}
```

### 3. React Hook for Parent Communication (Optional)

```javascript
// widget-app/src/hooks/useParentCommunication.js
import { useEffect, useCallback, useState } from 'react';

export function useParentCommunication() {
  const [isConnected, setIsConnected] = useState(false);
  const [parentOrigin, setParentOrigin] = useState(null);

  useEffect(() => {
    // Extract parent origin from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get('parentOrigin') || 'https://chaincatalyst.ai';
    setParentOrigin(origin);

    // Listen for parent messages
    const handleMessage = (event) => {
      if (event.origin !== origin) return;

      const { type, data } = event.data;

      if (type === 'parent-ready') {
        setIsConnected(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent of load
    window.parent.postMessage({
      type: 'widget-loaded',
      data: { status: 'ready' }
    }, origin);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendToParent = useCallback((type, data = {}) => {
    if (!parentOrigin) return;

    window.parent.postMessage({
      type,
      data,
      source: 'widget',
      timestamp: Date.now()
    }, parentOrigin);
  }, [parentOrigin]);

  const signalWorkComplete = useCallback((workType = 'analysis') => {
    sendToParent('session-complete', {
      workType,
      success: true,
      shouldDeductCredits: true
    });
  }, [sendToParent]);

  const signalError = useCallback((error) => {
    sendToParent('error', {
      message: error.message || 'Unknown error',
      code: error.code || 'WIDGET_ERROR'
    });
  }, [sendToParent]);

  return {
    isConnected,
    sendToParent,
    signalWorkComplete,
    signalError
  };
}
```

---

## 📡 Parent App Message Handling

### The parent app already handles these messages in ArchitectWidget.tsx and WorkflowWidget.tsx:

```javascript
// In parent app widget components
const handleMessage = (event: MessageEvent) => {
  const allowedOrigins = ENV_URLS.WIDGET_ALLOWED_ORIGINS;
  if (!allowedOrigins.includes(event.origin)) return;

  const { type, data } = event.data;

  switch(type) {
    case 'widget-loaded':
      console.log('🔧 Widget loaded successfully');
      // Credits are checked before widget loads
      break;

    case 'session-complete':
      console.log('🔧 Session complete:', data);
      if (data.shouldDeductCredits) {
        deductCredits(); // This calls the API
      }
      if (onClose) onClose();
      break;

    case 'error':
      console.error('🔧 Widget error:', data);
      setError(data.message || 'Widget encountered an error');
      break;

    case 'request-credit-balance':
      // Send current balance to widget
      sendCreditBalance();
      break;

    case 'redirect-to-credits':
      router.push('/credits/add-packs');
      break;
  }
};
```

---

## 🎛️ Credit Deduction Flow

### When Credits Are Deducted:
1. **User opens widget** → Parent checks credits first
2. **Widget loads successfully** → Parent shows widget
3. **User completes work** → Widget sends `session-complete`
4. **Parent receives message** → Calls credit deduction API
5. **Credits deducted** → Transaction logged

### Credit Deduction API Call (Parent App):
```javascript
const deductCredits = async () => {
  try {
    const authToken = localStorage.getItem('auth-token');

    const response = await fetch('/nextapi/credits/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({
        amount: widgetType === 'architect' ? 2 : 1, // Credit cost
        widgetType: 'WORKFLOW', // or 'ARCHITECT'
        description: 'Widget session completed'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Credits deducted:', result);

      // Notify widget of successful deduction
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'credit-deducted',
          data: result
        }, widgetOrigin);
      }
    } else {
      console.error('❌ Failed to deduct credits');
    }
  } catch (error) {
    console.error('❌ Error deducting credits:', error);
  }
};
```

---

## 🔒 Security Considerations

### 1. Origin Validation
**Always validate message origins:**
```javascript
const ALLOWED_ORIGINS = [
  'https://chaincatalyst.ai',
  'https://widget.chaincatalyst.ai',
  'http://localhost:3000', // Development only
  'http://localhost:5000'  // Development only
];

window.addEventListener('message', (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn('Blocked message from unauthorized origin:', event.origin);
    return;
  }
  // Process message...
});
```

### 2. Message Structure Validation
```javascript
function isValidMessage(data) {
  return (
    data &&
    typeof data.type === 'string' &&
    typeof data.source === 'string' &&
    data.source === 'widget'
  );
}
```

### 3. Prevent Credit Manipulation
- **Credits are ONLY deducted by parent app**
- **Widget cannot directly call credit APIs**
- **All credit operations require authentication**
- **Server-side validation for all transactions**

---

## 🧪 Testing Your Integration

### 1. Basic Communication Test
```javascript
// In widget console
window.parent.postMessage({
  type: 'test-message',
  data: { test: true },
  source: 'widget'
}, 'https://chaincatalyst.ai');
```

### 2. Credit Deduction Test
```javascript
// Simulate work completion
window.parent.postMessage({
  type: 'session-complete',
  data: {
    workType: 'test-analysis',
    success: true,
    shouldDeductCredits: true
  },
  source: 'widget'
}, 'https://chaincatalyst.ai');
```

### 3. Error Handling Test
```javascript
// Simulate error
window.parent.postMessage({
  type: 'error',
  data: {
    message: 'Test error message',
    code: 'TEST_ERROR'
  },
  source: 'widget'
}, 'https://chaincatalyst.ai');
```

---

## 📋 Widget Integration Checklist

### Required Implementation:
- [ ] Extract `parentOrigin` from URL parameters
- [ ] Set up `postMessage` listener for parent communication
- [ ] Send `widget-loaded` message on initialization
- [ ] Send `session-complete` when work is done
- [ ] Send `error` messages for failures
- [ ] Validate message origins for security
- [ ] Handle `insufficient-credits` messages gracefully

### Optional Enhancements:
- [ ] Progress reporting during long operations
- [ ] Real-time credit balance requests
- [ ] User-friendly error modals
- [ ] Retry mechanisms for failed operations
- [ ] Analytics tracking for widget usage

### Testing:
- [ ] Communication works in development
- [ ] Credit deduction triggers correctly
- [ ] Error handling displays properly
- [ ] Origin validation blocks unauthorized messages
- [ ] Mobile/responsive layout works in iframe

---

## 🎯 Example: Complete Workflow Widget Integration

```javascript
// workflow-widget/src/main.js
import { useParentCommunication } from './hooks/useParentCommunication';

function WorkflowApp() {
  const { isConnected, signalWorkComplete, signalError } = useParentCommunication();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGeneratePrompts = async () => {
    if (!isConnected) {
      alert('Not connected to parent app');
      return;
    }

    setIsProcessing(true);

    try {
      // Do your workflow generation work here
      const result = await generatePromptPacks();

      // Signal completion for credit deduction
      signalWorkComplete('prompt-generation');

      // Show success message
      setResult(result);
    } catch (error) {
      signalError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1>Workflow Generator</h1>
      <button
        onClick={handleGeneratePrompts}
        disabled={!isConnected || isProcessing}
      >
        {isProcessing ? 'Generating...' : 'Generate Prompt Packs'}
      </button>
    </div>
  );
}
```

**Your widget is now fully integrated with Chain Catalyst's credit system! 🚀**

---

## 📞 Support

If you need help with widget integration:
1. Check browser console for postMessage errors
2. Verify origin validation is working
3. Test credit deduction in development mode
4. Contact Chain Catalyst support for API issues

---

## 🎯 Implementation Plan for Widget Apps

### Credit Deduction Points:

#### Workflow Widget (1 credit each):
- **Codebase Analysis**: When analysis status changes to 'COMPLETED' in `ProjectDashboard.tsx`
- **Story Creation**: When new story is successfully created in `CreateStoryModal.tsx`
- **Prompt Pack Generation**: When prompt pack is successfully generated in `PromptPackGenerator.tsx`

#### Architect Widget (2 credits total):
- **Final Document Generation**: At completion of 13-step flow when session is marked 'complete'
- **Trigger Point**: When all documents are generated and the final document is produced
- **Implementation**: Add `parentComm.signalWorkComplete('architect-completion', 2)` at end of workflow

### Implementation Status:
- ✅ `utils/parentCommunication.js` - Core communication class created
- ✅ Codebase Analysis - Credit deduction added to `ProjectDashboard.tsx`
- ✅ Story Creation - Credit deduction added to `CreateStoryModal.tsx`
- ✅ Prompt Pack Generation - Credit deduction added to `PromptPackGenerator.tsx`
- 🔄 Architect Widget - Needs 2-credit deduction at workflow completion
- 🔄 Testing - All integration points need testing

### Next Steps:
1. **Architect Widget Integration**: Add 2-credit deduction at end of 13-step flow
2. **Testing**: Verify all credit deduction triggers work correctly
3. **Error Handling**: Test insufficient credit scenarios
4. **Production Deployment**: Deploy to staging for end-to-end testing