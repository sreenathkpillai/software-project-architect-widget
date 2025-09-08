'use client';

import { useState, useEffect } from 'react';
import IntroChat from './IntroChat';
import Chat from './chat';
import DocumentViewer from './DocumentViewer/DocumentViewer';
import { initializeWidgetAuth, widgetAuth, AuthVerificationResponse, ThemeConfig } from '@/lib/auth';
import { useAuth, useExternalId, useAuthReady } from '@/lib/auth-store';
import { useSession, SessionType, IntroBrief } from '@/hooks/useSession';
import { WidgetTheme, chainCatalystTheme, applyTheme, parseThemeFromUrl } from '@/lib/theme';

type WidgetMode = 'chat' | 'documents' | 'intro';

interface WidgetAppProps {
  defaultSessionType?: SessionType;
  skipIntro?: boolean;
}

export default function WidgetApp({ defaultSessionType = 'architect', skipIntro = true }: WidgetAppProps) {
  // Use auth store for reactive auth state management
  const { isAuthenticating, authError, verificationResponse, widgetAuth: authWidgetAuth } = useAuth();
  const externalId = useExternalId();
  const isAuthReady = useAuthReady();
  
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | undefined>(undefined);
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>(chainCatalystTheme);
  const [currentMode, setCurrentMode] = useState<WidgetMode>('chat');
  const [urlSessionId, setUrlSessionId] = useState<string | null>(null);

  // Only initialize session after authentication is complete and we have the external ID
  const { 
    sessionState, 
    isLoading: isSessionLoading, 
    transitionToArchitect, 
    startNewIntro, 
    startNewArchitectSession 
  } = useSession(externalId);

  useEffect(() => {
    // 🐛 DEBUG: Log widget initialization
    console.log('📦 DEBUG: Widget initializing with URL:', window.location.href);
    
    // Parse URL parameters for mode and session routing
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') as WidgetMode || 'chat';
    const sessionId = urlParams.get('sessionId');
    
    console.log('📦 DEBUG: Widget URL params:', {
      mode,
      sessionId,
      allParams: Object.fromEntries(urlParams.entries())
    });
    
    setCurrentMode(mode);
    setUrlSessionId(sessionId);
    
    // Apply Chain Catalyst theme immediately as default
    applyTheme(chainCatalystTheme);
    setWidgetTheme(chainCatalystTheme);
    
    // Handle theme configuration from auth store
    const handleThemeSetup = () => {
      // Parse theme from URL, but always ensure we have a valid theme
      const urlTheme = parseThemeFromUrl();
      const activeTheme = urlTheme || chainCatalystTheme;
      
      console.log('🎨 Active theme selected:', { 
        hasUrlTheme: !!urlTheme, 
        primary: activeTheme.primary 
      });
      
      setWidgetTheme(activeTheme);
      applyTheme(activeTheme);

      // Apply legacy theme config if available (for backward compatibility)
      const legacyTheme = authWidgetAuth?.getTheme();
      if (legacyTheme) {
        setThemeConfig(legacyTheme);
        applyGlobalTheme(legacyTheme);
      }
    };

    handleThemeSetup();
  }, []);

  const applyGlobalTheme = (theme: ThemeConfig) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme).forEach(([key, value]) => {
      if (value) {
        const cssProperty = `--widget-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssProperty, value);
      }
    });
  };

  // 🐛 DEBUG: Log loading state
  console.log('🔄 DEBUG: Widget render state:', {
    isAuthenticating,
    isSessionLoading,
    externalId,
    isAuthReady,
    shouldShowLoading: !isAuthReady || isSessionLoading
  });
  
  if (!isAuthReady || isSessionLoading) {
    return (
      <div style={{background: 'var(--widget-background)'}} className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
          <p className="text-white">Setting up your software architect...</p>
          {/* 🐛 DEBUG: Show debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-300">
              Auth: {isAuthenticating ? 'authenticating' : 'done'} | 
              Session: {isSessionLoading ? 'loading' : 'done'} | 
              ExternalId: {externalId || 'waiting'}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Handle different modes based on URL parameters and session state
  console.log('🔧 WIDGET RENDERING:', { 
    currentMode, 
    sessionType: sessionState.sessionType, 
    urlSessionId,
    sessionId: sessionState.sessionId 
  });

  // Mode handlers
  const handleViewDocuments = () => {
    setCurrentMode('documents');
  };

  const handleBackToChat = () => {
    setCurrentMode('chat');
  };

  // Render based on current mode
  if (currentMode === 'documents') {
    const sessionId = urlSessionId || sessionState.sessionId;
    if (!sessionId) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No session available for document view</p>
            <button
              onClick={handleBackToChat}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        </div>
      );
    }

    return (
      <DocumentViewer
        sessionId={sessionId}
        externalId={sessionState.externalId}
      />
    );
  }

  // Enhanced transition and parent notification handlers
  const handleTransitionToArchitect = (brief: IntroBrief) => {
    transitionToArchitect(brief);
    // Notify parent of transition
    authWidgetAuth?.sendToParent({
      type: 'SESSION_TRANSITION',
      from: 'intro',
      to: 'architect',
      brief
    });
  };

  const handleStartNewIntro = () => {
    startNewIntro();
    // Notify parent
    authWidgetAuth?.sendToParent({
      type: 'NEW_PROJECT_STARTED'
    });
  };

  // Default: Chat mode
  return (
    <Chat 
      introBrief={sessionState.introBrief}
      onBackToIntro={handleStartNewIntro}
      onNewProject={handleStartNewIntro}
      onViewDocuments={handleViewDocuments}
      themeConfig={themeConfig}
      widgetTheme={widgetTheme}
      externalId={sessionState.externalId}
      sessionType="architect"
      userSession={urlSessionId || sessionState.sessionId}
    />
  );
}