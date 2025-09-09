'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthConfig, AuthVerificationResponse, WidgetAuth } from './auth';

interface AuthState {
  config: AuthConfig;
  verificationResponse: AuthVerificationResponse | null;
  externalId: string | undefined;
  isAuthenticating: boolean;
  authError: string | null;
  widgetAuth: WidgetAuth | null;
}

interface AuthContextValue extends AuthState {
  updateExternalId: (externalId: string) => void;
  updateVerificationResponse: (response: AuthVerificationResponse) => void;
  setAuthError: (error: string | null) => void;
  setIsAuthenticating: (isAuthenticating: boolean) => void;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    config: {},
    verificationResponse: null,
    externalId: undefined,
    isAuthenticating: true,
    authError: null,
    widgetAuth: null
  });

  // Initialize auth on mount and set up parent communication listeners
  useEffect(() => {
    initializeAuth();
    
    // Set up a retry mechanism for unverified users
    // This handles cases where the umbrella app might send the externalId after a delay
    let retryTimer: NodeJS.Timeout | null = null;
    
    const setupRetryIfNeeded = () => {
      if (authState.externalId === 'unverified_user' && !retryTimer) {
        console.log('🔄 DEBUG: Setting up retry timer for unverified_user');
        retryTimer = setTimeout(async () => {
          console.log('🔄 DEBUG: Retrying auth for unverified_user after 2s delay');
          
          // Check if URL params have been updated
          const freshConfig = WidgetAuth.extractAuthFromParams();
          console.log('🔄 DEBUG: Fresh config from URL:', freshConfig);
          
          if (freshConfig.externalId && freshConfig.externalId !== 'unverified_user') {
            console.log('🔄 DEBUG: Found valid externalId in retry, updating:', freshConfig.externalId);
            updateExternalId(freshConfig.externalId);
          } else {
            console.log('🔄 DEBUG: No improvement in externalId during retry');
          }
        }, 2000);
      }
    };
    
    // Set up listener for auth updates from parent app
    const handleParentMessage = (event: MessageEvent) => {
      console.log('📨 DEBUG: Received message from parent:', event.data);
      
      // Clear retry timer if we get a parent message with valid data
      if (retryTimer && event.data.externalId && event.data.externalId !== 'unverified_user') {
        console.log('🔄 DEBUG: Clearing retry timer due to valid parent message');
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      
      if (event.data.type === 'AUTH_UPDATE') {
        console.log('🔐 DEBUG: Handling AUTH_UPDATE from parent:', event.data);
        
        // Update external ID immediately
        updateExternalId(event.data.externalId);
        
        // Update the widget auth config if available
        setAuthState(prev => {
          if (prev.widgetAuth) {
            prev.widgetAuth.updateAuthConfig({
              token: event.data.token,
              externalId: event.data.externalId
            });
            
            // Optionally re-verify with new token
            if (event.data.token) {
              prev.widgetAuth.verifyToken().then(response => {
                console.log('🔐 DEBUG: Re-verification after AUTH_UPDATE:', response);
                updateVerificationResponse(response);
              }).catch(error => {
                console.error('🔐 DEBUG: Re-verification failed:', error);
              });
            }
          }
          return prev;
        });
      } else if (event.data.type === 'EXTERNAL_ID_UPDATE') {
        console.log('🔐 DEBUG: Handling EXTERNAL_ID_UPDATE from parent:', event.data.externalId);
        updateExternalId(event.data.externalId);
      }
    };
    
    window.addEventListener('message', handleParentMessage);
    
    // Set up retry if needed
    setupRetryIfNeeded();
    
    return () => {
      window.removeEventListener('message', handleParentMessage);
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [authState.externalId]); // React to externalId changes

  const initializeAuth = async () => {
    try {
      console.log('🔐 DEBUG: AuthProvider initializing...');
      
      // Extract auth config from URL
      const authConfig = WidgetAuth.extractAuthFromParams();
      const widgetAuth = new WidgetAuth(authConfig);
      
      console.log('🔐 DEBUG: Created WidgetAuth with config:', authConfig);
      
      setAuthState(prev => ({
        ...prev,
        config: authConfig,
        widgetAuth,
        externalId: authConfig.externalId,
        isAuthenticating: true,
        authError: null
      }));

      // Set up parent communication
      widgetAuth.setupParentCommunication();

      // Apply initial theme if provided
      if (authConfig.theme) {
        widgetAuth.applyTheme(authConfig.theme);
      }

      // Verify token
      console.log('🔐 DEBUG: Starting token verification...');
      const response = await widgetAuth.verifyToken();
      console.log('🔐 DEBUG: Token verification response:', response);

      if (response.valid) {
        const finalExternalId = response.externalId || authConfig.externalId;
        console.log('🔐 DEBUG: Auth successful, setting externalId:', finalExternalId);
        
        // 🚨 ISSUE DETECTION: Check for common problems
        if (finalExternalId === 'unverified_user') {
          console.error('🚨 ISSUE DETECTED: Getting "unverified_user" as externalId!');
          console.error('🚨 DIAGNOSIS:');
          console.error('  - URL externalId:', authConfig.externalId);
          console.error('  - Response externalId:', response.externalId);
          console.error('  - Has token:', !!authConfig.token);
          console.error('  - Has authEndpoint:', !!authConfig.parentAuthEndpoint);
          console.error('  - Full URL:', window.location.href);
          console.error('🚨 LIKELY CAUSES:');
          console.error('  1. Umbrella app not passing externalId URL parameter');
          console.error('  2. Umbrella app passing externalId but no authEndpoint');
          console.error('  3. URL encoding issues with externalId parameter');
          console.error('🚨 SOLUTIONS:');
          console.error('  - Ensure umbrella app passes ?externalId=USER_ID in URL');
          console.error('  - Or ensure umbrella app sends AUTH_UPDATE postMessage');
          console.error('  - Check if externalId is being URL encoded properly');
        }
        
        setAuthState(prev => ({
          ...prev,
          verificationResponse: response,
          externalId: finalExternalId,
          isAuthenticating: false,
          authError: null
        }));
      } else {
        console.log('🔐 DEBUG: Auth failed:', response.error);
        setAuthState(prev => ({
          ...prev,
          verificationResponse: response,
          isAuthenticating: false,
          authError: response.error || 'Authentication failed'
        }));
      }
    } catch (error) {
      console.error('🔐 DEBUG: Auth initialization error:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticating: false,
        authError: error instanceof Error ? error.message : 'Authentication failed'
      }));
    }
  };

  const updateExternalId = (externalId: string) => {
    console.log('🔐 DEBUG: Updating externalId to:', externalId);
    setAuthState(prev => {
      // Only update if the externalId actually changed
      if (prev.externalId !== externalId) {
        console.log('🔐 DEBUG: ExternalId changed from', prev.externalId, 'to', externalId);
        return {
          ...prev,
          externalId
        };
      }
      console.log('🔐 DEBUG: ExternalId unchanged, skipping update');
      return prev;
    });
  };

  const updateVerificationResponse = (response: AuthVerificationResponse) => {
    console.log('🔐 DEBUG: Updating verification response:', response);
    const finalExternalId = response.externalId || authState.externalId;
    setAuthState(prev => ({
      ...prev,
      verificationResponse: response,
      externalId: finalExternalId,
      isAuthenticating: false,
      authError: response.valid ? null : (response.error || 'Authentication failed')
    }));
  };

  const setAuthError = (error: string | null) => {
    console.log('🔐 DEBUG: Setting auth error:', error);
    setAuthState(prev => ({
      ...prev,
      authError: error,
      isAuthenticating: false
    }));
  };

  const setIsAuthenticating = (isAuthenticating: boolean) => {
    console.log('🔐 DEBUG: Setting isAuthenticating:', isAuthenticating);
    setAuthState(prev => ({
      ...prev,
      isAuthenticating
    }));
  };

  const retryAuth = async () => {
    console.log('🔐 DEBUG: Retrying authentication...');
    await initializeAuth();
  };

  const contextValue: AuthContextValue = {
    ...authState,
    updateExternalId,
    updateVerificationResponse,
    setAuthError,
    setIsAuthenticating,
    retryAuth
  };

  // Expose context to global scope for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.authStore = contextValue;
    }
  }, [contextValue]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to get just the externalId for session initialization
