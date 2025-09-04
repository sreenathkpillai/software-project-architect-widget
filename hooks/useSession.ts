import { useState, useEffect } from 'react';
import { widgetAuth } from '@/lib/auth';

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

export function useSession() {
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: '',
    sessionType: 'architect',
    introBrief: null,
    externalId: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Get external ID from auth
      const externalId = widgetAuth?.getExternalId() || 'anonymous';
      
      // Clear any old localStorage to force architect mode
      localStorage.removeItem('introSession');
      localStorage.removeItem('userSession');
      
      let sessionType: SessionType = 'architect';
      let sessionId = '';
      let introBrief: IntroBrief | null = null;

      // Always start with architect - skip intro entirely
      sessionType = 'architect';
      sessionId = generateSessionId('architect');
      
      console.log('🔧 FORCING ARCHITECT MODE:', { sessionType, sessionId });

      // Skip all legacy intro logic - always architect

      // Store session ID
      localStorage.setItem('userSession', sessionId);

      setSessionState({
        sessionId,
        sessionType,
        introBrief,
        externalId
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Session initialization failed:', error);
      // Fallback to intro session
      const sessionId = generateSessionId('intro');
      localStorage.setItem('introSession', sessionId);
      
      setSessionState({
        sessionId,
        sessionType: 'intro',
        introBrief: null,
        externalId: widgetAuth?.getExternalId() || 'anonymous'
      });
      
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

    // Notify parent of transition
    widgetAuth?.sendToParent({
      type: 'SESSION_TRANSITION',
      from: 'intro',
      to: 'architect',
      brief
    });
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

    // Notify parent
    widgetAuth?.sendToParent({
      type: 'NEW_PROJECT_STARTED'
    });
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