import { useState, useEffect } from 'react';

export type SessionType = 'intro' | 'architect';

export interface IntroBrief {
  whatTheyreDoing: string;
  projectType: string;
  audience: string;
  problem: string;
  timeline: string;
  teamSize: string;
}

export interface SessionState {
  sessionId: string;
  sessionType: SessionType;
  introBrief: IntroBrief | null;
  externalId: string;
}

export function useSession(externalId?: string) {
  console.log('🎯 DEBUG: useSession called with externalId:', externalId);
  
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: '',
    sessionType: 'architect',
    introBrief: null,
    externalId: ''
  });
  
  console.log('🎯 DEBUG: Current session state:', sessionState);
  console.log('🎯 DEBUG: Received externalId:', externalId);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 🐛 DEBUG: Track externalId changes
    console.log('🎯 DEBUG: useSession externalId changed:', {
      externalId,
      hasExternalId: !!externalId,
      currentSessionState: sessionState,
      sessionStateExternalId: sessionState.externalId,
      needsReinit: externalId && externalId !== sessionState.externalId
    });
    
    // Initialize or re-initialize session if:
    // 1. We have an externalId and no current session, OR
    // 2. The externalId has changed from what's in the session state
    if (externalId && (sessionState.externalId !== externalId || !sessionState.sessionId)) {
      console.log('🎯 DEBUG: Initializing session with externalId:', externalId);
      console.log('🎯 DEBUG: Reason:', {
        hasExternalId: !!externalId,
        currentExternalId: sessionState.externalId,
        hasSessionId: !!sessionState.sessionId,
        externalIdChanged: sessionState.externalId !== externalId
      });
      initializeSession();
    } else if (!externalId) {
      console.log('🎯 DEBUG: No externalId yet, waiting...');
    } else {
      console.log('🎯 DEBUG: Session already initialized with correct externalId');
    }
  }, [externalId, sessionState.externalId, sessionState.sessionId]);

  const initializeSession = async () => {
    try {
      // Use the provided external ID (should not be undefined at this point)
      const userExternalId = externalId!;
      console.log('🎯 DEBUG: initializeSession called with externalId:', userExternalId);
      
      // Clear any old localStorage to force architect mode
      localStorage.removeItem('introSession');
      localStorage.removeItem('userSession');
      
      let sessionType: SessionType = 'architect';
      let sessionId = '';
      let introBrief: IntroBrief | null = null;

      // Always start with architect - skip intro entirely
      sessionType = 'architect';
      sessionId = generateSessionId('architect');
      
      console.log('🔧 DEBUG: FORCING ARCHITECT MODE:', { sessionType, sessionId, userExternalId });

      // Skip all legacy intro logic - always architect

      // Store session ID
      localStorage.setItem('userSession', sessionId);

      const newSessionState = {
        sessionId,
        sessionType,
        introBrief,
        externalId: userExternalId
      };
      
      console.log('🎯 DEBUG: Setting session state:', newSessionState);
      setSessionState(newSessionState);

      setIsLoading(false);
    } catch (error) {
      console.error('🎯 DEBUG: Session initialization failed:', error);
      // Fallback to intro session
      const sessionId = generateSessionId('intro');
      localStorage.setItem('introSession', sessionId);
      
      const fallbackState = {
        sessionId,
        sessionType: 'intro' as SessionType,
        introBrief: null,
        externalId: externalId || 'anonymous'
      };
      
      console.log('🎯 DEBUG: Setting fallback session state:', fallbackState);
      setSessionState(fallbackState);
      
      setIsLoading(false);
    }
  };

  const generateSessionId = (type: SessionType): string => {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const transitionToArchitect = (brief: IntroBrief) => {
    const architectSessionId = generateSessionId('architect');
    localStorage.setItem('userSession', architectSessionId);
    
    setSessionState(prev => ({
      ...prev,
      sessionId: architectSessionId,
      sessionType: 'architect',
      introBrief: brief
    }));

    // Note: Parent notification moved to WidgetApp to maintain auth dependency
  };

  const startNewIntro = () => {
    const introSessionId = generateSessionId('intro');
    localStorage.setItem('introSession', introSessionId);
    localStorage.removeItem('userSession'); // Clear architect session
    
    setSessionState(prev => ({
      ...prev,
      sessionId: introSessionId,
      sessionType: 'intro',
      introBrief: null
    }));

    // Note: Parent notification moved to WidgetApp to maintain auth dependency
  };

  const startNewArchitectSession = () => {
    const architectSessionId = generateSessionId('architect');
    localStorage.setItem('userSession', architectSessionId);
    
    setSessionState(prev => ({
      ...prev,
      sessionId: architectSessionId,
      sessionType: 'architect',
      introBrief: null // Start without intro context
    }));
  };

  return {
    sessionState,
    isLoading,
    transitionToArchitect,
    startNewIntro,
    startNewArchitectSession,
    refreshSession: initializeSession
  };
}