export function useExternalId(): string | undefined {
  const { externalId } = useAuth();
  return externalId;
}

// Hook to check if auth is ready
export function useAuthReady(): boolean {
  const { isAuthenticating, externalId } = useAuth();
  return !isAuthenticating && !!externalId;
}

// Global debugging utility - can be called from browser console
declare global {
  interface Window {
    debugAuth: {
      setExternalId: (externalId: string) => void;
      getCurrentState: () => void;
      forceReauth: () => Promise<void>;
      testUmbrellaConnection: () => void;
    };
    authStore: AuthContextValue | null;
  }
}

// Expose debugging utilities to global scope
if (typeof window !== 'undefined') {
  window.authStore = null; // Will be set by the provider
  
  window.debugAuth = {
    setExternalId: (externalId: string) => {
      console.log('🛠️ DEBUG UTILITY: Setting externalId to:', externalId);
      if (window.authStore) {
        window.authStore.updateExternalId(externalId);
        console.log('✅ ExternalId updated successfully');
      } else {
        console.error('❌ AuthStore not available');
      }
    },
    getCurrentState: () => {
      console.log('🛠️ DEBUG UTILITY: Current auth state:', {
        authStore: !!window.authStore,
        externalId: window.authStore?.externalId,
        isAuthenticating: window.authStore?.isAuthenticating,
        authError: window.authStore?.authError,
        hasWidgetAuth: !!window.authStore?.widgetAuth,
        url: window.location.href,
        urlParams: Object.fromEntries(new URLSearchParams(window.location.search).entries())
      });
    },
    forceReauth: async () => {
      console.log('🛠️ DEBUG UTILITY: Forcing re-authentication...');
      if (window.authStore) {
        await window.authStore.retryAuth();
        console.log('✅ Re-authentication completed');
      } else {
        console.error('❌ AuthStore not available');
      }
    },
    testUmbrellaConnection: () => {
      console.log('🛠️ DEBUG UTILITY: Testing umbrella app connection...');
      console.log('Parent window:', window.parent !== window ? 'Available' : 'Same as current');
      console.log('Sending test message to parent...');
      
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'WIDGET_DEBUG_PING',
          timestamp: Date.now()
        }, '*');
        console.log('✅ Test message sent. Check umbrella app console for response.');
      } else {
        console.log('❌ No parent window detected. Widget may not be in iframe.');
      }
    }
  };
  
  console.log('🛠️ DEBUG UTILITIES LOADED - Use these in console:');
  console.log('  window.debugAuth.getCurrentState() - Show current auth state');
  console.log('  window.debugAuth.setExternalId("YOUR_USER_ID") - Manually set externalId');
  console.log('  window.debugAuth.forceReauth() - Force re-authentication');
  console.log('  window.debugAuth.testUmbrellaConnection() - Test parent app connection');
}