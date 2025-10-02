'use client';

/**
 * Parent Communication Utility for Widget Credit Integration
 * Handles postMessage communication between widget and parent app for credit deduction
 */
class ParentCommunication {
  constructor() {
    this.parentOrigin = null;
    this.isConnected = false;
    this.setupParentCommunication();
  }

  setupParentCommunication() {
    // Only run on client side
    if (typeof window === 'undefined') {
      console.log('🔧 Skipping parent communication setup on server side');
      return;
    }

    // Extract parent origin from URL params
    const urlParams = new URLSearchParams(window.location.search);
    this.parentOrigin = urlParams.get('parentOrigin') || 'https://chaincatalyst.ai';

    // Listen for messages from parent
    window.addEventListener('message', this.handleParentMessage.bind(this));

    // Notify parent that widget is loaded
    this.sendToParent('widget-loaded', {
      status: 'ready',
      widget: 'workflow',
      timestamp: Date.now()
    });

    console.log('🔧 Widget communication initialized with parent:', this.parentOrigin);
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
        console.warn('❌ Insufficient credits:', data);
        this.handleInsufficientCredits(data);
        break;

      case 'credit-balance':
        console.log('💰 Current credit balance:', data);
        break;

      default:
        console.log('📨 Received message from parent:', type, data);
    }
  }

  sendToParent(type, data = {}) {
    if (typeof window === 'undefined') {
      console.log('📤 Skipping message to parent on server side:', type);
      return;
    }

    if (!this.parentOrigin) {
      console.error('Parent origin not set');
      return;
    }

    const message = {
      type,
      data,
      source: 'widget',
      timestamp: Date.now()
    };

    window.parent.postMessage(message, this.parentOrigin);
    console.log('📤 Sent to parent:', type, data);
  }

  // Signal when widget work is complete and credits should be deducted
  signalWorkComplete(workType, creditAmount = 1) {
    this.sendToParent('session-complete', {
      workType,
      success: true,
      shouldDeductCredits: true,
      creditAmount
    });
  }

  // Signal an error occurred
  signalError(error) {
    this.sendToParent('error', {
      message: error.message || 'Unknown error',
      code: error.code || 'WIDGET_ERROR'
    });
  }

  // Request current credit balance
  requestCreditBalance() {
    this.sendToParent('request-credit-balance');
  }

  // Handle insufficient credits response from parent
  handleInsufficientCredits(data) {
    const { requiredCredits, currentBalance } = data;
    console.error(`Insufficient credits: need ${requiredCredits}, have ${currentBalance}`);

    // Parent app should handle the UI for this, but log for debugging
    this.sendToParent('insufficient-credits-acknowledged', {
      requiredCredits,
      currentBalance
    });
  }

  // Check if connected to parent
  isConnectedToParent() {
    return this.isConnected;
  }

  // Test communication functionality
  testCommunication() {
    console.log('🧪 Testing parent communication...');
    this.sendToParent('test-message', {
      message: 'Widget communication test',
      timestamp: Date.now()
    });
  }

  // Destroy communication (cleanup)
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handleParentMessage.bind(this));
    }
  }
}

// Create singleton instance
const parentComm = new ParentCommunication();

export default parentComm;