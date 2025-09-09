'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api-config';

interface IntroQuestion {
  id: number;
  question: string;
  placeholder: string;
  followUp?: string;
}

interface IntroBrief {
  whatTheyreDoing: string;
  projectType: string;
  audience: string;
  problem: string;
  timeline: string;
  teamSize: string;
}

interface IntroMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface IntroChatProps {
  onComplete: (brief: IntroBrief) => void;
  themeConfig?: any;
}

export default function IntroChat({ onComplete, themeConfig }: IntroChatProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<IntroMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [showProjectBrief, setShowProjectBrief] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<IntroBrief | null>(null);

  const questions: IntroQuestion[] = [
    {
      id: 0,
      question: "Hi there! I'm excited to help you build something amazing. What are you trying to create?",
      placeholder: "e.g., A mobile app for fitness tracking, a web platform for online courses...",
      followUp: "That sounds interesting! Let me learn more about your vision."
    },
    {
      id: 1,
      question: "What kind of software are you building?",
      placeholder: "e.g., Web application, mobile app, desktop software, API service...",
      followUp: "Great choice! That's a solid foundation for what you're trying to achieve."
    },
    {
      id: 2,
      question: "Who will be using this software?",
      placeholder: "e.g., Small business owners, students, internal team, customers...",
      followUp: "Perfect! Understanding your audience is key to building the right solution."
    },
    {
      id: 3,
      question: "What's the main problem this software will solve?",
      placeholder: "e.g., Streamline workflow, reduce manual work, improve customer experience...",
      followUp: "That's exactly the kind of problem technology should solve!"
    },
    {
      id: 4,
      question: "How soon do you need this live and working?",
      placeholder: "e.g., ASAP, next month, 3 months, flexible timeline...",
      followUp: "Good to know! This helps me understand the scope and approach."
    },
    {
      id: 5,
      question: "What's your team size for this project?",
      placeholder: "e.g., Just me, 2-3 people, small team, large development team...",
      followUp: "Excellent! I now have everything I need to create your project blueprint."
    }
  ];

  const getRapportLoadingMessages = () => [
    "I love your vision! Let me think about this...",
    "This is going to be fantastic! Just a moment...",
    "You're onto something great here! Processing...",
    "I can already see the potential! Analyzing...",
    "This sounds like exactly what people need! Thinking...",
    "You've got a solid idea! Let me craft the perfect response...",
    "I'm excited about this project! Formulating thoughts...",
    "This has real potential! Building my response...",
  ];

  const getBriefGenerationMessages = () => [
    "Analyzing your vision and creating project blueprint...",
    "Synthesizing your requirements into a comprehensive brief...",
    "Crafting your personalized project architecture plan...",
    "Building the foundation for your software project...",
    "Connecting all the pieces of your project puzzle...",
    "Preparing your custom development roadmap...",
  ];

  useEffect(() => {
    // Start with the first question
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi there! I'm excited to help you build something amazing. What are you trying to create?"
      }]);
    }
  }, []);

  const handleFallbackResponse = (userAnswer: string, nextQuestionIndex: number) => {
    // Simple fallback with basic restating
    const restatingResponses = [
      `${userAnswer} - that sounds amazing! I love that you're bringing this idea to life.`,
      `${userAnswer.charAt(0).toUpperCase() + userAnswer.slice(1)} - perfect choice! That's exactly the kind of solution people need.`,
      `${userAnswer} - I'm excited about this! Understanding your audience is key to building something great.`,
      `${userAnswer} - that's exactly the kind of problem technology should solve! I can already see the potential.`,
      `${userAnswer} - good to know! This helps me understand the scope and approach we'll take.`,
      `${userAnswer} - excellent! I now have everything I need to create your project blueprint.`
    ];
    
    return restatingResponses[nextQuestionIndex] || `${userAnswer} - thank you for sharing that!`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: IntroMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const newAnswers = [...answers, input.trim()];
    setAnswers(newAnswers);
    setInput('');
    setIsLoading(true);
    
    // Use rapport-building loading messages
    const rapportMessages = getRapportLoadingMessages();
    setLoadingText(rapportMessages[Math.floor(Math.random() * rapportMessages.length)]);

    try {
      // Get or create session ID
      let sessionId = localStorage.getItem('introSession');
      if (!sessionId) {
        sessionId = `intro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('introSession', sessionId);
      }

      // Determine if this is the first message in the conversation
      const isFirstMessage = currentQuestionIndex === 0;

      // Call the intro chat API for intelligent response
      const response = await fetch(getApiUrl('intro-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          userSession: sessionId,
          externalId: 'intro_user',
          isFirstMessage
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Only add AI response if there's actual text content
        let updatedMessages = newMessages;
        if (data.text && data.text.trim()) {
          updatedMessages = [...newMessages, {
            role: 'assistant' as const,
            content: data.text
          }];
        }
        
        setMessages(updatedMessages);
        
        // Check if intro is complete
        if (data.introComplete) {
          setGeneratedBrief({
            whatTheyreDoing: data.introBrief.whatTheyreDoing,
            projectType: data.introBrief.projectType,
            audience: data.introBrief.audience,
            problem: data.introBrief.problem,
            timeline: data.introBrief.timeline,
            teamSize: data.introBrief.teamSize
          });
          setShowProjectBrief(true);
        } else {
          setCurrentQuestionIndex(data.currentQuestion);
        }
      } else {
        throw new Error('API call failed');
      }
    } catch (error) {
      console.error('Intro chat API error:', error);
      
      // Simple fallback - acknowledge answer and ask next question
      const fallbackResponse = handleFallbackResponse(input.trim(), currentQuestionIndex);
      const updatedMessages = [...newMessages, {
        role: 'assistant' as const,
        content: fallbackResponse
      }];
      
      if (currentQuestionIndex < questions.length - 1) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        await new Promise(resolve => setTimeout(resolve, 800));
        
        updatedMessages.push({
          role: 'assistant' as const,
          content: nextQuestion.question
        });
        
        setMessages(updatedMessages);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setMessages(updatedMessages);
        await generateProjectBrief(newAnswers);
      }
    }

    setIsLoading(false);
  };

  const generateProjectBrief = async (allAnswers: string[]) => {
    setIsLoading(true);
    const briefMessages = getBriefGenerationMessages();
    setLoadingText(briefMessages[Math.floor(Math.random() * briefMessages.length)]);
    
    // Simulate brief generation time
    await new Promise(resolve => setTimeout(resolve, 2500 + Math.random() * 1500));
    
    const brief: IntroBrief = {
      whatTheyreDoing: allAnswers[0] || '',
      projectType: allAnswers[1] || '',
      audience: allAnswers[2] || '',
      problem: allAnswers[3] || '',
      timeline: allAnswers[4] || '',
      teamSize: allAnswers[5] || ''
    };

    // Save to database
    try {
      // Generate a session ID for this intro if we don't have one
      const sessionId = `intro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await fetch(getApiUrl('intro-brief'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSession: sessionId,
          externalId: 'intro_user', // This would come from auth in real usage
          ...brief,
          isComplete: true,
          projectBrief: `${brief.projectType} for ${brief.audience} to ${brief.problem}. Timeline: ${brief.timeline}, Team: ${brief.teamSize}`
        })
      });
      
      // Store session ID for handoff to architect
      localStorage.setItem('introSession', sessionId);
    } catch (error) {
      console.error('Failed to save intro brief:', error);
    }

    setGeneratedBrief(brief);
    setIsLoading(false);
    setShowProjectBrief(true);

    // Add final message
    setMessages(prev => [...prev, {
      role: 'assistant' as const,
      content: `Perfect! I've created a comprehensive project brief based on our conversation. 

Ready to dive into the architecture? Let's build something amazing together!`
    }]);
  };

  const handleContinueToArchitect = () => {
    if (generatedBrief) {
      onComplete(generatedBrief);
    }
  };

  return (
    <div 
      className="h-screen bg-gray-50 flex flex-col overflow-hidden"
      style={themeConfig ? {
        '--primary-color': themeConfig.primaryColor || '#3B82F6',
        '--secondary-color': themeConfig.secondaryColor || '#10B981',
        '--border-radius': themeConfig.borderRadius || '8px',
        '--font-family': themeConfig.fontFamily || 'Inter, sans-serif',
        '--spacing-unit': themeConfig.spacingUnit || '1rem',
      } as React.CSSProperties : {}}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Let's Build Something Amazing
        </h1>
        <p className="text-gray-600">
          Tell me about your project vision, and I'll help you architect the perfect solution
        </p>
        
        {/* Progress indicator */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Getting to know your project</span>
            <span>{Math.min(answers.length + 1, questions.length)}/{questions.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(Math.min(answers.length + 1, questions.length) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block max-w-[80%] p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="text-left mb-6">
              <div className="inline-block bg-white border border-gray-200 p-4 rounded-lg shadow-sm max-w-[80%]">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-gray-600 text-sm">{loadingText}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {!showProjectBrief && (
          <div className="bg-white border-t border-gray-200 p-6 max-w-4xl mx-auto w-full">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentQuestionIndex < questions.length ? questions[currentQuestionIndex].placeholder : ""}
                className="flex-1 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {answers.length === questions.length - 1 ? 'Finish' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {/* Continue to Architect Button */}
        {showProjectBrief && (
          <div className="bg-white border-t border-gray-200 p-6 max-w-4xl mx-auto w-full">
            <div className="text-center">
              <button
                onClick={handleContinueToArchitect}
                className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-lg shadow-lg"
              >
                Continue to Technical Architecture →
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Ready to dive deep into the technical details and create your full project blueprint
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}