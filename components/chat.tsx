'use client';

import { useState, useEffect } from 'react';
import { widgetAuth, ThemeConfig } from '@/lib/auth';
import { WidgetTheme } from '@/lib/theme';
import { getApiUrl } from '@/lib/api-config';
import SaveSessionModal from './SaveSessionModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface IntroBrief {
  whatTheyreDoing: string;
  projectType: string;
  audience: string;
  problem: string;
  timeline: string;
  teamSize: string;
}

export type SessionType = 'intro' | 'architect';

interface ChatProps {
  introBrief?: IntroBrief | null;
  onBackToIntro?: () => void;
  onNewProject?: () => void;
  onViewDocuments?: () => void;
  themeConfig?: ThemeConfig;
  widgetTheme?: WidgetTheme;
  externalId?: string;
  sessionType?: SessionType;
  userSession?: string;
}

export default function Chat({ 
  introBrief = null, 
  onBackToIntro, 
  onNewProject, 
  onViewDocuments,
  themeConfig,
  widgetTheme,
  externalId: propExternalId,
  sessionType = 'architect',
  userSession: propUserSession
}: ChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userSession, setUserSession] = useState<string>('');
  const [techDecisions, setTechDecisions] = useState(false);
  const [fastMode, setFastMode] = useState(true); // Default to fast mode
  const [timeline, setTimeline] = useState(1); // 1-10 scale
  const [completedDocs, setCompletedDocs] = useState<string[]>([]);
  const [loadingText, setLoadingText] = useState('');
  const [externalId, setExternalId] = useState('');
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [isWidget, setIsWidget] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadSuccessMessage, setLoadSuccessMessage] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Initialize external ID and session on component mount
  useEffect(() => {
    // Detect if running in iframe (widget mode)
    setIsWidget(window !== window.top);
    
    // Use prop externalId first, then URL params, then default
    const urlParams = new URLSearchParams(window.location.search);
    const extId = propExternalId || urlParams.get('externalId') || widgetAuth?.getExternalId() || 'sreeveTest123';
    setExternalId(extId);
    
    // Use provided session or generate new one
    const sessionId = propUserSession || localStorage.getItem('userSession') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userSession', sessionId);
    setUserSession(sessionId);
    setCurrentSessionId(sessionId);
    
    // Load saved sessions for this external ID
    loadSavedSessions(extId);
    
    // Check if session exists in DB and load state
    if (sessionId) {
      loadSessionState(sessionId, extId);
    }
  }, []);

  // Auto-load session from props when provided
  useEffect(() => {
    if (propUserSession && propUserSession !== userSession && externalId) {
      setCurrentSessionId(propUserSession);
      loadSessionData(propUserSession);
    }
  }, [propUserSession, externalId]);

  const loadSessionData = async (sessionId: string) => {
    // Load session data without changing dropdown selection
    try {
      const response = await fetch(
        `${getApiUrl('sessions')}?userSession=${sessionId}&externalId=${externalId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setCompletedDocs(data.completedDocs || []);
        setUserSession(sessionId);
        localStorage.setItem('userSession', sessionId);
        setCurrentSessionId(sessionId);
        console.log(`✅ Auto-loaded session: ${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to auto-load session:', error);
    }
  };

  const loadSessionState = async (sessionId: string, extId: string) => {
    try {
      const response = await fetch(`${getApiUrl('sessions')}?userSession=${sessionId}&externalId=${extId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          setCompletedDocs(data.completedDocs || []);
          console.log(`✅ Session state restored: ${sessionId} (${data.messages.length} messages)`);
        }
      }
    } catch (error) {
      console.error('Failed to load session state:', error);
    }
  };

  const saveSessionState = async () => {
    if (!userSession || !externalId || messages.length === 0) return;
    
    try {
      const response = await fetch(getApiUrl('sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userSession, 
          externalId, 
          sessionName: `Draft ${new Date().toLocaleDateString()}`,
          messages: messages,
          action: 'save'
        })
      });
      
      if (response.ok) {
        console.log('✅ Session state saved on error');
      }
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  };

  const discardCurrentSession = async () => {
    if (!userSession || !externalId) return false;

    try {
      const response = await fetch(`${getApiUrl(`sessions/${userSession}/discard`)}?externalId=${externalId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('✅ Current session discarded successfully');
        // Reload saved sessions to update dropdown
        loadSavedSessions(externalId);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to discard session:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Error discarding session:', error);
      return false;
    }
  };

  const isAutoSavedSession = (sessionName: string) => {
    return sessionName.startsWith('Draft ');
  };

  const hasMessages = () => {
    return messages.length > 0;
  };

  const startOver = async () => {
    if (!userSession || !externalId) {
      // If no session, just reset
      resetSession();
      return;
    }

    // Get current session info
    const currentSession = savedSessions.find(s => s.userSession === userSession);
    const sessionName = currentSession?.sessionName || `Draft ${new Date().toLocaleDateString()}`;
    
    if (hasMessages()) {
      if (isAutoSavedSession(sessionName)) {
        // Auto-saved session (starts with "Draft") - discard it
        const discarded = await discardCurrentSession();
        if (discarded) {
          console.log('🗑️ Auto-saved session discarded');
        }
      } else {
        // User-saved session (custom name) - show confirmation
        const confirmed = window.confirm(
          `You have a saved session "${sessionName}" with ${messages.length} messages. ` +
          'Starting over will keep this session but create a new one. Do you want to continue?'
        );
        
        if (!confirmed) {
          return; // User cancelled
        }
      }
    }

    // Reset to new session
    resetSession();
  };

  const resetSession = () => {
    // Clear current conversation and generate new session
    setMessages([]);
    setCompletedDocs([]);
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userSession', newSessionId);
    setUserSession(newSessionId);
    setCurrentSessionId(newSessionId);
  };

  const getRandomLoadingText = () => {
    // Different loading messages based on session type
    if (sessionType === 'intro') {
      const phrases = [
        "I love your vision! Let me think about this...",
        "This is going to be fantastic! Just a moment...",
        "You're onto something great here! Processing...",
        "I can already see the potential! Analyzing...",
        "This sounds like exactly what people need! Thinking...",
        "You've got a solid idea! Let me craft the perfect response...",
        "I'm excited about this project! Formulating thoughts...",
        "This has real potential! Building my response...",
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
    
    // Architect session loading messages
    // Determine which document we're likely working on based on completed count
    const currentStep = completedDocs.length + 1;
    
    // Steps that involve heavy background file creation (based on question limits)
    const heavySteps = [4, 8, 9, 10, 12]; // State Management(1), Testing(1), Docs(1), Performance(1), Libraries(1)
    
    let phrases;
    if (heavySteps.includes(currentStep)) {
      // Wisdom phrases for steps with lots of background work
      phrases = [
        "Good software takes time...",
        "Beware of instant software creators...",
        "Patience is a virtue...",
        "Slow is smooth, smooth is fast...",
        "Baking specifications low and slow...",
        "Quality architecture needs thoughtful decisions...",
        "Crafting robust foundations...",
        "Making hundreds of micro-decisions for you..."
      ];
    } else {
      // Regular progress phrases
      phrases = [
        "Analyzing your requirements...",
        "Crafting your architecture...", 
        "Designing the perfect solution...",
        "Thinking through the technical details...",
        "Building your project blueprint...",
        "Considering the best approach...",
        "Structuring your application...",
        "Planning the implementation...",
        "Optimizing the architecture...",
        "Finalizing the specifications..."
      ];
    }
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const ensureSessionExists = async () => {
    try {
      const response = await fetch(getApiUrl('sessions/ensure'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSession,
          externalId,
          sessionType,
          introBrief
        })
      });

      if (!response.ok) {
        console.error('Failed to ensure session exists');
      } else {
        console.log('✅ Session ensured in database');
      }
    } catch (error) {
      console.error('Error ensuring session exists:', error);
    }
  };

  const saveMessagePair = async (userMsg: Message, assistantMsg: Message) => {
    try {
      const response = await fetch(getApiUrl('sessions/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSession,
          externalId,
          messages: [userMsg, assistantMsg]
        })
      });

      if (!response.ok) {
        console.error('Failed to save message pair');
      } else {
        console.log('✅ Message pair saved to database');
      }
    } catch (error) {
      console.error('Error saving message pair:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Before sending first message, ensure session exists in DB
    if (messages.length === 0) {
      await ensureSessionExists();
    }

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setLoadingText(getRandomLoadingText());

    try {
      const response = await fetch(getApiUrl('chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: newMessages, 
          userSession, 
          techDecisions, 
          fastMode, 
          timeline, 
          externalId,
          introBrief,
          sessionType
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const assistantMessage: Message = { role: 'assistant', content: data.text };
        setMessages([...newMessages, assistantMessage]);
        
        // Save message pair after receiving response
        await saveMessagePair(userMessage, assistantMessage);
        
        // Check if session is complete
        if (data.sessionComplete) {
          setSessionComplete(true);
          
          // Auto-transition to document viewer after a short delay
          if (onViewDocuments) {
            setTimeout(() => {
              console.log('🎉 Session complete! Auto-transitioning to document viewer...');
              onViewDocuments();
            }, 2000); // 2 second delay to let user see the completion message
          }
        }
        
        // Update completed docs if a document was created
        if (data.functions_called && data.functions_called > 0) {
          // Fetch updated progress from server
          fetchProgress();
        }
      } else {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: 'Sorry, there was an error processing your request.' 
        }]);
      }
    } catch (error) {
      console.error('Message send failed:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, there was an error connecting to the server.' 
      }]);
      // Save current state to session on error
      await saveSessionState();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProgress = async () => {
    if (!userSession) return;
    try {
      const response = await fetch(`${getApiUrl('progress')}?userSession=${userSession}`);
      if (response.ok) {
        const data = await response.json();
        setCompletedDocs(data.completedDocs || []);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  // Fetch progress on session change
  useEffect(() => {
    if (userSession) {
      fetchProgress();
    }
  }, [userSession]);

  const loadSavedSessions = async (extId: string) => {
    try {
      const response = await fetch(`${getApiUrl('sessions')}?externalId=${extId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load saved sessions:', error);
    }
  };

  const handleSaveSessionClick = () => {
    if (!userSession || !externalId || messages.length === 0 || sessionComplete) return;
    setShowSaveModal(true);
  };

  const saveSession = async (sessionName: string) => {
    if (!userSession || !externalId) return;
    
    setIsSavingSession(true);
    
    try {
      // Use PUT method to rename existing session instead of creating new one
      const response = await fetch(getApiUrl('sessions'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userSession,
          sessionName, // This will replace "Draft" name
          action: 'rename'
        })
      });
      
      if (response.ok) {
        loadSavedSessions(externalId);
        setShowSaveModal(false);
        console.log(`✅ Session renamed to: ${sessionName}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to rename session:', errorData);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setIsSavingSession(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    if (isLoadingSession || isLoading) return;
    
    setIsLoadingSession(true);
    
    try {
      const response = await fetch(`${getApiUrl(`sessions/${sessionId}/load`)}?externalId=${externalId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Restore chat messages with proper Message interface
        const restoredMessages: Message[] = (data.messages || []).map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        
        setMessages(restoredMessages);
        setCompletedDocs(data.completedDocs || []);
        setUserSession(sessionId);
        localStorage.setItem('userSession', sessionId);
        setCurrentSessionId(sessionId);
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          const chatContainer = document.querySelector('.overflow-y-auto');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
        
        // Show success feedback
        const sessionName = data.sessionName || 'session';
        setLoadSuccessMessage(`Loaded session: ${sessionName}`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setLoadSuccessMessage(null);
        }, 3000);
        
      } else {
        const errorData = await response.json();
        console.error('Failed to load session:', errorData);
        // Force re-render of saved sessions to reset dropdown
        loadSavedSessions(externalId);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      // Force re-render of saved sessions to reset dropdown
      loadSavedSessions(externalId);
    } finally {
      setIsLoadingSession(false);
    }
  };


  const documentSteps = [
    { key: 'prd', label: 'Product Requirements' },
    { key: 'frontend', label: 'Frontend Architecture' },
    { key: 'backend', label: 'Backend Architecture' },
    { key: 'state_management', label: 'State Management' },
    { key: 'database_schema', label: 'Database Schema' },
    { key: 'api', label: 'API Specification' },
    { key: 'devops', label: 'DevOps & Deployment' },
    { key: 'testing_plan', label: 'Testing Strategy' },
    { key: 'code_documentation', label: 'Documentation' },
    { key: 'performance_optimization', label: 'Performance' },
    { key: 'user_flow', label: 'User Flows' },
    { key: 'third_party_libraries', label: 'Third Party Libraries' },
    { key: 'readme', label: 'Project README' }
  ];

  // Initialize with intro context if provided
  useEffect(() => {
    if (introBrief && messages.length === 0) {
      const contextMessage = `Great! I have the context from our intro conversation:

• You're building: ${introBrief.whatTheyreDoing}
• Project type: ${introBrief.projectType}
• Target audience: ${introBrief.audience}
• Main problem solved: ${introBrief.problem}
• Timeline: ${introBrief.timeline}
• Team size: ${introBrief.teamSize}

Now let's dive deep into the technical architecture. I'll focus on the technical decisions and avoid repeating what we already covered. What specific technical aspect would you like to start with, or should I begin with the overall system architecture?`;
      
      setMessages([{
        role: 'assistant',
        content: contextMessage
      }]);
    }
  }, [introBrief]);

  return (
    <div 
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: 'var(--widget-background)',
        fontFamily: 'var(--widget-font-family)',
        color: 'var(--widget-text-primary)',
        // Legacy theme support
        ['--primary-color' as any]: themeConfig?.primaryColor || '#6366f1',
        ['--secondary-color' as any]: themeConfig?.secondaryColor || '#8b5cf6',
        ['--border-radius' as any]: themeConfig?.borderRadius || '8px',
        ['--font-family' as any]: themeConfig?.fontFamily || 'Inter, sans-serif',
        ['--spacing-unit' as any]: themeConfig?.spacingUnit || '1rem',
      }}
    >
      {/* Page Header - Hidden in widget mode */}
      {!isWidget && (
        <div style={{background: 'var(--widget-surface)', borderBottomColor: 'var(--widget-border-color)'}} className="border-b p-6 text-center">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <div className="flex-1 text-left">
              {sessionType === 'architect' && introBrief && onBackToIntro && (
                <button
                  onClick={onBackToIntro}
                  style={{color: 'var(--widget-primary)'}} className="text-sm hover:opacity-80 flex items-center gap-2"
                >
                  ← Back to Project Overview
                </button>
              )}
            </div>
            <div className="flex-1 text-center">
              <h1 style={{color: 'var(--widget-text-primary)', fontSize: 'var(--widget-font-size-xlarge)', fontWeight: 'var(--widget-font-weight-bold)'}} className="text-4xl font-bold mb-2">
                {sessionType === 'intro' ? 'Project Discovery' : 'Technical Architecture'}
              </h1>
              <p style={{color: 'var(--widget-text-secondary)'}} className="">
                {sessionType === 'intro' 
                  ? 'Tell me about your project vision, and I\'ll help you architect the perfect solution'
                  : introBrief 
                    ? `Architecting: ${introBrief.whatTheyreDoing}`
                    : 'Your AI assistant for software development, system design, and project management.'
                }
              </p>
            </div>
            <div className="flex-1 text-right">
              {sessionType === 'architect' && onNewProject && (
                <button
                  onClick={onNewProject}
                  style={{color: 'var(--widget-status-success)'}} className="text-sm hover:opacity-80 flex items-center gap-2 ml-auto"
                >
                  Start Over →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
      {/* Left Column - Controls */}
      <div style={{background: 'var(--widget-surface)', borderRightColor: 'var(--widget-border-color)'}} className="w-80 border-r p-6">
        <h2 style={{color: 'var(--widget-text-primary)', fontSize: 'var(--widget-font-size-large)', fontWeight: 'var(--widget-font-weight-bold)'}} className="mb-6">Project Settings</h2>
        
        {/* Timeline Slider */}
        <div className="mb-6">
          <label style={{color: 'var(--widget-text-secondary)'}} className="block text-sm font-medium mb-3">
            Project Timeline
          </label>
          <div className="flex items-center gap-3">
            <span style={{color: 'var(--widget-text-muted)'}} className="text-xs w-6">2d</span>
            <input
              type="range"
              min="1"
              max="10"
              value={timeline}
              onChange={(e) => setTimeline(parseInt(e.target.value))}
              className="widget-slider flex-1 h-2 appearance-none cursor-pointer"
              disabled={isLoading}
            />
            <span style={{color: 'var(--widget-text-muted)'}} className="text-xs w-8">6m</span>
          </div>
          <div style={{color: 'var(--widget-text-muted)'}} className="text-xs mt-1 text-center">
            {timeline === 1 ? '2 days' : 
             timeline === 2 ? '1 week' :
             timeline === 3 ? '2 weeks' :
             timeline === 4 ? '1 month' :
             timeline === 5 ? '6 weeks' :
             timeline === 6 ? '2 months' :
             timeline === 7 ? '10 weeks' :
             timeline === 8 ? '3 months' :
             timeline === 9 ? '4 months' : '6 months'}
          </div>
        </div>


        {/* Tech Decisions Toggle */}
        <div className="mb-6">
          <label style={{color: 'var(--widget-text-secondary)'}} className="block text-sm font-medium mb-3">
            AI Tech Decisions
          </label>
          <div className="flex items-center justify-between">
            <span style={{color: 'var(--widget-text-secondary)'}} className="text-sm">Let AI choose tech stack</span>
            <button
              onClick={() => setTechDecisions(!techDecisions)}
              style={{
                background: techDecisions 
                  ? 'linear-gradient(135deg, #10b981, #3b82f6)' 
                  : 'rgba(255, 255, 255, 0.2)', 
                borderRadius: 'var(--widget-border-radius-medium)',
                opacity: isLoading ? '0.5' : '1'
              }}
              className="relative inline-flex h-6 w-11 items-center transition-colors"
              disabled={isLoading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  techDecisions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Saved Sessions Dropdown */}
        {savedSessions.length > 0 && (
          <div className="mb-4">
            <label style={{color: 'var(--widget-text-secondary)'}} className="block text-sm font-medium mb-2">
              Saved Sessions
            </label>
            <select
              key={`sessions-${savedSessions.length}-${isLoadingSession}-${currentSessionId}`}
              value={currentSessionId}
              onChange={(e) => {
                if (e.target.value && e.target.value !== currentSessionId) {
                  loadSession(e.target.value);
                }
              }}
              className="widget-input w-full p-2 text-sm"
              disabled={isLoading || isLoadingSession}
            >
              <option value="">
                {isLoadingSession ? 'Loading session...' : 'Load a different session...'}
              </option>
              {savedSessions.map((session) => (
                <option key={session.userSession} value={session.userSession}>
                  {session.sessionName}
                  {session.userSession === currentSessionId ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Load Success Message */}
        {loadSuccessMessage && (
          <div 
            style={{
              background: 'var(--widget-status-success)',
              borderRadius: 'var(--widget-border-radius-medium)',
              padding: 'var(--widget-spacing-small)',
              marginBottom: 'var(--widget-spacing-medium)',
              color: 'white',
              fontSize: 'var(--widget-font-size-small)',
              textAlign: 'center'
            }}
            className="animate-fade-in"
          >
            ✓ {loadSuccessMessage}
          </div>
        )}

        {/* Session Management Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSaveSessionClick}
            className="widget-button-send w-full px-4 py-2 font-medium"
            disabled={isLoading || messages.length === 0 || isSavingSession || sessionComplete}
          >
            {isSavingSession ? 'Saving...' : sessionComplete ? 'Session Complete' : 'Save Session'}
          </button>
          
          <button
            onClick={startOver}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'var(--widget-text-primary)',
              borderRadius: 'var(--widget-border-radius-medium)',
              opacity: isLoading ? '0.4' : '1'
            }}
            className="w-full px-4 py-2 hover:bg-white hover:bg-opacity-10 transition-all font-medium"
            disabled={isLoading}
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Center Column - Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !introBrief && (
            <div style={{color: 'var(--widget-text-muted)'}} className="text-center py-16">
              <div className="text-xl mb-2">👋 Let's build something amazing!</div>
              <div>Tell me about the project you want to create.</div>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-6 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                style={{
                  background: message.role === 'user' ? 'var(--widget-primary)' : 'var(--widget-surface)',
                  color: 'var(--widget-text-primary)',
                  borderColor: message.role === 'user' ? 'transparent' : 'rgba(255, 255, 255, 0.3)',
                  borderRadius: 'var(--widget-border-radius-medium)',
                  boxShadow: message.role === 'user' ? 'none' : 'var(--widget-shadow-small)'
                }}
                className={`inline-block max-w-[75%] p-4 ${
                  message.role === 'user' ? '' : 'border'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-left mb-6">
              <div style={{background: 'var(--widget-primary)', borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 'var(--widget-border-radius-medium)', boxShadow: 'var(--widget-shadow-small)'}} className="inline-block border p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div style={{backgroundColor: 'white'}} className="w-2 h-2 rounded-full animate-bounce"></div>
                    <div style={{backgroundColor: 'white', animationDelay: '0.1s'}} className="w-2 h-2 rounded-full animate-bounce"></div>
                    <div style={{backgroundColor: 'white', animationDelay: '0.2s'}} className="w-2 h-2 rounded-full animate-bounce"></div>
                  </div>
                  <span style={{color: 'white'}} className="text-sm ml-3">{loadingText}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div style={{background: 'var(--widget-surface)', borderTopColor: 'var(--widget-border-color)'}} className="border-t p-4 flex-shrink-0">
          {sessionComplete && onViewDocuments && (
            <div className="mb-4">
              <button
                onClick={onViewDocuments}
                style={{
                  background: 'linear-gradient(135deg, var(--widget-success), #10b981)',
                  color: 'white',
                  borderRadius: 'var(--widget-border-radius-medium)'
                }}
                className="w-full py-3 px-4 hover:opacity-90 text-white font-medium transition-opacity flex items-center justify-center gap-2"
              >
                <span className="text-lg">📄</span>
                View Generated Documents
              </button>
            </div>
          )}
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your project or ask a question..."
              className="widget-input flex-1 p-3 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                boxShadow: input.trim() ? 'var(--widget-shadow-medium)' : '0 0 8px rgba(255, 255, 255, 0.2)',
                borderColor: input.trim() ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.6)',
                animation: input.trim() ? 'none' : 'subtle-pulse 2s ease-in-out infinite'
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
                className="widget-button-send px-6 py-3 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Right Column - Progress Tracker */}
      <div style={{background: 'var(--widget-surface)', borderLeftColor: 'var(--widget-border-color)'}} className="w-80 border-l p-6 flex flex-col">
        <h3 style={{color: 'var(--widget-text-primary)', fontSize: 'var(--widget-font-size-large)', fontWeight: 'var(--widget-font-weight-bold)'}} className="mb-4">Project Progress</h3>
        
        {/* Progress Bar - Always visible at top */}
        <div style={{borderBottomColor: 'var(--widget-border-color)'}} className="mb-6 pb-4 border-b">
          <div style={{color: 'var(--widget-text-secondary)'}} className="text-sm">
            <div className="flex justify-between mb-2">
              <span>Completed:</span>
              <span className="font-medium">{completedDocs.length}/13</span>
            </div>
            <div style={{backgroundColor: 'var(--widget-disabled)', borderRadius: 'var(--widget-border-radius-medium)'}} className="w-full h-2">
              <div 
                style={{
                  background: 'var(--widget-primary)', // Green-to-blue gradient
                  borderRadius: 'var(--widget-border-radius-medium)',
                  width: `${(completedDocs.length / 13) * 100}%`
                }}
                className="h-2 transition-all duration-300"
              ></div>
            </div>
          </div>
        </div>
        
        {/* Steps List - Scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {documentSteps.map((step, index) => {
              const isCompleted = completedDocs.includes(step.key);
              const isNext = !isCompleted && !documentSteps.slice(0, index).some(s => !completedDocs.includes(s.key));
              
              return (
                <div
                  key={step.key}
                  style={{
                    background: isCompleted 
                      ? 'rgba(16, 185, 129, 0.2)' // green background for completed
                      : isNext 
                        ? 'rgba(37, 61, 99, 0.4)' // blue background for current
                        : 'var(--widget-disabled)',
                    borderRadius: 'var(--widget-border-radius-medium)'
                  }}
                  className="flex items-center gap-3 p-3 transition-colors"
                >
                  <div
                    style={{
                      background: isCompleted
                        ? 'var(--widget-primary)' // Green-to-blue gradient for completed
                        : isNext
                          ? 'var(--widget-secondary)' // Blue for current step
                          : 'var(--widget-disabled)', // Semi-transparent for pending
                      color: 'white'
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div style={{
                    color: 'var(--widget-text-primary)', // Always white text
                    fontWeight: isCompleted || isNext ? 'var(--widget-font-weight-medium)' : 'normal'
                  }} className="text-sm">
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>

      {/* Save Session Modal */}
      <SaveSessionModal
        isOpen={showSaveModal}
        onClose={() => !isSavingSession && setShowSaveModal(false)}
        onSave={saveSession}
        isLoading={isSavingSession}
        defaultName={`Draft ${new Date().toLocaleDateString()}`}
      />
    </div>
  );
}