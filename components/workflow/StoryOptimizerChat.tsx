'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkflow } from './WorkflowApp';

interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
  category: 'scope' | 'technical' | 'acceptance' | 'dependencies' | 'user';
}

interface StoryInput {
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  storyPoints?: number;
}

interface StoryOptimizerChatProps {
  projectId: string;
  storyInput: StoryInput;
  initialQuestions: ClarifyingQuestion[];
  initialSuggestions: any;
  onComplete: (conversation: { role: 'user' | 'assistant'; content: string }[]) => void;
  onCancel: () => void;
  isGeneratingPreview: boolean;
}

export default function StoryOptimizerChat({
  projectId,
  storyInput,
  initialQuestions,
  initialSuggestions,
  onComplete,
  onCancel,
  isGeneratingPreview,
}: StoryOptimizerChatProps) {
  const { externalId } = useWorkflow();
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize conversation with first question
    if (initialQuestions.length > 0 && conversation.length === 0) {
      const firstQuestion = initialQuestions[0];
      setConversation([
        {
          role: 'assistant',
          content: `${firstQuestion.question}\n\n_${firstQuestion.context}_`,
        },
      ]);
    }
  }, [initialQuestions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(newAnswers);

    // Add user answer to conversation
    const newConversation = [
      ...conversation,
      { role: 'user' as const, content: currentAnswer },
    ];

    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      newConversation.push({
        role: 'assistant' as const,
        content: `${nextQuestion.question}\n\n_${nextQuestion.context}_`,
      });
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered
      newConversation.push({
        role: 'assistant' as const,
        content: "Great! I have all the information I need. Click 'Generate Preview' to see your optimized story.",
      });
    }

    setConversation(newConversation);
    setCurrentAnswer('');
  };

  const handleSkipQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];

    // Add skip indication to conversation
    const newConversation = [
      ...conversation,
      { role: 'user' as const, content: '_Skipped_' },
    ];

    if (currentQuestionIndex < questions.length - 1) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      newConversation.push({
        role: 'assistant' as const,
        content: `${nextQuestion.question}\n\n_${nextQuestion.context}_`,
      });
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      newConversation.push({
        role: 'assistant' as const,
        content: "I have enough information. Click 'Generate Preview' to see your optimized story.",
      });
    }

    setConversation(newConversation);
  };

  const handleMoreQuestions = async () => {
    setIsLoadingMore(true);

    try {
      const response = await fetch('/widget/api/workflow/stories/optimize/more-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          storyInput,
          previousQuestions: questions,
          answers,
          externalId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions([...questions, ...data.questions]);

          // Add the first new question to conversation
          const firstNewQuestion = data.questions[0];
          setConversation([
            ...conversation,
            {
              role: 'assistant' as const,
              content: `Here are some additional questions:\n\n${firstNewQuestion.question}\n\n_${firstNewQuestion.context}_`,
            },
          ]);
          setCurrentQuestionIndex(questions.length);
        }
      }
    } catch (error) {
      console.error('Failed to get more questions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleGeneratePreview = () => {
    // Format conversation for the API
    const formattedConversation = conversation.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    onComplete(formattedConversation);
  };

  const isAllQuestionsAnswered = currentQuestionIndex >= questions.length - 1 &&
    (answers[questions[questions.length - 1]?.id] || conversation.some(c => c.content === '_Skipped_' && conversation.indexOf(c) === conversation.length - 2));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'scope':
        return '🎯';
      case 'technical':
        return '⚙️';
      case 'acceptance':
        return '✅';
      case 'dependencies':
        return '🔗';
      case 'user':
        return '👤';
      default:
        return '❓';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">AI Story Optimizer</h4>
            <p className="text-xs text-gray-400">
              Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {questions[currentQuestionIndex] && (
              <span className={`text-xs ${getPriorityColor(questions[currentQuestionIndex].priority)}`}>
                {getCategoryIcon(questions[currentQuestionIndex].category)} {questions[currentQuestionIndex].category}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">
                {msg.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line.startsWith('_') && line.endsWith('_') ? (
                      <em className="text-gray-400 text-xs">{line.slice(1, -1)}</em>
                    ) : (
                      line
                    )}
                    {i < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800">
        {!isAllQuestionsAnswered && currentQuestionIndex < questions.length ? (
          <div className="space-y-3">
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitAnswer();
                }
              }}
            />
            <div className="flex justify-between">
              <button
                onClick={handleSkipQuestion}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip this question
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim()}
                className="px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleMoreQuestions}
                disabled={isLoadingMore || isGeneratingPreview}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Ask More Questions'
                )}
              </button>
              <button
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGeneratingPreview ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Preview'
                )}
              </button>
            </div>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel Optimization
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
