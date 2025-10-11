'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DocumentGenerationModalProps {
  isGenerating: boolean;
  onComplete?: () => void;
  sessionId?: string;
  documentsToGenerate?: number;
}

const PROGRESS_MESSAGES = [
  "Initializing document generation...",
  "Analyzing project requirements...",
  "Creating Product Requirements Document...",
  "Designing frontend architecture...",
  "Building backend specifications...",
  "Configuring state management patterns...",
  "Designing database schema...",
  "Creating API documentation...",
  "Setting up DevOps workflows...",
  "Planning testing strategies...",
  "Generating code documentation...",
  "Optimizing performance metrics...",
  "Mapping user flows...",
  "Selecting third-party libraries...",
  "Preparing project README...",
  "Finalizing all specifications..."
];

export default function DocumentGenerationModal({
  isGenerating,
  onComplete,
  sessionId,
  documentsToGenerate = 13
}: DocumentGenerationModalProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(PROGRESS_MESSAGES[0]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      setCurrentMessage(PROGRESS_MESSAGES[0]);
      return;
    }

    // Start progress animation
    const startTime = Date.now();
    const duration = 120000; // 2 minutes in milliseconds

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min((elapsed / duration) * 100, 95); // Cap at 95%

      // Update progress in 5% increments
      const roundedProgress = Math.floor(percentage / 5) * 5;
      setProgress(roundedProgress);

      // Update message based on progress
      const messageIndex = Math.floor((roundedProgress / 100) * (PROGRESS_MESSAGES.length - 1));
      setCurrentMessage(PROGRESS_MESSAGES[messageIndex]);

      // Stop at 95% and auto-complete after 2 minutes
      if (roundedProgress >= 95) {
        clearInterval(progressInterval);

        // Auto-complete after reaching 95%
        setTimeout(() => {
          handleComplete();
        }, 2000); // Wait 2 more seconds at 95% then complete
      }
    }, 500); // Update every 500ms

    return () => clearInterval(progressInterval);
  }, [isGenerating]);

  // Handle completion
  const handleComplete = () => {
    setProgress(100);
    setCurrentMessage("All documents generated successfully!");
    setIsRedirecting(true);

    // Wait a moment to show 100%, then redirect
    setTimeout(() => {
      if (sessionId) {
        router.push(`/widget?mode=documents&sessionId=${sessionId}`);
      }
      onComplete?.();
    }, 1500);
  };

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Animated Icon */}
          <div className="mb-6">
            <div className="relative inline-flex">
              <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div
                className="absolute top-0 left-0 w-24 h-24 rounded-full border-4 border-t-blue-600 animate-spin"
                style={{ animationDuration: '2s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Generating Your Project Documents
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Creating {documentsToGenerate} comprehensive technical specifications in parallel
          </p>

          {/* Current Status */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {currentMessage}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Document Count */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Documents</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{documentsToGenerate}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Processing</div>
              <div className="text-lg font-semibold text-yellow-600">
                {progress < 100 ? Math.ceil(documentsToGenerate * (progress / 100)) : 0}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
              <div className="text-lg font-semibold text-green-600">
                {progress === 100 ? documentsToGenerate : Math.floor(documentsToGenerate * (progress / 100))}
              </div>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isRedirecting
              ? "Redirecting to your documents..."
              : "This process typically takes 1-2 minutes. Please don't close this window."}
          </p>
        </div>
      </div>
    </div>
  );
}

// Add this to your global CSS or tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer {
//   animation: shimmer 2s infinite;
// }